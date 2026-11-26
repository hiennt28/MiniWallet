package com.miniwallet.transaction;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/**
 * Danh mục giao dịch. Mỗi danh mục gắn sẵn với loại tiền vào/ra,
 * nên không thể tạo giao dịch "Lương" mà lại là tiền ra.
 * Trong JSON và query string dùng khóa viết thường giống frontend ({@code transfer_out}).
 */
public enum Category {
    FOOD(TransactionType.EXPENSE, false),
    SHOPPING(TransactionType.EXPENSE, false),
    TRANSPORT(TransactionType.EXPENSE, false),
    BILLS(TransactionType.EXPENSE, false),
    ENTERTAINMENT(TransactionType.EXPENSE, false),
    TRANSFER_OUT(TransactionType.EXPENSE, false),
    TRANSFER_IN(TransactionType.INCOME, false),
    SALARY(TransactionType.INCOME, false),
    BONUS(TransactionType.INCOME, false),
    /** Nạp từ ngân hàng của chính mình. */
    TOPUP(TransactionType.INCOME, true),
    /** Rút về ngân hàng của chính mình: là tiền ra nhưng không tính là chi tiêu. */
    WITHDRAW(TransactionType.EXPENSE, true);

    private final TransactionType type;
    private final boolean internal;

    Category(TransactionType type, boolean internal) {
        this.type = type;
        this.internal = internal;
    }

    public TransactionType type() {
        return type;
    }

    /** Tiền chuyển giữa ví và ngân hàng của chính mình: không tính vào thống kê chi tiêu. */
    public boolean isInternal() {
        return internal;
    }

    @JsonValue
    public String key() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static Category fromKey(String key) {
        return valueOf(key.trim().toUpperCase(Locale.ROOT));
    }
}
