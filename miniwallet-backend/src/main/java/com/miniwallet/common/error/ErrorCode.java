package com.miniwallet.common.error;

import org.springframework.http.HttpStatus;

/**
 * Mã lỗi nghiệp vụ trả về cho client. Giữ đúng tên với {@code ApiErrorCode} của frontend
 * để giao diện xử lý từng trường hợp (ví dụ PIN_LOCKED thì hiện đếm ngược).
 */
public enum ErrorCode {
    VALIDATION(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Số điện thoại hoặc mã PIN không đúng."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy dữ liệu."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "Phương thức không được hỗ trợ."),
    PHONE_TAKEN(HttpStatus.CONFLICT, "Số điện thoại đã được đăng ký."),
    PIN_INVALID(HttpStatus.UNPROCESSABLE_CONTENT, "Mã PIN không đúng."),
    PIN_LOCKED(HttpStatus.LOCKED, "Bạn đã nhập sai PIN quá nhiều lần. Vui lòng thử lại sau."),
    WALLET_FROZEN(HttpStatus.LOCKED, "Ví đang bị khóa. Mở khóa ví để tiếp tục giao dịch."),
    INSUFFICIENT_BALANCE(HttpStatus.UNPROCESSABLE_CONTENT, "Số dư không đủ."),
    OTP_INVALID(HttpStatus.UNPROCESSABLE_CONTENT, "Mã OTP không đúng."),
    OTP_EXPIRED(HttpStatus.UNPROCESSABLE_CONTENT, "Mã OTP đã hết hạn."),
    OTP_LOCKED(HttpStatus.LOCKED, "Nhập sai OTP quá nhiều lần. Giao dịch đã bị hủy."),
    TOO_SOON(HttpStatus.TOO_MANY_REQUESTS, "Vui lòng đợi trước khi thử lại."),
    BANK_REJECTED(HttpStatus.UNPROCESSABLE_CONTENT, "Ngân hàng từ chối giao dịch."),
    BANK_INSUFFICIENT(HttpStatus.UNPROCESSABLE_CONTENT, "Tài khoản ngân hàng không đủ số dư."),
    SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Đã có lỗi xảy ra. Vui lòng thử lại sau.");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus status() {
        return status;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
