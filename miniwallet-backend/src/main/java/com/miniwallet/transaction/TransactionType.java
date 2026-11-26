package com.miniwallet.transaction;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

public enum TransactionType {
    INCOME,
    EXPENSE;

    /** JSON và query string dùng {@code income} / {@code expense} giống frontend. */
    @JsonValue
    public String key() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static TransactionType fromKey(String key) {
        return valueOf(key.trim().toUpperCase(Locale.ROOT));
    }
}
