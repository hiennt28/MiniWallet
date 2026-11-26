package com.miniwallet.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniwallet.auth.dto.AuthResponse;
import com.miniwallet.support.IntegrationTest;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

class AuthFlowTest extends IntegrationTest {

    static final String PHONE = "0912345678";

    @Nested
    class Register {

        @Test
        void createsUserWalletWithWelcomeBonusAndReturnsTokens() throws Exception {
            AuthResponse auth = register("  Trần   Thị Bình ", "0987 654 321", "147258");

            assertThat(auth.accessToken()).isNotBlank();
            assertThat(auth.refreshToken()).isNotBlank();
            assertThat(auth.tokenType()).isEqualTo("Bearer");
            assertThat(auth.expiresIn()).isEqualTo(900);
            assertThat(auth.user().name()).isEqualTo("Trần Thị Bình");
            assertThat(auth.user().phone()).isEqualTo("0987654321");

            Long balance = jdbc.queryForObject(
                    "SELECT w.balance FROM wallets w JOIN users u ON u.id = w.user_id WHERE u.phone = '0987654321'", Long.class);
            assertThat(balance).isEqualTo(AuthService.WELCOME_BONUS);

            Map<String, Object> tx = jdbc.queryForMap("SELECT type, category, amount FROM transactions");
            assertThat(tx).containsEntry("type", "INCOME").containsEntry("category", "BONUS").containsEntry("amount", 500_000L);
        }

        @Test
        void storesPinAsBcryptHashOnly() throws Exception {
            register(PHONE);
            String hash = jdbc.queryForObject("SELECT pin_hash FROM users", String.class);
            assertThat(hash).startsWith("$2").doesNotContain(DEFAULT_PIN);
        }

        @Test
        void rejectsDuplicatePhone() throws Exception {
            register(PHONE);
            mvc.perform(postJson("/api/auth/register", Map.of("name", "Người khác", "phone", PHONE, "pin", "258369")))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("PHONE_TAKEN"));
        }

