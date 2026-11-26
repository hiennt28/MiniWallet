package com.miniwallet.common;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

/**
 * Một trang kết quả. {@code page} đánh số từ 1 (Spring Data đánh số từ 0),
 * cùng hình dạng với {@code Page<T>} của frontend.
 */
public record PageResponse<T>(List<T> items, int page, int pageSize, int totalPages, long total) {

    public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber() + 1,
                page.getSize(),
                Math.max(1, page.getTotalPages()),
                page.getTotalElements());
    }
}
