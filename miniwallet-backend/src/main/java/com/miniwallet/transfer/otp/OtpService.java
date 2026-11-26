package com.miniwallet.transfer.otp;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Sinh, băm và so khớp mã OTP 6 số. */
@Service
public class OtpService {

    private final SecureRandom random = new SecureRandom();
    private final OtpSender sender;

    public OtpService(OtpSender sender) {
        this.sender = sender;
    }

    public String generate() {
        return String.format("%06d", random.nextInt(1_000_000));
    }

    public void send(String phone, String otp) {
        sender.send(phone, otp);
    }

    /** Gắn id lệnh chuyển vào trước khi băm, để cùng một mã ở hai lệnh khác nhau cho ra hai mã băm khác nhau. */
    public String hash(UUID transferId, String otp) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((transferId + ":" + otp).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** So sánh thời gian hằng định, không để lộ "đúng được mấy ký tự đầu" qua thời gian phản hồi. */
    public boolean matches(UUID transferId, String otp, String expectedHash) {
        if (otp == null || expectedHash == null) return false;
        return MessageDigest.isEqual(
                hash(transferId, otp).getBytes(StandardCharsets.US_ASCII),
                expectedHash.getBytes(StandardCharsets.US_ASCII));
    }
}
