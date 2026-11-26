package com.miniwallet.config;

import com.miniwallet.transaction.Category;
import com.miniwallet.transaction.TransactionType;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * Query string dùng khóa viết thường giống frontend ({@code ?type=expense&category=transfer_out}).
     * Giá trị lạ ném IllegalArgumentException, GlobalExceptionHandler trả về lỗi VALIDATION.
     */
    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(String.class, Category.class, Category::fromKey);
        registry.addConverter(String.class, TransactionType.class, TransactionType::fromKey);
    }

    /**
     * Cho phép frontend (Vite dev server, Vercel) gọi API từ origin khác.
     * Spring Security dùng bean này (tên {@code corsConfigurationSource}) để trả lời preflight
     * trước khi kiểm tra đăng nhập.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") List<String> allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setMaxAge(Duration.ofHours(1));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    /**
     * Nguồn thời gian dùng chung. Service lấy giờ qua Clock thay vì gọi Instant.now() trực tiếp,
     * để test được các luật theo thời gian (OTP hết hạn, khóa PIN 5 phút) bằng Clock giả.
     */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
