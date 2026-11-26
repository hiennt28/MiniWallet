package com.miniwallet.transfer.dto;

import com.miniwallet.common.validation.Phones;
import com.miniwallet.common.validation.Strings;
import com.miniwallet.common.validation.VietnamPhone;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Bước 1 của chuyển tiền. Hạn mức khớp {@link com.miniwallet.transfer.TransferPolicy}. */
public record CreateTransferRequest(
        @NotBlank(message = "Vui lòng nhập số điện thoại người nhận.")
        @VietnamPhone
        String phone,

        @NotNull(message = "Vui lòng nhập số tiền.")
        @Min(value = 10_000, message = "Số tiền tối thiểu là 10.000 ₫.")
        @Max(value = 50_000_000, message = "Mỗi lần chuyển tối đa 50.000.000 ₫.")
        Long amount,

        @Size(max = 100, message = "Lời nhắn tối đa 100 ký tự.")
        String note,

        @NotBlank(message = "Vui lòng nhập mã PIN.")
        @Pattern(regexp = "^\\d{6}$", message = "Mã PIN gồm đúng 6 chữ số.")
        String pin) {

    public CreateTransferRequest {
        phone = Phones.normalize(phone);
        note = Strings.blankToNull(note) == null ? null : note.strip();
        pin = Strings.blankToNull(pin);
    }
}
