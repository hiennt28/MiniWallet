package com.miniwallet.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class StrongPinValidator implements ConstraintValidator<StrongPin, String> {

    static final String WEAK_MESSAGE =
            "Mã PIN quá dễ đoán. Không dùng 6 số giống nhau hoặc dãy số liên tiếp.";

    @Override
    public boolean isValid(String pin, ConstraintValidatorContext context) {
        if (pin == null) return true; // @NotBlank lo trường hợp bỏ trống
        if (!pin.matches("\\d{6}")) return false; // dùng message mặc định của annotation
        if (isWeak(pin)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(WEAK_MESSAGE).addConstraintViolation();
            return false;
        }
        return true;
    }

    /** 6 số giống nhau, hoặc dãy tăng/giảm đều từng 1 đơn vị. Cùng luật với frontend. */
    static boolean isWeak(String pin) {
        int step = pin.charAt(1) - pin.charAt(0);
        if (step != 0 && step != 1 && step != -1) return false;
        for (int i = 2; i < pin.length(); i++) {
            if (pin.charAt(i) - pin.charAt(i - 1) != step) return false;
        }
        return true;
    }
}
