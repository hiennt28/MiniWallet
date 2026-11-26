package com.miniwallet.transaction;

import com.miniwallet.transaction.dto.CategoryTotal;
import com.miniwallet.transaction.dto.TypeTotal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository extends JpaRepository<Transaction, UUID>, JpaSpecificationExecutor<Transaction> {

    /** Tìm theo id nhưng chỉ trong ví của người hỏi, để không xem được giao dịch của người khác. */
    Optional<Transaction> findByIdAndWalletId(UUID id, Long walletId);

    List<Transaction> findTop5ByWalletIdOrderByCreatedAtDescIdDesc(Long walletId);

    /** Tổng tiền vào / tiền ra trong khoảng thời gian, tính bằng một câu GROUP BY. */
    @Query("""
            select new com.miniwallet.transaction.dto.TypeTotal(t.type, sum(t.amount))
            from Transaction t
            where t.wallet.id = :walletId and t.createdAt >= :from and t.createdAt < :to
            group by t.type
            """)
    List<TypeTotal> sumByType(@Param("walletId") Long walletId, @Param("from") Instant from, @Param("to") Instant to);

    /** Chi tiêu theo danh mục, nhiều nhất trước. Bỏ qua tiền chuyển nội bộ (rút về ngân hàng của mình). */
    @Query("""
            select new com.miniwallet.transaction.dto.CategoryTotal(t.category, sum(t.amount))
            from Transaction t
            where t.wallet.id = :walletId and t.createdAt >= :from and t.createdAt < :to
              and t.type = com.miniwallet.transaction.TransactionType.EXPENSE
              and t.category not in :excluded
            group by t.category
            order by sum(t.amount) desc
            """)
    List<CategoryTotal> expenseByCategory(@Param("walletId") Long walletId, @Param("from") Instant from,
                                          @Param("to") Instant to, @Param("excluded") List<Category> excluded);

    interface ContactView {
        String getName();

        String getPhone();
    }

    /** Danh bạ gợi ý: những người đã chuyển/nhận tiền gần đây nhất, lấy tên từ bảng users. */
    @Query(nativeQuery = true, value = """
            SELECT u.name AS name, t.counterparty_phone AS phone
            FROM transactions t
            JOIN users u ON u.phone = t.counterparty_phone
            WHERE t.wallet_id = :walletId AND t.category IN ('TRANSFER_OUT', 'TRANSFER_IN')
            GROUP BY u.name, t.counterparty_phone
            ORDER BY max(t.created_at) DESC
            LIMIT :limit
            """)
    List<ContactView> recentContacts(@Param("walletId") Long walletId, @Param("limit") int limit);
}
