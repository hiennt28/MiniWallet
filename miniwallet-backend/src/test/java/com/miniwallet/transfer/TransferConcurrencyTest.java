package com.miniwallet.transfer;

import static org.assertj.core.api.Assertions.assertThat;

import com.miniwallet.common.error.ApiException;
import com.miniwallet.common.security.AuthenticatedUser;
import com.miniwallet.support.IntegrationTest;
import com.miniwallet.transfer.dto.CreateTransferRequest;
import com.miniwallet.transfer.dto.TransferResult;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Nhiều lệnh chuyển tiền chạy cùng lúc trên PostgreSQL thật.
 * Mỗi test thả tất cả các luồng đồng thời (CountDownLatch) để tối đa khả năng tranh chấp.
 */
class TransferConcurrencyTest extends IntegrationTest {

    static final String AN = "0912345678";
    static final String BINH = "0987654321";

    @Autowired
    TransferService transferService;

    AuthenticatedUser an;
    AuthenticatedUser binh;

    @BeforeEach
    void setUp() throws Exception {
        register("Nguyễn Văn An", AN, DEFAULT_PIN);
        register("Trần Thị Bình", BINH, DEFAULT_PIN);
        an = new AuthenticatedUser(userId(AN), AN);
        binh = new AuthenticatedUser(userId(BINH), BINH);
    }

    /**
     * An có 500.000 ₫ và gửi 20 lệnh 50.000 ₫ cùng lúc. Không có khóa thì nhiều lệnh cùng đọc
     * "số dư 500.000", cùng trừ, và số dư cuối sai (lost update). Có khóa: đúng 10 lệnh thành công.
     */
    @Test
    void parallelTransfersNeverOverdraw() throws Exception {
        List<Callable<Object>> tasks = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            tasks.add(() -> transferService.create(an, request(BINH, 50_000), null));
        }
        List<Object> results = runConcurrently(tasks);

        assertThat(results).filteredOn(TransferResult.class::isInstance).hasSize(10);
        assertThat(results).filteredOn(r -> r instanceof ApiException e
                && e.getCode() == com.miniwallet.common.error.ErrorCode.INSUFFICIENT_BALANCE).hasSize(10);
        assertThat(balance(AN)).isZero();
        assertThat(balance(BINH)).isEqualTo(1_000_000);
        assertThat(count("SELECT count(*) FROM transactions WHERE category = 'TRANSFER_OUT'")).isEqualTo(10);
        assertThat(count("SELECT count(*) FROM transactions WHERE category = 'TRANSFER_IN'")).isEqualTo(10);
    }

    /**
     * 10 người khác nhau cùng chuyển cho Bình. Bước kiểm tra PIN của mỗi người khóa dòng user riêng,
     * nên phần cộng tiền chạy song song thật sự. Không khóa ví Bình thì các lệnh cùng đọc một số dư cũ,
     * ghi đè lên nhau và Bình mất tiền (lost update).
     */
    @Test
    void parallelIncomingTransfersAreAllCredited() throws Exception {
        List<AuthenticatedUser> senders = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            String phone = String.format("09000000%02d", i);
            register(phone);
            senders.add(new AuthenticatedUser(userId(phone), phone));
        }
        List<Callable<Object>> tasks = new ArrayList<>();
        for (AuthenticatedUser sender : senders) {
            tasks.add(() -> transferService.create(sender, request(BINH, 100_000), null));
        }
        List<Object> results = runConcurrently(tasks);

        assertThat(results).allMatch(TransferResult.class::isInstance);
        assertThat(balance(BINH)).isEqualTo(500_000 + 10 * 100_000);
    }

    /**
     * An→Bình và Bình→An cùng lúc. Nếu mỗi lệnh khóa ví người gửi trước, hai lệnh ngược chiều sẽ chờ nhau
     * (deadlock, PostgreSQL hủy một bên). Khóa theo thứ tự id thì tất cả đều thành công.
     */
    @Test
    void oppositeDirectionsDoNotDeadlock() throws Exception {
        List<Callable<Object>> tasks = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            tasks.add(() -> transferService.create(an, request(BINH, 10_000), null));
            tasks.add(() -> transferService.create(binh, request(AN, 10_000), null));
        }
        List<Object> results = runConcurrently(tasks);

        assertThat(results).allMatch(TransferResult.class::isInstance);
        assertThat(balance(AN)).isEqualTo(500_000);
        assertThat(balance(BINH)).isEqualTo(500_000);
        assertThat(count("SELECT count(*) FROM transfers WHERE status = 'COMPLETED'")).isEqualTo(20);
    }

    /** Cùng một Idempotency-Key gửi 5 lần cùng lúc (ví dụ client tự retry): chỉ trừ tiền một lần. */
    @Test
    void sameIdempotencyKeyInParallelMovesMoneyOnce() throws Exception {
        List<Callable<Object>> tasks = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            tasks.add(() -> transferService.create(an, request(BINH, 100_000), "retry-key"));
        }
        List<Object> results = runConcurrently(tasks);

        assertThat(results).allMatch(TransferResult.class::isInstance);
        assertThat(results).map(r -> ((TransferResult) r).tx().id()).containsOnly(((TransferResult) results.getFirst()).tx().id());
        assertThat(balance(AN)).isEqualTo(400_000);
        assertThat(count("SELECT count(*) FROM transfers")).isEqualTo(1);
    }

    // ---------------------------------------------------------------- helpers

    private CreateTransferRequest request(String phone, long amount) {
        return new CreateTransferRequest(phone, amount, null, DEFAULT_PIN);
    }

    /** Chạy các tác vụ cùng lúc; trả về kết quả hoặc exception của từng tác vụ. */
    private static List<Object> runConcurrently(List<Callable<Object>> tasks) throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        List<Object> results = new ArrayList<>();
        try (ExecutorService pool = Executors.newFixedThreadPool(tasks.size())) {
            List<Future<Object>> futures = new ArrayList<>();
            for (Callable<Object> task : tasks) {
                futures.add(pool.submit(() -> {
                    start.await();
                    try {
                        return task.call();
                    } catch (ApiException e) {
                        return e;
                    }
                }));
            }
            start.countDown();
            for (Future<Object> f : futures) results.add(f.get(60, TimeUnit.SECONDS));
        }
        return results;
    }

    private long userId(String phone) {
        return jdbc.queryForObject("SELECT id FROM users WHERE phone = ?", Long.class, phone);
    }

    private long balance(String phone) {
        return jdbc.queryForObject("SELECT w.balance FROM wallets w JOIN users u ON u.id = w.user_id WHERE u.phone = ?",
                Long.class, phone);
    }

    private long count(String sql) {
        return jdbc.queryForObject(sql, Long.class);
    }
}
