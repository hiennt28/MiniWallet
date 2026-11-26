package com.miniwallet.transfer;

import java.time.Duration;

/** Hạn mức và luật OTP của chuyển tiền. Cùng giá trị với {@code TRANSFER_LIMITS} của frontend. */
public final class TransferPolicy {

    private TransferPolicy() {}

    public static final long MIN_AMOUNT = 10_000;
    public static final long MAX_AMOUNT = 50_000_000;
    public static final int NOTE_MAX_LENGTH = 100;

    /** Từ mức này trở lên phải nhập thêm OTP sau PIN. */
    public static final long OTP_THRESHOLD = 5_000_000;
    public static final Duration OTP_TTL = Duration.ofMinutes(2);
    public static final Duration OTP_RESEND_AFTER = Duration.ofSeconds(30);
    public static final int OTP_MAX_ATTEMPTS = 3;

    public static boolean requiresOtp(long amount) {
        return amount >= OTP_THRESHOLD;
    }
}
