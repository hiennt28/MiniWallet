package com.miniwallet.transaction;

import com.miniwallet.common.PageResponse;
import com.miniwallet.common.error.ApiException;
import com.miniwallet.common.error.ErrorCode;
import com.miniwallet.transaction.dto.TransactionQuery;
import com.miniwallet.transaction.dto.TransactionResponse;
import com.miniwallet.wallet.Wallet;
import com.miniwallet.wallet.WalletRepository;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class TransactionService {

    /** Mới nhất trước; id để thứ tự ổn định khi hai giao dịch cùng thời điểm (phân trang không lặp/sót). */
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final TransactionRepository transactions;
    private final WalletRepository wallets;
    private final ZoneId zone;

    public TransactionService(TransactionRepository transactions, WalletRepository wallets,
                              @Value("${app.time-zone}") ZoneId zone) {
        this.transactions = transactions;
        this.wallets = wallets;
        this.zone = zone;
    }

    public PageResponse<TransactionResponse> search(Long userId, TransactionQuery query) {
        Wallet wallet = wallets.getByUserId(userId);
        Specification<Transaction> spec = toSpecification(wallet.getId(), query);

        Page<Transaction> page = transactions.findAll(spec, PageRequest.of(query.page() - 1, query.pageSize(), NEWEST_FIRST));
        // Trang yêu cầu vượt quá số trang (ví dụ link cũ sau khi đổi bộ lọc): trả về trang cuối như frontend
        if (page.isEmpty() && page.getTotalPages() > 0 && query.page() > page.getTotalPages()) {
            page = transactions.findAll(spec, PageRequest.of(page.getTotalPages() - 1, query.pageSize(), NEWEST_FIRST));
        }
        return PageResponse.from(page, TransactionResponse::from);
    }

    public TransactionResponse get(Long userId, UUID id) {
        Wallet wallet = wallets.getByUserId(userId);
        // Giao dịch của người khác cũng trả 404 (không phải 403), để không lộ id nào tồn tại
        return transactions.findByIdAndWalletId(id, wallet.getId())
                .map(TransactionResponse::from)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy giao dịch."));
    }

    private Specification<Transaction> toSpecification(Long walletId, TransactionQuery query) {
        List<Specification<Transaction>> specs = new ArrayList<>();
        specs.add(TransactionSpecs.inWallet(walletId));
        if (query.type() != null) specs.add(TransactionSpecs.hasType(query.type()));
        if (query.category() != null) specs.add(TransactionSpecs.hasCategory(query.category()));
        // Ngày người dùng chọn là ngày theo giờ Việt Nam: "đến 30/11" nghĩa là trước 00:00 ngày 1/12 giờ VN
        if (query.from() != null) specs.add(TransactionSpecs.createdFrom(query.from().atStartOfDay(zone).toInstant()));
        if (query.to() != null) specs.add(TransactionSpecs.createdBefore(query.to().plusDays(1).atStartOfDay(zone).toInstant()));
        if (query.q() != null) specs.add(TransactionSpecs.matchesText(query.q()));
        return Specification.allOf(specs);
    }
}
