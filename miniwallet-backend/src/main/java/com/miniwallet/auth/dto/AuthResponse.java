package com.miniwallet.auth.dto;

import com.miniwallet.auth.TokenService.TokenPair;
import com.miniwallet.user.User;
import com.miniwallet.user.UserResponse;

/**
 * @param expiresIn số giây access token còn hiệu lực; client nên gọi /refresh trước khi hết
 */
public record AuthResponse(String accessToken, String refreshToken, String tokenType, long expiresIn, UserResponse user) {

    public static AuthResponse of(TokenPair tokens, User user) {
        return new AuthResponse(tokens.accessToken(), tokens.refreshToken(), "Bearer",
                tokens.accessTokenExpiresIn(), UserResponse.from(user));
    }
}
