package com.miniwallet.user;

/** Hồ sơ trả về cho client. Không bao giờ chứa mã băm PIN hay trạng thái bảo mật nội bộ. */
public record UserResponse(String name, String phone) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getName(), user.getPhone());
    }
}
