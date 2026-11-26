package com.miniwallet.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Thông tin hiển thị trên Swagger UI (/swagger-ui.html). Nút "Authorize" nhận access token. */
@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI miniWalletOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("MiniWallet API")
                        .version("v1")
                        .description("REST API cho ví điện tử MiniWallet: đăng nhập bằng PIN, chuyển tiền có OTP, nạp/rút, ngân sách."))
                .components(new Components().addSecuritySchemes(BEARER, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER));
    }
}
