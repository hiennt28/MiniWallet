package com.miniwallet.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniwallet.auth.dto.AuthResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.json.JsonMapper;

/**
 * Lớp cha cho integration test: khởi động toàn bộ ứng dụng với database PostgreSQL thật
 * (miniwallet_test ở máy, hoặc service postgres trên CI).
 * <ul>
 *   <li>Flyway xóa và tạo lại schema một lần mỗi lần chạy (Spring cache context giữa các lớp test).</li>
 *   <li>Trước mỗi test: xóa sạch dữ liệu và đặt lại đồng hồ giả.</li>
 * </ul>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(IntegrationTest.TestConfig.class)
public abstract class IntegrationTest {

    protected static final String DEFAULT_PIN = "147258";

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JsonMapper json;

    @Autowired
    protected JdbcTemplate jdbc;

    @Autowired
    protected MutableClock clock;

    @BeforeEach
    void resetState() {
        jdbc.execute("TRUNCATE users, wallets, transactions, refresh_tokens, transfers RESTART IDENTITY CASCADE");
        clock.set(Instant.now().truncatedTo(ChronoUnit.SECONDS));
    }

    protected AuthResponse register(String name, String phone, String pin) throws Exception {
        MvcResult result = mvc.perform(postJson("/api/auth/register", Map.of("name", name, "phone", phone, "pin", pin)))
                .andExpect(status().isCreated())
                .andReturn();
        return read(result, AuthResponse.class);
    }

    protected AuthResponse register(String phone) throws Exception {
        return register("Nguyễn Văn An", phone, DEFAULT_PIN);
    }

    protected MockHttpServletRequestBuilder postJson(String url, Object body) {
        return post(url).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
    }

    protected static String bearer(AuthResponse auth) {
        return "Bearer " + auth.accessToken();
    }

    protected static MockHttpServletRequestBuilder withToken(MockHttpServletRequestBuilder request, AuthResponse auth) {
        return request.header(HttpHeaders.AUTHORIZATION, bearer(auth));
    }

    protected <T> T read(MvcResult result, Class<T> type) throws Exception {
        return json.readValue(result.getResponse().getContentAsString(StandardCharsets.UTF_8), type);
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        FlywayMigrationStrategy cleanThenMigrate() {
            return flyway -> {
                flyway.clean();
                flyway.migrate();
            };
        }

        /** Thay Clock thật để test "5 phút sau", "token hết hạn" mà không phải chờ. */
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(Instant.now());
        }
    }
}
