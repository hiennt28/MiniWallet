package com.miniwallet.transaction;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniwallet.auth.dto.AuthResponse;
import com.miniwallet.support.IntegrationTest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class TransactionHistoryTest extends IntegrationTest {

    /** 10:00 sáng 15/11/2026 giờ Việt Nam. */
    static final Instant NOW = Instant.parse("2026-11-15T03:00:00Z");

    AuthResponse an;
    long anWallet;

    @BeforeEach
    void setUp() throws Exception {
        clock.set(NOW);
        an = register("0912345678"); // có sẵn 1 giao dịch "Quà chào mừng" lúc NOW
        anWallet = walletIdOf("0912345678");
    }

    @Nested
    class Listing {

        @Test
        void returnsNewestFirstInFrontendShape() throws Exception {
            insert(anWallet, Category.FOOD, "Cà phê sáng", 35_000, null, null, NOW.minusSeconds(3600));

            mvc.perform(withToken(get("/api/transactions"), an))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.total").value(2))
                    .andExpect(jsonPath("$.page").value(1))
                    .andExpect(jsonPath("$.pageSize").value(10))
                    .andExpect(jsonPath("$.totalPages").value(1))
                    .andExpect(jsonPath("$.items[0].category").value("bonus"))
                    .andExpect(jsonPath("$.items[0].type").value("income"))
                    .andExpect(jsonPath("$.items[0].status").value("success"))
                    .andExpect(jsonPath("$.items[0].createdAt").value("2026-11-15T03:00:00Z"))
                    .andExpect(jsonPath("$.items[1].title").value("Cà phê sáng"))
                    .andExpect(jsonPath("$.items[1].type").value("expense"))
                    .andExpect(jsonPath("$.items[1].phone").doesNotExist());
        }

        @Test
        void paginatesAndClampsToLastPage() throws Exception {
            for (int i = 1; i <= 25; i++) {
                insert(anWallet, Category.FOOD, "Bữa " + i, 10_000, null, null, NOW.minusSeconds(i * 60L));
            }
            mvc.perform(withToken(get("/api/transactions").param("page", "3"), an))
                    .andExpect(jsonPath("$.total").value(26))
                    .andExpect(jsonPath("$.totalPages").value(3))
                    .andExpect(jsonPath("$.items", hasSize(6)));

            mvc.perform(withToken(get("/api/transactions").param("page", "99"), an))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.page").value(3))
                    .andExpect(jsonPath("$.items", hasSize(6)));
        }

        @Test
        void showsOnlyOwnTransactions() throws Exception {
            AuthResponse binh = register("Trần Thị Bình", "0987654321", "258369");
            UUID anTx = insert(anWallet, Category.FOOD, "Bí mật của An", 10_000, null, null, NOW);

            mvc.perform(withToken(get("/api/transactions"), binh))
                    .andExpect(jsonPath("$.total").value(1))
                    .andExpect(jsonPath("$.items[0].category").value("bonus"));
            mvc.perform(withToken(get("/api/transactions/" + anTx), binh))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("NOT_FOUND"));
            mvc.perform(withToken(get("/api/transactions/" + anTx), an))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Bí mật của An"));
        }
    }

    @Nested
    class Search {

        @BeforeEach
        void data() {
            insert(anWallet, Category.FOOD, "Cà phê sáng", 35_000, null, null, NOW.minusSeconds(60));
            insert(anWallet, Category.TRANSFER_OUT, "Chuyển tiền đến Lê Minh Châu", 200_000, "Tiền sinh nhật", "0356789012", NOW.minusSeconds(120));
            insert(anWallet, Category.SHOPPING, "Giảm 50% phí giao hàng", 99_000, null, null, NOW.minusSeconds(180));
            insert(anWallet, Category.TRANSPORT, "Đổ xăng", 80_000, null, null, NOW.minusSeconds(240));
        }

        @Test
        void ignoresDiacriticsAndCase() throws Exception {
            for (String q : new String[] {"ca phe", "CÀ PHÊ", "cà phe"}) {
                mvc.perform(withToken(get("/api/transactions").param("q", q), an))
                        .andExpect(jsonPath("$.items[*].title", contains("Cà phê sáng")));
            }
            // "đ" -> "d"
            mvc.perform(withToken(get("/api/transactions").param("q", "do xang"), an))
                    .andExpect(jsonPath("$.items[*].title", contains("Đổ xăng")));
        }

        @Test
        void searchesNoteAndPhone() throws Exception {
            mvc.perform(withToken(get("/api/transactions").param("q", "sinh nhat"), an))
                    .andExpect(jsonPath("$.items[*].phone", contains("0356789012")));
            mvc.perform(withToken(get("/api/transactions").param("q", "6789012"), an))
                    .andExpect(jsonPath("$.total").value(1));
        }

        @Test
        void treatsLikeWildcardsLiterally() throws Exception {
            mvc.perform(withToken(get("/api/transactions").param("q", "%"), an))
                    .andExpect(jsonPath("$.items[*].title", contains("Giảm 50% phí giao hàng")));
            mvc.perform(withToken(get("/api/transactions").param("q", "_"), an))
                    .andExpect(jsonPath("$.total").value(0));
        }
    }

    @Nested
    class Filters {

        @Test
        void byTypeAndCategory() throws Exception {
            insert(anWallet, Category.FOOD, "Phở", 50_000, null, null, NOW.minusSeconds(60));
            insert(anWallet, Category.SHOPPING, "Sách", 120_000, null, null, NOW.minusSeconds(120));

            mvc.perform(withToken(get("/api/transactions").param("type", "expense"), an))
                    .andExpect(jsonPath("$.items[*].title", containsInAnyOrder("Phở", "Sách")));
            mvc.perform(withToken(get("/api/transactions").param("type", "expense").param("category", "food"), an))
                    .andExpect(jsonPath("$.items[*].title", contains("Phở")));
        }

        /** 23:30 ngày 31/10 giờ Việt Nam là 16:30 UTC: phải thuộc ngày 31/10, không phải 1/11. */
        @Test
        void dateRangeUsesVietnamTime() throws Exception {
            insert(anWallet, Category.FOOD, "Ăn khuya", 40_000, null, null, Instant.parse("2026-10-31T16:30:00Z"));

            mvc.perform(withToken(get("/api/transactions").param("from", "2026-10-31").param("to", "2026-10-31"), an))
                    .andExpect(jsonPath("$.items[*].title", contains("Ăn khuya")));
            mvc.perform(withToken(get("/api/transactions").param("from", "2026-11-01"), an))
                    .andExpect(jsonPath("$.items[*].category", contains("bonus")));
        }

        @Test
        void rejectsInvalidParams() throws Exception {
            mvc.perform(withToken(get("/api/transactions").param("category", "abc"), an))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION"))
                    .andExpect(jsonPath("$.fields.category").value("Giá trị không hợp lệ."));
            mvc.perform(withToken(get("/api/transactions").param("pageSize", "100"), an))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fields.pageSize").value("Mỗi trang tối đa 50 giao dịch."));
            mvc.perform(withToken(get("/api/transactions").param("from", "2026-11-10").param("to", "2026-11-01"), an))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fields.dateRangeValid").exists());
            mvc.perform(withToken(get("/api/transactions/not-a-uuid"), an))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    class Dashboard {

        @Test
        void summarizesRequestedMonth() throws Exception {
            insert(anWallet, Category.SALARY, "Lương tháng", 15_000_000, null, null, Instant.parse("2026-10-05T02:00:00Z"));
            insert(anWallet, Category.FOOD, "Phở", 50_000, null, null, Instant.parse("2026-10-06T02:00:00Z"));
            insert(anWallet, Category.FOOD, "Cơm", 40_000, null, null, Instant.parse("2026-10-07T02:00:00Z"));
            insert(anWallet, Category.SHOPPING, "Sách", 300_000, null, null, Instant.parse("2026-10-08T02:00:00Z"));
            insert(anWallet, Category.WITHDRAW, "Rút về VCB", 1_000_000, null, null, Instant.parse("2026-10-09T02:00:00Z"));
            // 00:30 ngày 1/11 giờ VN: thuộc tháng 11, không tính vào tháng 10
            insert(anWallet, Category.FOOD, "Ăn sáng sớm", 30_000, null, null, Instant.parse("2026-10-31T17:30:00Z"));

            mvc.perform(withToken(get("/api/dashboard").param("month", "2026-10"), an))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.balance").value(500_000))
                    .andExpect(jsonPath("$.month.income").value(15_000_000))
                    // Tiền ra gồm cả rút tiền...
                    .andExpect(jsonPath("$.month.expense").value(1_390_000))
                    // ...nhưng thống kê chi tiêu thì không, và xếp nhiều nhất trước
                    .andExpect(jsonPath("$.byCategory[*].category", contains("shopping", "food")))
                    .andExpect(jsonPath("$.byCategory[1].total").value(90_000))
                    .andExpect(jsonPath("$.recent", hasSize(5)))
                    .andExpect(jsonPath("$.recent[0].category").value("bonus"));
        }

        @Test
        void defaultsToCurrentMonthInVietnam() throws Exception {
            insert(anWallet, Category.FOOD, "Phở", 50_000, null, null, NOW.minusSeconds(60));
            mvc.perform(withToken(get("/api/dashboard"), an))
                    .andExpect(jsonPath("$.month.income").value(500_000))
                    .andExpect(jsonPath("$.month.expense").value(50_000));
        }

        @Test
        void rejectsInvalidMonth() throws Exception {
            mvc.perform(withToken(get("/api/dashboard").param("month", "2026-13"), an))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION"));
        }
    }

    @Nested
    class Wallet {

        @Test
        void returnsBalanceProfileAndRecentContacts() throws Exception {
            register("Trần Thị Bình", "0987654321", "258369");
            register("Lê Minh Châu", "0356789012", "258369");
            insert(anWallet, Category.TRANSFER_OUT, "Chuyển tiền đến Trần Thị Bình", 100_000, null, "0987654321", NOW.minusSeconds(3600));
            insert(anWallet, Category.TRANSFER_IN, "Nhận tiền từ Lê Minh Châu", 50_000, null, "0356789012", NOW.minusSeconds(60));
            // Số không đăng ký MiniWallet thì không có trong danh bạ
            insert(anWallet, Category.TRANSFER_OUT, "Chuyển tiền", 10_000, null, "0901111111", NOW.minusSeconds(30));

            mvc.perform(withToken(get("/api/wallet"), an))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.balance").value(500_000))
                    .andExpect(jsonPath("$.frozen").value(false))
                    .andExpect(jsonPath("$.profile.phone").value("0912345678"))
                    .andExpect(jsonPath("$.contacts[*].name", contains("Lê Minh Châu", "Trần Thị Bình")));
        }
    }

    private long walletIdOf(String phone) {
        return jdbc.queryForObject("SELECT w.id FROM wallets w JOIN users u ON u.id = w.user_id WHERE u.phone = ?",
                Long.class, phone);
    }

    private UUID insert(long walletId, Category category, String title, long amount, String note, String phone, Instant at) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO transactions (id, wallet_id, type, category, title, amount, note, counterparty_phone, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, walletId, category.type().name(), category.name(), title, amount, note, phone, Timestamp.from(at));
        return id;
    }
}
