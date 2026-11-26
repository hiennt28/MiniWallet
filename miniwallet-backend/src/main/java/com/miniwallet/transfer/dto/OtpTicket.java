package com.miniwallet.transfer.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Cùng hình dạng với {@code OtpTicket} của frontend (thời gian tính bằng mili giây epoch).
 *
 * @param otp chỉ có khi bật {@code app.transfer.expose-otp} (bản demo không có SMS thật,
 *            giao diện hiển thị mã dưới dạng "tin nhắn giả lập")
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OtpTicket(String transferId, String otp, long sentAt, long expiresAt) {}
