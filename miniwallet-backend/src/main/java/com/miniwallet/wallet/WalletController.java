package com.miniwallet.wallet;

import com.miniwallet.common.security.AuthenticatedUser;
import com.miniwallet.common.validation.Strings;
import com.miniwallet.wallet.dto.WalletResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/wallet")
@Tag(name = "Wallet", description = "Ví của người dùng hiện tại")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    public record PinRequest(
            @NotBlank(message = "Vui lòng nhập mã PIN.")
            @Pattern(regexp = "^\\d{6}$", message = "Mã PIN gồm đúng 6 chữ số.")
            String pin) {

        public PinRequest {
            pin = Strings.blankToNull(pin);
        }
    }

    @GetMapping
    @Operation(summary = "Số dư, trạng thái khóa, hồ sơ và danh bạ gợi ý")
    public WalletResponse get(@AuthenticationPrincipal AuthenticatedUser user) {
        return walletService.getWallet(user.id());
    }

    @PostMapping("/freeze")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Khóa ví khẩn cấp (không cần PIN). Khi khóa, mọi giao dịch đều bị chặn")
    public void freeze(@AuthenticationPrincipal AuthenticatedUser user) {
        walletService.freeze(user.id());
    }

    @PostMapping("/unfreeze")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mở khóa ví (cần PIN)")
    public void unfreeze(@AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody PinRequest request) {
        walletService.unfreeze(user.id(), request.pin());
    }
}
