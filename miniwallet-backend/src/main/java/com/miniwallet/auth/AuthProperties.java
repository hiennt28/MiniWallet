package com.miniwallet.auth;

import java.time.Duration;
import java.util.Base64;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cấu hình đăng nhập ({@code app.auth.*}).
 *
 * @param jwtSecret       khóa ký JWT (HS256), mã hóa Base64, tối thiểu 32 byte
 * @param accessTokenTtl  thời hạn access token
 * @param refreshTokenTtl thời hạn refresh token; mỗi lần refresh được cấp token mới,
 *                        nên đây chính là thời gian "không thao tác thì phải đăng nhập lại"
 * @param issuer          giá trị claim {@code iss}
 */
@ConfigurationProperties("app.auth")
public record AuthProperties(String jwtSecret, Duration accessTokenTtl, Duration refreshTokenTtl, String issuer) {

    public AuthProperties {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("Chưa cấu hình JWT_SECRET (xem miniwallet-backend/.env.example).");
        }
        if (Base64.getDecoder().decode(jwtSecret).length < 32) {
            throw new IllegalStateException("JWT_SECRET phải dài tối thiểu 32 byte (256 bit) sau khi giải mã Base64.");
        }
    }

    public byte[] jwtSecretBytes() {
        return Base64.getDecoder().decode(jwtSecret);
    }
}
