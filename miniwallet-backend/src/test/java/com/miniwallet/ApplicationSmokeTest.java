package com.miniwallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniwallet.support.IntegrationTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

class ApplicationSmokeTest extends IntegrationTest {

    @Test
    void flywayCreatesSearchExtensions() {
        List<String> extensions = jdbc.queryForList("SELECT extname FROM pg_extension", String.class);
        assertThat(extensions).contains("unaccent", "pg_trgm");
    }

    @Test
    void unaccentStripsVietnameseDiacritics() {
        String result = jdbc.queryForObject("SELECT unaccent('Cà phê sáng')", String.class);
        assertThat(result).isEqualTo("Ca phe sang");
    }

    @Test
    void healthEndpointReportsUp() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void openApiDocsAreServed() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("MiniWallet API"));
    }

    @Test
    void swaggerUiIsPublic() throws Exception {
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
    }

    /** Chưa đăng nhập thì mọi đường dẫn đều trả 401, kể cả đường dẫn không tồn tại (không lộ API nào có thật). */
    @Test
    void unauthenticatedRequestGetsJson401() throws Exception {
        mvc.perform(get("/api/does-not-exist"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void authenticatedUnknownPathReturnsJsonNotFound() throws Exception {
        var auth = register("0912345678");
        mvc.perform(withToken(get("/api/does-not-exist"), auth))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void corsAllowsFrontendDevServer() throws Exception {
        mvc.perform(options("/api/anything")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
    }

    @Test
    void corsRejectsUnknownOrigin() throws Exception {
        mvc.perform(options("/api/anything")
                        .header(HttpHeaders.ORIGIN, "https://evil.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden());
    }
}
