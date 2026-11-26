package com.miniwallet.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Pattern;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Số di động Việt Nam: 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.
 * Giá trị null hợp lệ (để {@code @NotBlank} báo lỗi "vui lòng nhập" riêng).
 */
@Documented
@Pattern(regexp = "^0[35789]\\d{8}$")
@ReportAsSingleViolation
@Constraint(validatedBy = {})
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface VietnamPhone {

    String message() default "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
