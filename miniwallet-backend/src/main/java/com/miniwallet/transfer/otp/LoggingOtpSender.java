package com.miniwallet.transfer.otp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** "SMS giả lập": chỉ ghi log việc gửi, không ghi chính mã OTP ra log. */
@Component
public class LoggingOtpSender implements OtpSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingOtpSender.class);

    @Override
    public void send(String phone, String otp) {
        log.info("[SMS giả lập] Đã gửi mã OTP tới ******{}", phone.substring(phone.length() - 4));
    }
}
