package com.miniwallet.transfer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniwallet.auth.dto.AuthResponse;
import com.miniwallet.support.IntegrationTest;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class TransferFlowTest extends IntegrationTest {

    static final String AN = "0912345678";
    static final String BINH = "0987654321";
    static final String BINH_PIN = "258369";

    AuthResponse an;
    AuthResponse binh;

    @BeforeEach
    void setUp() throws Exception {
        an = register("Nguyễn Văn An", AN, DEFAULT_PIN);      // 500.000 ₫
        binh = register("Trần Thị Bình", BINH, BINH_PIN);     // 500.000 ₫
    }

    @Nested
    class SmallTransfer {

        @Test
        void completesImmediatelyForBothSides() throws Exception {
            transfer(an, body("0987 654 321", 200_000, "Trả tiền ăn trưa"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.status").value("completed"))
                    .andExpect(jsonPath("$.ticket").doesNotExist())
                    .andExpect(jsonPath("$.tx.type").value("expense"))
                    .andExpect(jsonPath("$.tx.category").value("transfer_out"))
                    .andExpect(jsonPath("$.tx.title").value("Chuyển tiền đến Trần Thị Bình"))
                    .andExpect(jsonPath("$.tx.amount").value(200_000))
                    .andExpect(jsonPath("$.tx.phone").value(BINH))
                    .andExpect(jsonPath("$.tx.note").value("Trả tiền ăn trưa"));

            assertThat(balance(AN)).isEqualTo(300_000);
            assertThat(balance(BINH)).isEqualTo(700_000);

            mvc.perform(withToken(get("/api/transactions").param("category", "transfer_in"), binh))
                    .andExpect(jsonPath("$.items[0].title").value("Nhận tiền từ Nguyễn Văn An"))
                    .andExpect(jsonPath("$.items[0].phone").value(AN))
                    .andExpect(jsonPath("$.items[0].note").value("Trả tiền ăn trưa"));
            // Người vừa chuyển xuất hiện trong danh bạ gợi ý
            mvc.perform(withToken(get("/api/wallet"), an))
                    .andExpect(jsonPath("$.contacts[0].name").value("Trần Thị Bình"));
        }
    }

    @Nested
    class Validation {

        @Test
        void inputErrorsComeBackPerFieldWithoutUsingPinAttempts() throws Exception {
            transfer(an, body(AN, 100_000, null)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fields.phone").value("Không thể chuyển tiền cho chính mình."));
            transfer(an, body("0901111111", 100_000, null)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fields.phone").value("Số điện thoại này chưa đăng ký MiniWallet."));
            transfer(an, body(BINH, 5_000, null)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fields.amount").value("Số tiền tối thiểu là 10.000 ₫."));
            transfer(an, body(BINH, 60_000_000, null)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fields.amount").value("Mỗi lần chuyển tối đa 50.000.000 ₫."));
            transfer(an, body(BINH, 100_000, "x".repeat(101))).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fields.note").value("Lời nhắn tối đa 100 ký tự."));

            assertThat(jdbc.queryForObject("SELECT failed_pin_attempts FROM users WHERE phone = ?", Integer.class, AN)).isZero();
            assertThat(balance(AN)).isEqualTo(500_000);
        }

        @Test
        void rejectsFractionalAmount() throws Exception {
            mvc.perform(withToken(post("/api/transfers").contentType("application/json")
                            .content("{\"phone\":\"" + BINH + "\",\"amount\":10000.5,\"pin\":\"" + DEFAULT_PIN + "\"}"), an))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION"));
        }

        @Test
        void insufficientBalance() throws Exception {
            transfer(an, body(BINH, 600_000, null))
                    .andExpect(status().isUnprocessableContent())
                    .andExpect(jsonPath("$.code").value("INSUFFICIENT_BALANCE"));
        }

        @Test
        void wrongPinMovesNoMoney() throws Exception {
            Map<String, Object> body = body(BINH, 100_000, null);
            body.put("pin", "000001");
            transfer(an, body)
                    .andExpect(status().isUnprocessableContent())
                    .andExpect(jsonPath("$.code").value("PIN_INVALID"))
                    .andExpect(jsonPath("$.message").value("Mã PIN không đúng. Bạn còn 4 lần thử."));
            assertThat(balance(AN)).isEqualTo(500_000);
        }

        @Test
        void frozenWalletCannotSend() throws Exception {
            mvc.perform(withToken(post("/api/wallet/freeze"), an));
            transfer(an, body(BINH, 100_000, null))
                    .andExpect(status().isLocked())
                    .andExpect(jsonPath("$.code").value("WALLET_FROZEN"));
        }
    }

    @Nested
    class LargeTransferWithOtp {

        @BeforeEach
        void richer() {
            setBalance(AN, 20_000_000);
        }

        @Test
        void requiresOtpThenMovesMoneyOnce() throws Exception {
            var ticket = startLarge(6_000_000);
            assertThat(ticket.otp()).matches("\\d{6}");
            assertThat(ticket.expiresAt() - ticket.sentAt()).isEqualTo(120_000);
            // Chưa trừ tiền khi đang chờ OTP
            assertThat(balance(AN)).isEqualTo(20_000_000);

            String txId = confirm(an, ticket.transferId(), ticket.otp())
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.category").value("transfer_out"))
                    .andExpect(jsonPath("$.amount").value(6_000_000))
                    .andReturn().getResponse().getContentAsString();
            assertThat(balance(AN)).isEqualTo(14_000_000);
            assertThat(balance(BINH)).isEqualTo(6_500_000);

            // Bấm xác nhận lần nữa: nhận lại đúng giao dịch cũ, không chuyển thêm
            String again = confirm(an, ticket.transferId(), ticket.otp()).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            assertThat(again).isEqualTo(txId);
            assertThat(balance(AN)).isEqualTo(14_000_000);
        }

        @Test
        void threeWrongOtpsCancelTheTransfer() throws Exception {
            var ticket = startLarge(5_000_000);
            String wrong = ticket.otp().equals("000000") ? "111111" : "000000";

            confirm(an, ticket.transferId(), wrong).andExpect(status().isUnprocessableContent())
                    .andExpect(jsonPath("$.code").value("OTP_INVALID"))
                    .andExpect(jsonPath("$.message").value("Mã OTP không đúng. Bạn còn 2 lần thử."));
            confirm(an, ticket.transferId(), wrong)
                    .andExpect(jsonPath("$.message").value("Mã OTP không đúng. Bạn còn 1 lần thử."));
            confirm(an, ticket.transferId(), wrong).andExpect(status().isLocked())
                    .andExpect(jsonPath("$.code").value("OTP_LOCKED"));

            // Đã hủy: mã đúng cũng không dùng được nữa
            confirm(an, ticket.transferId(), ticket.otp()).andExpect(status().isNotFound());
            assertThat(balance(AN)).isEqualTo(20_000_000);
        }

        @Test
        void otpExpiresAfterTwoMinutesAndCanBeResent() throws Exception {
            var ticket = startLarge(5_000_000);

            resend(an, ticket.transferId()).andExpect(status().isTooManyRequests())
                    .andExpect(jsonPath("$.code").value("TOO_SOON"));

            clock.advance(Duration.ofMinutes(2));
            confirm(an, ticket.transferId(), ticket.otp()).andExpect(status().isUnprocessableContent())
                    .andExpect(jsonPath("$.code").value("OTP_EXPIRED"));

            var fresh = read(resend(an, ticket.transferId()).andExpect(status().isOk()).andReturn(),
                    com.miniwallet.transfer.dto.OtpTicket.class);
            assertThat(fresh.transferId()).isEqualTo(ticket.transferId());
            confirm(an, ticket.transferId(), fresh.otp()).andExpect(status().isOk());
        }

        @Test
        void resendAllowedAfterThirtySeconds() throws Exception {
            var ticket = startLarge(5_000_000);
            clock.advance(Duration.ofSeconds(30));
            resend(an, ticket.transferId()).andExpect(status().isOk())
                    .andExpect(jsonPath("$.otp").isNotEmpty());
        }

        @Test
        void onlyTheSenderCanConfirm() throws Exception {
            var ticket = startLarge(5_000_000);
            confirm(binh, ticket.transferId(), ticket.otp()).andExpect(status().isNotFound());
            resend(binh, ticket.transferId()).andExpect(status().isNotFound());
        }

        @Test
        void walletFrozenWhileWaitingForOtp() throws Exception {
            var ticket = startLarge(5_000_000);
            mvc.perform(withToken(post("/api/wallet/freeze"), an));

            confirm(an, ticket.transferId(), ticket.otp()).andExpect(status().isLocked())
                    .andExpect(jsonPath("$.code").value("WALLET_FROZEN"));
            assertThat(balance(AN)).isEqualTo(20_000_000);

            mvc.perform(withToken(postJson("/api/wallet/unfreeze", Map.of("pin", DEFAULT_PIN)), an));
            confirm(an, ticket.transferId(), ticket.otp()).andExpect(status().isOk());
        }

        private com.miniwallet.transfer.dto.OtpTicket startLarge(long amount) throws Exception {
            var result = read(transfer(an, body(BINH, amount, null))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.status").value("otp_required"))
                    .andExpect(jsonPath("$.tx").doesNotExist())
                    .andReturn(), com.miniwallet.transfer.dto.TransferResult.class);
            return result.ticket();
        }
    }

    @Nested
    class Idempotency {

        @Test
        void sameKeyIsProcessedOnce() throws Exception {
            String first = transfer(an, body(BINH, 100_000, "Tiền điện"), "key-123")
                    .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
            String second = transfer(an, body(BINH, 100_000, "Tiền điện"), "key-123")
                    .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();

            assertThat(second).isEqualTo(first);
            assertThat(balance(AN)).isEqualTo(400_000);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM transfers", Long.class)).isOne();
        }

        @Test
        void differentKeysAreDifferentTransfers() throws Exception {
            transfer(an, body(BINH, 100_000, null), "key-1").andExpect(status().isCreated());
            transfer(an, body(BINH, 100_000, null), "key-2").andExpect(status().isCreated());
            assertThat(balance(AN)).isEqualTo(300_000);
        }

        @Test
        void sameKeyWithDifferentContentIsRejected() throws Exception {
            transfer(an, body(BINH, 100_000, null), "key-123").andExpect(status().isCreated());
            transfer(an, body(BINH, 200_000, null), "key-123")
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Idempotency-Key này đã được dùng cho một giao dịch khác."));
            assertThat(balance(AN)).isEqualTo(400_000);
        }

        @Test
        void keysAreScopedPerUser() throws Exception {
            transfer(an, body(BINH, 100_000, null), "shared-key").andExpect(status().isCreated());
            transfer(binh, body(AN, 100_000, null), "shared-key").andExpect(status().isCreated());
            assertThat(balance(AN)).isEqualTo(500_000);
            assertThat(balance(BINH)).isEqualTo(500_000);
        }
    }

    // ---------------------------------------------------------------- helpers

    private Map<String, Object> body(String phone, long amount, String note) {
        Map<String, Object> body = new HashMap<>();
        body.put("phone", phone);
        body.put("amount", amount);
        body.put("pin", DEFAULT_PIN); // transfer() đổi sang PIN của Bình khi Bình là người gửi
        if (note != null) body.put("note", note);
        return body;
    }

    private ResultActions transfer(AuthResponse who, Map<String, Object> body) throws Exception {
        return transfer(who, body, null);
    }

    private ResultActions transfer(AuthResponse who, Map<String, Object> body, String idempotencyKey) throws Exception {
        if (who == binh) body.put("pin", BINH_PIN);
        MockHttpServletRequestBuilder request = withToken(postJson("/api/transfers", body), who);
        if (idempotencyKey != null) request.header("Idempotency-Key", idempotencyKey);
        return mvc.perform(request);
    }

    private ResultActions confirm(AuthResponse who, String transferId, String otp) throws Exception {
        return mvc.perform(withToken(postJson("/api/transfers/" + transferId + "/confirm", Map.of("otp", otp)), who));
    }

    private ResultActions resend(AuthResponse who, String transferId) throws Exception {
        return mvc.perform(withToken(post("/api/transfers/" + transferId + "/otp/resend"), who));
    }

    private long balance(String phone) {
        return jdbc.queryForObject("SELECT w.balance FROM wallets w JOIN users u ON u.id = w.user_id WHERE u.phone = ?",
                Long.class, phone);
    }

    private void setBalance(String phone, long balance) {
        jdbc.update("UPDATE wallets SET balance = ? WHERE user_id = (SELECT id FROM users WHERE phone = ?)", balance, phone);
    }
}
