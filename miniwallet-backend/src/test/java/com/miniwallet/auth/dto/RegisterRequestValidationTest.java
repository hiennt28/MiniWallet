package com.miniwallet.auth.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import jakarta.validation.ValidatorFactory;

class RegisterRequestValidationTest {

    static ValidatorFactory factory;
    static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    private Map<String, String> errors(RegisterRequest request) {
        return validator.validate(request).stream()
                .collect(Collectors.toMap(v -> v.getPropertyPath().toString(), ConstraintViolation::getMessage, (a, b) -> a));
    }

    @Test
    void normalizesNameAndPhone() {
        RegisterRequest request = new RegisterRequest("  Nguyễn   Văn  An ", "0912 345.678", "147258");
        assertThat(request.name()).isEqualTo("Nguyễn Văn An");
        assertThat(request.phone()).isEqualTo("0912345678");
        assertThat(errors(request)).isEmpty();
    }

    @Test
    void reportsEachInvalidField() {
        Map<String, String> errors = errors(new RegisterRequest("A", "0123456789", "12a456"));
        assertThat(errors).containsOnlyKeys("name", "phone", "pin");
        assertThat(errors.get("phone")).startsWith("Số điện thoại không hợp lệ");
        assertThat(errors.get("pin")).isEqualTo("Mã PIN gồm đúng 6 chữ số.");
    }

    @Test
    void blankFieldsAskUserToFillIn() {
        Map<String, String> errors = errors(new RegisterRequest(" ", null, null));
        assertThat(errors.get("name")).isEqualTo("Vui lòng nhập họ tên.");
        assertThat(errors.get("phone")).isEqualTo("Vui lòng nhập số điện thoại.");
        assertThat(errors.get("pin")).isEqualTo("Vui lòng tạo mã PIN.");
    }

    @ParameterizedTest
    @ValueSource(strings = {"111111", "000000", "123456", "987654", "456789"})
    void rejectsWeakPins(String pin) {
        assertThat(errors(new RegisterRequest("Nguyễn Văn An", "0912345678", pin)).get("pin"))
                .startsWith("Mã PIN quá dễ đoán");
    }

    @ParameterizedTest
    @ValueSource(strings = {"147258", "121212", "135790", "102938"})
    void acceptsReasonablePins(String pin) {
        assertThat(errors(new RegisterRequest("Nguyễn Văn An", "0912345678", pin))).isEmpty();
    }
}
