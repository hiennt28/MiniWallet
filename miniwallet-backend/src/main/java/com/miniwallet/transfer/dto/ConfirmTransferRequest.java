package com.miniwallet.transfer.dto;

import com.miniwallet.common.validation.Strings;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ConfirmTransferRequest(
        @NotBlank(message = "Vui lòng nhập mã OTP.")
        @Pattern(regexp = "^\\d{6}$", message = "Mã OTP gồm đúng 6 chữ số.")
        String otp) {

    public ConfirmTransferRequest {
        otp = Strings.blankToNull(otp);
    }
}
