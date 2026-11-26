package com.miniwallet.common.validation;

public final class Strings {

    private Strings() {}

    /**
     * Chuỗi rỗng/toàn khoảng trắng thành null. Dùng trong constructor của DTO để một ô bỏ trống
     * chỉ nhận lỗi "Vui lòng nhập..." từ {@code @NotBlank}, không bị thêm lỗi định dạng
     * ({@code @Size}, {@code @Pattern}) mà thứ tự hiển thị lại không cố định.
     */
    public static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
