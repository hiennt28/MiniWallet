package com.miniwallet.common.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

/**
 * Định dạng lỗi thống nhất cho mọi endpoint:
 * <pre>{ "code": "VALIDATION", "message": "...", "fields": { "phone": "..." } }</pre>
 * {@code fields} chỉ có khi lỗi gắn với từng ô nhập.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorResponse(String code, String message, Map<String, String> fields) {

    public static ApiErrorResponse of(ErrorCode code, String message) {
        return new ApiErrorResponse(code.name(), message, null);
    }
}
