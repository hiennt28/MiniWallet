package com.miniwallet.auth;

import com.miniwallet.common.error.ApiException;
import com.miniwallet.common.error.ErrorCode;
import com.miniwallet.user.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cấp và thu hồi token.
 * <ul>
 *   <li>Access token: JWT ký HS256, sống ngắn, server không cần tra DB khi kiểm tra.</li>
 *   <li>Refresh token: chuỗi ngẫu nhiên, lưu mã băm trong DB nên thu hồi được (đăng xuất).
 *       Mỗi lần dùng sẽ bị hủy và thay bằng token mới (rotation).</li>
 * </ul>
 */
@Service
public class TokenService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JwtEncoder jwtEncoder;
    private final RefreshTokenRepository refreshTokens;
    private final AuthProperties props;
    private final Clock clock;

    public TokenService(JwtEncoder jwtEncoder, RefreshTokenRepository refreshTokens, AuthProperties props, Clock clock) {
        this.jwtEncoder = jwtEncoder;
        this.refreshTokens = refreshTokens;
        this.props = props;
        this.clock = clock;
    }

    public record TokenPair(String accessToken, long accessTokenExpiresIn, String refreshToken) {}

    @Transactional
    public TokenPair issue(User user) {
        Instant now = clock.instant();
        String refresh = randomToken();
        refreshTokens.save(new RefreshToken(user, sha256(refresh), now, now.plus(props.refreshTokenTtl())));
        return new TokenPair(accessToken(user, now), props.accessTokenTtl().toSeconds(), refresh);
    }

    /**
     * Đổi refresh token lấy cặp token mới.
     * Nếu token đã bị thu hồi mà vẫn được gửi lên, nhiều khả năng nó đã bị đánh cắp
     * (người dùng thật đã đổi sang token mới): thu hồi toàn bộ phiên của người đó.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public RotationResult rotate(String rawRefreshToken) {
        Instant now = clock.instant();
        RefreshToken current = refreshTokens.findByTokenHash(sha256(rawRefreshToken))
                .orElseThrow(TokenService::unauthorized);

        if (current.isRevoked()) {
            refreshTokens.revokeAllActive(current.getUser().getId(), now);
            throw unauthorized();
        }
        if (current.isExpired(now)) throw unauthorized();

        current.revoke(now);
        User user = current.getUser();
        return new RotationResult(user, issue(user));
    }

    public record RotationResult(User user, TokenPair tokens) {}

    /** Đăng xuất. Token không tồn tại hoặc đã thu hồi thì bỏ qua (gọi lại nhiều lần vẫn an toàn). */
    @Transactional
    public void revoke(String rawRefreshToken) {
        refreshTokens.findByTokenHash(sha256(rawRefreshToken)).ifPresent(t -> t.revoke(clock.instant()));
    }

    private String accessToken(User user, Instant now) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(props.issuer())
                .subject(user.getId().toString())
                .claim("phone", user.getPhone())
                .issuedAt(now)
                .expiresAt(now.plus(props.accessTokenTtl()))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    private static String randomToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 không khả dụng", e);
        }
    }

    private static ApiException unauthorized() {
        return new ApiException(ErrorCode.UNAUTHORIZED);
    }
}