        @Test
        void returnsFieldErrors() throws Exception {
            mvc.perform(postJson("/api/auth/register", Map.of("name", "", "phone", "123", "pin", "123456")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION"))
                    .andExpect(jsonPath("$.fields.name").value("Vui lòng nhập họ tên."))
                    .andExpect(jsonPath("$.fields.phone").exists())
                    .andExpect(jsonPath("$.fields.pin").value(org.hamcrest.Matchers.startsWith("Mã PIN quá dễ đoán")));
            assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Long.class)).isZero();
        }
    }

    @Nested
    class Login {

        @Test
        void succeedsWithCorrectPin() throws Exception {
            register(PHONE);
            mvc.perform(postJson("/api/auth/login", Map.of("phone", "0912 345 678", "pin", DEFAULT_PIN)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.accessToken").isNotEmpty())
                    .andExpect(jsonPath("$.user.phone").value(PHONE));
        }

        @Test
        void unknownPhoneAndWrongPinGetTheSameAnswer() throws Exception {
            register(PHONE);
            String wrongPin = mvc.perform(postJson("/api/auth/login", Map.of("phone", PHONE, "pin", "000001")))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                    .andReturn().getResponse().getContentAsString();
            String unknownPhone = mvc.perform(postJson("/api/auth/login", Map.of("phone", "0987654321", "pin", "000001")))
                    .andExpect(status().isUnauthorized())
                    .andReturn().getResponse().getContentAsString();
            assertThat(unknownPhone).isEqualTo(wrongPin);
        }

        @Test
        void locksForFiveMinutesAfterFiveWrongPins() throws Exception {
            register(PHONE);
            for (int i = 0; i < 4; i++) {
                mvc.perform(postJson("/api/auth/login", Map.of("phone", PHONE, "pin", "000001")))
                        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
            }
            mvc.perform(postJson("/api/auth/login", Map.of("phone", PHONE, "pin", "000001")))
                    .andExpect(status().isLocked())
                    .andExpect(jsonPath("$.code").value("PIN_LOCKED"));

            // Đang khóa thì PIN đúng cũng bị từ chối
            mvc.perform(postJson("/api/auth/login", Map.of("phone", PHONE, "pin", DEFAULT_PIN)))
                    .andExpect(status().isLocked())
                    .andExpect(jsonPath("$.message").value("Bạn đã nhập sai PIN quá nhiều lần. Vui lòng thử lại sau 5 phút."));

            clock.advance(Duration.ofMinutes(5));
            mvc.perform(postJson("/api/auth/login", Map.of("phone", PHONE, "pin", DEFAULT_PIN)))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    class AccessToken {

        @Test
        void meRequiresToken() throws Exception {
            mvc.perform(get("/api/me"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        }

        @Test
        void meReturnsProfile() throws Exception {
            AuthResponse auth = register(PHONE);
            mvc.perform(withToken(get("/api/me"), auth))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Nguyễn Văn An"))
                    .andExpect(jsonPath("$.phone").value(PHONE))
                    .andExpect(jsonPath("$.pinHash").doesNotExist());
        }

        @Test
        void rejectsTamperedToken() throws Exception {
            AuthResponse auth = register(PHONE);
            String token = auth.accessToken();
            String tampered = token.substring(0, token.length() - 4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");
            mvc.perform(get("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + tampered))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        }

        @Test
        void rejectsExpiredToken() throws Exception {
            AuthResponse auth = register(PHONE);
            // Hạn 15 phút + 60 giây cho phép lệch đồng hồ giữa các server (mặc định của Spring Security)
            clock.advance(Duration.ofMinutes(17));
            mvc.perform(withToken(get("/api/me"), auth))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    class RefreshAndLogout {

        @Test
        void refreshRotatesTokens() throws Exception {
            AuthResponse first = register(PHONE);
            clock.advance(Duration.ofMinutes(10));

            AuthResponse second = read(mvc.perform(postJson("/api/auth/refresh", Map.of("refreshToken", first.refreshToken())))
                    .andExpect(status().isOk())
                    .andReturn(), AuthResponse.class);

            assertThat(second.refreshToken()).isNotEqualTo(first.refreshToken());
            assertThat(second.accessToken()).isNotEqualTo(first.accessToken());
            mvc.perform(withToken(get("/api/me"), second)).andExpect(status().isOk());
        }

        @Test
        void reusingOldRefreshTokenRevokesAllSessions() throws Exception {
            AuthResponse first = register(PHONE);
            AuthResponse second = read(mvc.perform(postJson("/api/auth/refresh", Map.of("refreshToken", first.refreshToken())))
                    .andReturn(), AuthResponse.class);

            // Kẻ gian dùng lại token cũ
            mvc.perform(postJson("/api/auth/refresh", Map.of("refreshToken", first.refreshToken())))
                    .andExpect(status().isUnauthorized());
            // Token mới của người dùng thật cũng bị thu hồi, buộc đăng nhập lại
            mvc.perform(postJson("/api/auth/refresh", Map.of("refreshToken", second.refreshToken())))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void refreshTokenExpiresAfterThirtyIdleMinutes() throws Exception {
            AuthResponse auth = register(PHONE);
            clock.advance(Duration.ofMinutes(30));
            mvc.perform(postJson("/api/auth/refresh", Map.of("refreshToken", auth.refreshToken())))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void logoutRevokesRefreshToken() throws Exception {
            AuthResponse auth = register(PHONE);
            mvc.perform(postJson("/api/auth/logout", Map.of("refreshToken", auth.refreshToken())))
                    .andExpect(status().isNoContent());
            mvc.perform(postJson("/api/auth/refresh", Map.of("refreshToken", auth.refreshToken())))
                    .andExpect(status().isUnauthorized());
            // Gọi lại vẫn 204
            mvc.perform(postJson("/api/auth/logout", Map.of("refreshToken", auth.refreshToken())))
                    .andExpect(status().isNoContent());
        }
    }

    @Nested
    class FreezeWallet {

        @Test
        void freezeNeedsNoPinButUnfreezeDoes() throws Exception {
            AuthResponse auth = register(PHONE);

            mvc.perform(withToken(post("/api/wallet/freeze"), auth)).andExpect(status().isNoContent());
            assertThat(frozen()).isTrue();

            mvc.perform(withToken(postJson("/api/wallet/unfreeze", Map.of("pin", "000001")), auth))
                    .andExpect(status().isUnprocessableContent())
                    .andExpect(jsonPath("$.code").value("PIN_INVALID"))
                    .andExpect(jsonPath("$.message").value("Mã PIN không đúng. Bạn còn 4 lần thử."));
            assertThat(frozen()).isTrue();

            mvc.perform(withToken(postJson("/api/wallet/unfreeze", Map.of("pin", DEFAULT_PIN)), auth))
                    .andExpect(status().isNoContent());
            assertThat(frozen()).isFalse();
        }

        @Test
        void wrongPinCountIsSharedWithLogin() throws Exception {
            AuthResponse auth = register(PHONE);
            for (int i = 0; i < 5; i++) {
                mvc.perform(withToken(postJson("/api/wallet/unfreeze", Map.of("pin", "000001")), auth));
            }
            mvc.perform(postJson("/api/auth/login", Map.of("phone", PHONE, "pin", DEFAULT_PIN)))
                    .andExpect(jsonPath("$.code").value("PIN_LOCKED"));
        }

        private boolean frozen() {
            return jdbc.queryForObject("SELECT frozen FROM wallets", Boolean.class);
        }
    }
}
