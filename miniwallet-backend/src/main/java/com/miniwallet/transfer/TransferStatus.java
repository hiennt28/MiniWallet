package com.miniwallet.transfer;

public enum TransferStatus {
    /** Đã qua PIN, chờ nhập OTP. Tiền chưa bị trừ. */
    PENDING_OTP,
    COMPLETED,
    /** Nhập sai OTP quá số lần cho phép. */
    CANCELLED
}
