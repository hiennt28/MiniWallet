package com.miniwallet.common.error;

import java.util.Map;

/**
 * Lỗi nghiệp vụ có chủ đích (sai PIN, không đủ số dư...). Service ném ra,
 * {@link GlobalExceptionHandler} chuyển thành response JSON với HTTP status tương ứng.
 */
public class ApiException extends RuntimeException {

    private final ErrorCode code;
    private final Map<String, String> fields;

    public ApiException(ErrorCode code) {
        this(code, code.defaultMessage());
    }

    public ApiException(ErrorCode code, String message) {
        this(code, message, null);
    }

    private ApiException(ErrorCode code, String message, Map<String, String> fields) {
        super(message);
        this.code = code;
        this.fields = fields;
    }

    /**
     * Lỗi gắn với một ô nhập mà chỉ server kiểm tra được (ví dụ "số điện thoại chưa đăng ký"),
     * để form hiển thị ngay dưới ô đó giống lỗi validate thông thường.
     */
    public static ApiException invalidField(String field, String message) {
        return new ApiException(ErrorCode.VALIDATION, message, Map.of(field, message));
    }

    public ErrorCode getCode() {
        return code;
    }

    /** Có thể null. */
    public Map<String, String> getFields() {
        return fields;
    }
}
