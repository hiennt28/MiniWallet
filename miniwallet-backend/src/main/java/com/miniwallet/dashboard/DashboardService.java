package com.miniwallet.dashboard;

import com.miniwallet.dashboard.DashboardResponse.MonthSummary;
import com.miniwallet.transaction.Category;
import com.miniwallet.transaction.TransactionRepository;
import com.miniwallet.transaction.TransactionType;
import com.miniwallet.transaction.dto.TransactionResponse;
import com.miniwallet.transaction.dto.TypeTotal;
import com.miniwallet.wallet.Wallet;
import com.miniwallet.wallet.WalletRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final List<Category> INTERNAL_CATEGORIES =
            Arrays.stream(Category.values()).filter(Category::isInternal).toList();

    private final WalletRepository wallets;
    private final TransactionRepository transactions;
    private final Clock clock;
    private final ZoneId zone;

    public DashboardService(WalletRepository wallets, TransactionRepository transactions, Clock clock,
                            @Value("${app.time-zone}") ZoneId zone) {
        this.wallets = wallets;
        this.transactions = transactions;
        this.clock = clock;
        this.zone = zone;
    }

    /**
     * Tổng quan một tháng. Tháng tính theo giờ Việt Nam: giao dịch lúc 23:30 ngày 31/10 giờ VN
     * (16:30 UTC) thuộc tháng 10, dù server chạy ở múi giờ nào.
     */
    public DashboardResponse getDashboard(Long userId, YearMonth month) {
        YearMonth target = month != null ? month : YearMonth.now(clock.withZone(zone));
        Instant from = target.atDay(1).atStartOfDay(zone).toInstant();
        Instant to = target.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant();

        Wallet wallet = wallets.getByUserId(userId);
        List<TypeTotal> totals = transactions.sumByType(wallet.getId(), from, to);

        return new DashboardResponse(
                wallet.getBalance(),
                new MonthSummary(total(totals, TransactionType.INCOME), total(totals, TransactionType.EXPENSE)),
                transactions.expenseByCategory(wallet.getId(), from, to, INTERNAL_CATEGORIES),
                transactions.findTop5ByWalletIdOrderByCreatedAtDescIdDesc(wallet.getId()).stream()
                        .map(TransactionResponse::from)
                        .toList());
    }

    private static long total(List<TypeTotal> totals, TransactionType type) {
        return totals.stream().filter(t -> t.type() == type).mapToLong(TypeTotal::total).sum();
    }
}
