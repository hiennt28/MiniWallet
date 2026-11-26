package com.miniwallet.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(@NotBlank(message = "Thiếu refresh token.") String refreshToken) {}
