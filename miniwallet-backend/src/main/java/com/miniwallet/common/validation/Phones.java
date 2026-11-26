package com.miniwallet.common.validation;

/** Chuẩn hóa số điện thoại người dùng gõ ("0912 345 678", "0912.345.678") về dạng chỉ có chữ số. */
public final class Phones {

    private Phones() {}

    /** Trả về null nếu không có chữ số nào, để chỉ {@code @NotBlank} báo lỗi "vui lòng nhập". */
    public static String normalize(String raw) {
        if (raw == null) return null;
        String digits = raw.replaceAll("\\D", "");
        return digits.isEmpty() ? null : digits;
    }
}
