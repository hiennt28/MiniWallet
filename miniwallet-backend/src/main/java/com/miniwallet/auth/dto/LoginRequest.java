package com.miniwallet.auth.dto;

import com.miniwallet.common.validation.Phones;
import com.miniwallet.common.validation.Strings;
import com.miniwallet.common.validation.VietnamPhone;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LoginRequest(
        @NotBlank(message = "Vui lòng nhập số điện thoại.")
        @VietnamPhone
        String phone,

        @NotBlank(message = "Vui lòng nhập mã PIN.")
        @Pattern(regexp = "^\\d{6}$", message = "Mã PIN gồm đúng 6 chữ số.")
        String pin) {

    public LoginRequest {
        phone = Phones.normalize(phone);
        pin = Strings.blankToNull(pin);
    }
}
