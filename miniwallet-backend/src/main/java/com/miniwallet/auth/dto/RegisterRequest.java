package com.miniwallet.auth.dto;

import com.miniwallet.common.validation.Phones;
import com.miniwallet.common.validation.Strings;
import com.miniwallet.common.validation.StrongPin;
import com.miniwallet.common.validation.VietnamPhone;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Vui lòng nhập họ tên.")
        @Size(min = 2, max = 50, message = "Họ tên từ 2 đến 50 ký tự.")
        String name,

        @NotBlank(message = "Vui lòng nhập số điện thoại.")
        @VietnamPhone
        String phone,

        @NotBlank(message = "Vui lòng tạo mã PIN.")
        @StrongPin
        String pin) {

    /** Chuẩn hóa trước khi validate: bỏ khoảng trắng thừa trong tên, bỏ dấu cách/chấm trong số điện thoại. */
    public RegisterRequest {
        name = Strings.blankToNull(name) == null ? null : name.strip().replaceAll("\\s+", " ");
        phone = Phones.normalize(phone);
        pin = Strings.blankToNull(pin);
    }
}
