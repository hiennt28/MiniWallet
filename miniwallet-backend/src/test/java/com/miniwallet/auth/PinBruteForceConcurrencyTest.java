package com.miniwallet.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.miniwallet.auth.dto.LoginRequest;
import com.miniwallet.common.error.ApiException;
import com.miniwallet.common.error.ErrorCode;
import com.miniwallet.support.IntegrationTest;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Kẻ tấn công gửi 10 lần đoán PIN cùng một lúc. Nếu không khóa dòng user, các request đọc cùng
 * một giá trị bộ đếm rồi ghi đè lên nhau, và cả 10 lần đoán đều được kiểm tra.
 * Có khóa thì chúng xếp hàng: 4 lần đầu báo sai, lần thứ 5 làm tài khoản bị khóa, các lần sau bị chặn.
 */
class PinBruteForceConcurrencyTest extends IntegrationTest {

    @Autowired
    AuthService authService;

    @Test
    void parallelGuessesCannotBypassLockout() throws Exception {
        register("0912345678");
        int attempts = 10;
        CountDownLatch start = new CountDownLatch(1);
        List<Callable<ErrorCode>> tasks = new ArrayList<>();
        for (int i = 0; i < attempts; i++) {
            String guess = String.format("%06d", i + 1);
            tasks.add(() -> {
                start.await();
                try {
                    authService.login(new LoginRequest("0912345678", guess));
                    return null;
                } catch (ApiException e) {
                    return e.getCode();
                }
            });
        }

        List<ErrorCode> results = new ArrayList<>();
        try (ExecutorService pool = Executors.newFixedThreadPool(attempts)) {
            List<Future<ErrorCode>> futures = tasks.stream().map(pool::submit).toList();
            start.countDown(); // thả tất cả cùng lúc
            for (Future<ErrorCode> f : futures) results.add(f.get());
        }

        assertThat(results).filteredOn(ErrorCode.INVALID_CREDENTIALS::equals).hasSize(4);
        assertThat(results).filteredOn(ErrorCode.PIN_LOCKED::equals).hasSize(6);
        assertThat(jdbc.queryForObject("SELECT pin_locked_until IS NOT NULL FROM users", Boolean.class)).isTrue();
    }
}
