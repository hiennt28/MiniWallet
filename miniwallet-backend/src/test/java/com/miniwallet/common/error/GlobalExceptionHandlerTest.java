package com.miniwallet.common.error;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Unit test cho định dạng lỗi, dùng controller giả nên không cần database hay khởi động cả ứng dụng. */
class GlobalExceptionHandlerTest {

    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new FakeController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void businessErrorUsesCodeStatusAndMessage() throws Exception {
        mvc.perform(get("/fake/insufficient"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_BALANCE"))
                .andExpect(jsonPath("$.message").value("Số dư không đủ."))
                .andExpect(jsonPath("$.fields").doesNotExist());
    }

    @Test
    void businessErrorCanOverrideMessage() throws Exception {
        mvc.perform(get("/fake/pin-locked"))
                .andExpect(status().isLocked())
                .andExpect(jsonPath("$.code").value("PIN_LOCKED"))
                .andExpect(jsonPath("$.message").value("Thử lại sau 5 phút."));
    }

    @Test
    void invalidBodyReturnsFieldErrors() throws Exception {
        mvc.perform(post("/fake/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"phone\":\"123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION"))
                .andExpect(jsonPath("$.fields.name").value("Vui lòng nhập họ tên."))
                .andExpect(jsonPath("$.fields.phone").value("Số điện thoại không hợp lệ."));
    }

    @Test
    void malformedJsonIsValidationError() throws Exception {
        mvc.perform(post("/fake/register").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION"));
    }

    @Test
    void wrongParamTypeIsValidationError() throws Exception {
        mvc.perform(get("/fake/page").param("page", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION"))
                .andExpect(jsonPath("$.message").value("Giá trị của tham số 'page' không hợp lệ."));
    }

    @Test
    void unsupportedMethodIs405() throws Exception {
        mvc.perform(post("/fake/insufficient"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
    }

    @Test
    void unexpectedErrorHidesDetails() throws Exception {
        mvc.perform(get("/fake/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("SERVER_ERROR"))
                .andExpect(jsonPath("$.message").value("Đã có lỗi xảy ra. Vui lòng thử lại sau."));
    }

    record RegisterRequest(
            @NotBlank(message = "Vui lòng nhập họ tên.") String name,
            @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại không hợp lệ.") String phone) {}

    @RestController
    static class FakeController {

        @GetMapping("/fake/insufficient")
        void insufficient() {
            throw new ApiException(ErrorCode.INSUFFICIENT_BALANCE);
        }

        @GetMapping("/fake/pin-locked")
        void pinLocked() {
            throw new ApiException(ErrorCode.PIN_LOCKED, "Thử lại sau 5 phút.");
        }

        @PostMapping("/fake/register")
        void register(@Valid @RequestBody RegisterRequest request) {}

        @GetMapping("/fake/page")
        int page(@RequestParam int page) {
            return page;
        }

        @GetMapping("/fake/boom")
        void boom() {
            throw new IllegalStateException("SQL: SELECT * FROM users -- chi tiết nội bộ");
        }
    }
}
