package com.miniwallet.transfer.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.miniwallet.transaction.dto.TransactionResponse;

/**
 * Kết quả bước 1, cùng hình dạng với {@code CreateTransferResult} của frontend:
 * <ul>
 *   <li>{@code {"status": "completed", "tx": {...}}}: khoản nhỏ, đã chuyển xong</li>
 *   <li>{@code {"status": "otp_required", "ticket": {...}}}: khoản lớn, cần gọi /confirm với OTP</li>
 * </ul>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TransferResult(String status, TransactionResponse tx, OtpTicket ticket) {

    public static TransferResult completed(TransactionResponse tx) {
        return new TransferResult("completed", tx, null);
    }

    public static TransferResult otpRequired(OtpTicket ticket) {
        return new TransferResult("otp_required", null, ticket);
    }
}
