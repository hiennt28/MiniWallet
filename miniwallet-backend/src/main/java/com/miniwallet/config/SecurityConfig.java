package com.miniwallet.config;

import com.miniwallet.auth.AuthProperties;
import com.miniwallet.common.security.AuthenticatedUser;
import com.miniwallet.common.security.JsonAuthenticationEntryPoint;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.time.Clock;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * API không dùng session hay cookie: mỗi request tự mang access token trong header
 * {@code Authorization: Bearer ...}. Vì không có cookie nên không cần chống CSRF.
 */
@Configuration
public class SecurityConfig {

    private static final String[] PUBLIC_POST = {
        "/api/auth/register", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout",
    };

    private static final String[] PUBLIC_DOCS = {
        "/actuator/health", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/error",
    };

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JsonAuthenticationEntryPoint entryPoint) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, PUBLIC_POST).permitAll()
                        .requestMatchers(PUBLIC_DOCS).permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(rs -> rs
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(SecurityConfig::toAuthentication))
                        .authenticationEntryPoint(entryPoint))
                .exceptionHandling(e -> e.authenticationEntryPoint(entryPoint));
        return http.build();
    }

    /** Chuyển JWT đã kiểm tra thành principal gọn, để controller không phải đọc claim thủ công. */
    private static AbstractAuthenticationToken toAuthentication(Jwt jwt) {
        AuthenticatedUser user = new AuthenticatedUser(Long.valueOf(jwt.getSubject()), jwt.getClaimAsString("phone"));
        return new UsernamePasswordAuthenticationToken(user, jwt, List.of());
    }

    /** BCrypt tự sinh salt riêng cho từng mã PIN và cố tình chạy chậm để chống dò PIN offline. */
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    JwtEncoder jwtEncoder(AuthProperties props) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey(props)));
    }

    @Bean
    JwtDecoder jwtDecoder(AuthProperties props, Clock clock) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey(props))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        // Dùng chung Clock với phần còn lại của ứng dụng để test được trường hợp token hết hạn
        JwtTimestampValidator timestamps = new JwtTimestampValidator();
        timestamps.setClock(clock);
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(timestamps, new JwtIssuerValidator(props.issuer())));
        return decoder;
    }

    private static SecretKey secretKey(AuthProperties props) {
        return new SecretKeySpec(props.jwtSecretBytes(), "HmacSHA256");
    }
}
