package com.miniwallet.common.security;

/**
 * Người dùng của request hiện tại, lấy từ JWT đã kiểm tra chữ ký.
 * Controller nhận qua {@code @AuthenticationPrincipal AuthenticatedUser user}.
 */
public record AuthenticatedUser(Long id, String phone) {}
