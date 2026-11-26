package com.miniwallet.wallet.dto;

import com.miniwallet.user.UserResponse;
import java.util.List;

/**
 * Cùng hình dạng với {@code WalletInfo} của frontend.
 *
 * @param contacts người đã chuyển/nhận tiền gần đây, dùng để chọn nhanh người nhận
 */
public record WalletResponse(long balance, boolean frozen, UserResponse profile, List<ContactResponse> contacts) {}
