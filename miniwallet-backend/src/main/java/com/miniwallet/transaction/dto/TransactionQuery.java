package com.miniwallet.transaction.dto;

import com.miniwallet.transaction.Category;
import com.miniwallet.transaction.TransactionType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;

/**
 * Tham số lọc lịch sử giao dịch, đọc từ query string:
 * {@code /api/transactions?q=ca phe&type=expense&category=food&from=2026-11-01&to=2026-11-30&page=1&pageSize=10}.
 * Bỏ trống tham số nào thì không lọc theo tham số đó.
 */
public record TransactionQuery(
        @Schema(description = "Tìm không phân biệt dấu trong tiêu đề, lời nhắn, số điện thoại")
        @Size(max = 100, message = "Từ khóa tối đa 100 ký tự.")
        String q,

        TransactionType type,

        Category category,

        @Schema(description = "Từ ngày (giờ Việt Nam), dạng yyyy-MM-dd")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate from,

        @Schema(description = "Đến hết ngày (giờ Việt Nam), dạng yyyy-MM-dd")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate to,

        @Min(value = 1, message = "Trang bắt đầu từ 1.")
        Integer page,

        @Min(value = 1, message = "Mỗi trang tối thiểu 1 giao dịch.")
        @Max(value = 50, message = "Mỗi trang tối đa 50 giao dịch.")
        Integer pageSize) {

    public static final int DEFAULT_PAGE_SIZE = 10;

    public TransactionQuery {
        q = q == null || q.isBlank() ? null : q.strip();
        if (page == null) page = 1;
        if (pageSize == null) pageSize = DEFAULT_PAGE_SIZE;
    }

    @AssertTrue(message = "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")
    @Schema(hidden = true)
    public boolean isDateRangeValid() {
        return from == null || to == null || !from.isAfter(to);
    }
}
