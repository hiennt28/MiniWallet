package com.miniwallet.transfer.otp;

/**
 * Kênh gửi OTP tới người dùng. Bản hiện tại chỉ ghi log (xem {@link LoggingOtpSender});
 * muốn gửi SMS thật thì viết thêm một implementation gọi nhà mạng, không phải sửa logic chuyển tiền.
 */
public interface OtpSender {

    void send(String phone, String otp);
}
