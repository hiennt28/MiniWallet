package com.miniwallet.dashboard;

import com.miniwallet.transaction.dto.CategoryTotal;
import com.miniwallet.transaction.dto.TransactionResponse;
import java.util.List;

/** Cùng hình dạng với {@code DashboardData} của frontend. */
public record DashboardResponse(
        long balance,
        MonthSummary month,
        List<CategoryTotal> byCategory,
        List<TransactionResponse> recent) {

    /** Tổng tiền vào / tiền ra trong tháng (tiền ra gồm cả rút về ngân hàng). */
    public record MonthSummary(long income, long expense) {}
}
