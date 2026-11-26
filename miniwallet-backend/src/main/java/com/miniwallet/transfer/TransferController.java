package com.miniwallet.transfer;

import com.miniwallet.common.security.AuthenticatedUser;
import com.miniwallet.transaction.dto.TransactionResponse;
import com.miniwallet.transfer.dto.ConfirmTransferRequest;
import com.miniwallet.transfer.dto.CreateTransferRequest;
import com.miniwallet.transfer.dto.OtpTicket;
import com.miniwallet.transfer.dto.TransferResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transfers")
@Tag(name = "Transfers", description = "Chuyển tiền: PIN, rồi OTP với khoản từ 5.000.000 ₫")
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Bước 1: tạo lệnh chuyển (cần PIN). Dưới 5 triệu thì chuyển luôn, từ 5 triệu thì trả về OTP ticket")
    public TransferResult create(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Parameter(description = "Chuỗi ngẫu nhiên do client tạo cho mỗi lần bấm \"Chuyển\". Gửi lại cùng key thì không bị chuyển 2 lần")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateTransferRequest request) {
        return transferService.create(user, request, idempotencyKey);
    }

    @PostMapping("/{id}/confirm")
    @Operation(summary = "Bước 2: xác nhận bằng OTP. Sai 3 lần thì lệnh bị hủy")
    public TransactionResponse confirm(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id,
                                       @Valid @RequestBody ConfirmTransferRequest request) {
        return transferService.confirm(user.id(), id, request.otp());
    }

    @PostMapping("/{id}/otp/resend")
    @Operation(summary = "Gửi lại OTP (sau 30 giây, hoặc khi mã cũ đã hết hạn)")
    public OtpTicket resendOtp(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id) {
        return transferService.resendOtp(user, id);
    }
}
