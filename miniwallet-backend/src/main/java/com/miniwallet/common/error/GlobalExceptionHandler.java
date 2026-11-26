package com.miniwallet.common.error;

import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Chuyển mọi exception thành {@link ApiErrorResponse}, để client luôn nhận cùng một định dạng lỗi. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiErrorResponse> handleApi(ApiException ex) {
        ErrorCode code = ex.getCode();
        return ResponseEntity.status(code.status())
                .body(new ApiErrorResponse(code.name(), ex.getMessage(), ex.getFields()));
    }

    /**
     * Lỗi @Valid trên request body hoặc nhóm query param (record): trả về lỗi theo từng trường
     * để form hiển thị dưới ô nhập.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> handleBodyValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            // Không chuyển được kiểu (ví dụ ?category=abc): message mặc định của Spring là tiếng Anh, khó hiểu
            String message = error.isBindingFailure() ? "Giá trị không hợp lệ." : error.getDefaultMessage();
            // Một trường có nhiều lỗi thì giữ lỗi đầu tiên, giống cách form hiển thị
            fields.putIfAbsent(error.getField(), message);
        }
        ErrorCode code = ErrorCode.VALIDATION;
        return ResponseEntity.status(code.status())
                .body(new ApiErrorResponse(code.name(), code.defaultMessage(), fields));
    }

    /** Lỗi validate trên @RequestParam / @PathVariable. */
    @ExceptionHandler({HandlerMethodValidationException.class, ConstraintViolationException.class})
    ResponseEntity<ApiErrorResponse> handleParamValidation(Exception ex) {
        return respond(ErrorCode.VALIDATION, ErrorCode.VALIDATION.defaultMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiErrorResponse> handleUnreadable(HttpMessageNotReadableException ex) {
        return respond(ErrorCode.VALIDATION, "Nội dung request không đúng định dạng JSON.");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return respond(ErrorCode.VALIDATION, "Giá trị của tham số '" + ex.getName() + "' không hợp lệ.");
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<ApiErrorResponse> handleMissingParam(MissingServletRequestParameterException ex) {
        return respond(ErrorCode.VALIDATION, "Thiếu tham số '" + ex.getParameterName() + "'.");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiErrorResponse> handleNotFound(NoResourceFoundException ex) {
        return respond(ErrorCode.NOT_FOUND, ErrorCode.NOT_FOUND.defaultMessage());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiErrorResponse> handleMethod(HttpRequestMethodNotSupportedException ex) {
        return respond(ErrorCode.METHOD_NOT_ALLOWED, ErrorCode.METHOD_NOT_ALLOWED.defaultMessage());
    }

    /** Lỗi không lường trước: ghi log đầy đủ, nhưng không lộ chi tiết (stack trace, SQL) ra client. */
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return respond(ErrorCode.SERVER_ERROR, ErrorCode.SERVER_ERROR.defaultMessage());
    }

    private static ResponseEntity<ApiErrorResponse> respond(ErrorCode code, String message) {
        return ResponseEntity.status(code.status()).body(ApiErrorResponse.of(code, message));
    }
}
