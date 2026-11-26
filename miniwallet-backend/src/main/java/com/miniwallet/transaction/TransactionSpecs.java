package com.miniwallet.transaction;

import java.time.Instant;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/**
 * Các điều kiện lọc giao dịch, ghép lại tùy theo tham số người dùng gửi lên.
 * Spring Data dịch thành một câu SQL duy nhất với đúng những điều kiện cần thiết.
 */
final class TransactionSpecs {

    private TransactionSpecs() {}

    static Specification<Transaction> inWallet(Long walletId) {
        return (root, query, cb) -> cb.equal(root.get("wallet").get("id"), walletId);
    }

    static Specification<Transaction> hasType(TransactionType type) {
        return (root, query, cb) -> cb.equal(root.get("type"), type);
    }

    static Specification<Transaction> hasCategory(Category category) {
        return (root, query, cb) -> cb.equal(root.get("category"), category);
    }

    static Specification<Transaction> createdFrom(Instant from) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    static Specification<Transaction> createdBefore(Instant to) {
        return (root, query, cb) -> cb.lessThan(root.get("createdAt"), to);
    }

    /**
     * {@code search_text LIKE '%' || f_unaccent(:q) || '%'}. Từ khóa cũng được bỏ dấu bằng chính hàm
     * của PostgreSQL, nên hai bên luôn chuẩn hóa giống nhau. Ký tự % và _ người dùng gõ được escape.
     */
    static Specification<Transaction> matchesText(String text) {
        String escaped = escapeLike(text.toLowerCase(Locale.ROOT));
        return (root, query, cb) -> cb.like(
                root.get("searchText"),
                cb.concat(cb.concat("%", cb.function("f_unaccent", String.class, cb.literal(escaped))), "%"),
                '\\');
    }

    static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
