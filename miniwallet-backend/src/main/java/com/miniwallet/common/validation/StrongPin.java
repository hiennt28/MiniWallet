package com.miniwallet.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Mã PIN khi tạo mới: đúng 6 chữ số và không dễ đoán (111111, 123456, 987654...). */
@Documented
@Constraint(validatedBy = StrongPinValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPin {

    String message() default "Mã PIN gồm đúng 6 chữ số.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
