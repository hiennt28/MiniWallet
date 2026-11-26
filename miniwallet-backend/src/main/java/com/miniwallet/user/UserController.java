package com.miniwallet.user;

import com.miniwallet.common.error.ApiException;
import com.miniwallet.common.error.ErrorCode;
import com.miniwallet.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
@Tag(name = "Me", description = "Thông tin người đang đăng nhập")
public class UserController {

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping
    @Operation(summary = "Hồ sơ của người dùng hiện tại (dùng để khôi phục phiên khi tải lại trang)")
    public UserResponse me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return users.findById(principal.id())
                .map(UserResponse::from)
                // Token còn hạn nhưng tài khoản đã bị xóa
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
    }
}
