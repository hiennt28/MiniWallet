package com.miniwallet.transaction;

import com.miniwallet.wallet.Wallet;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Một dòng trong lịch sử giao dịch của ví. Đã ghi thì không sửa (không có setter). */
@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransactionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Category category;

    @Column(nullable = false, length = 100)
    private String title;

    /** Luôn dương; chiều tiền vào/ra nằm ở {@link #type}. */
    @Column(nullable = false)
    private long amount;

    @Column(name = "counterparty_phone", length = 10)
    private String counterpartyPhone;

    @Column(length = 100)
    private String note;

    @Column(name = "bank_account_masked", length = 20)
    private String bankAccountMasked;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /** Cột do PostgreSQL tự tính (xem V3__transaction_search.sql), chỉ dùng để lọc. */
    @Column(name = "search_text", insertable = false, updatable = false, length = 300)
    private String searchText;

    protected Transaction() {}

    private Transaction(Wallet wallet, Category category, String title, long amount, String note,
                        String counterpartyPhone, String bankAccountMasked, Instant createdAt) {
        if (amount <= 0) throw new IllegalArgumentException("amount must be > 0");
        this.wallet = wallet;
        this.type = category.type();
        this.category = category;
        this.title = title;
        this.amount = amount;
        this.note = note == null || note.isBlank() ? null : note;
        this.counterpartyPhone = counterpartyPhone;
        this.bankAccountMasked = bankAccountMasked;
        this.createdAt = createdAt;
    }

    public static Transaction record(Wallet wallet, Category category, String title, long amount, String note, Instant now) {
        return new Transaction(wallet, category, title, amount, note, null, null, now);
    }

    /** Giao dịch chuyển/nhận tiền với một người dùng khác. */
    public static Transaction withCounterparty(Wallet wallet, Category category, String title, long amount, String note,
                                               String counterpartyPhone, Instant now) {
        return new Transaction(wallet, category, title, amount, note, counterpartyPhone, null, now);
    }

    /** Giao dịch nạp/rút qua ngân hàng liên kết. Chỉ lưu số tài khoản đã che. */
    public static Transaction withBank(Wallet wallet, Category category, String title, long amount,
                                       String bankAccountMasked, Instant now) {
        return new Transaction(wallet, category, title, amount, null, null, bankAccountMasked, now);
    }

    public UUID getId() {
        return id;
    }

    public Wallet getWallet() {
        return wallet;
    }

    public TransactionType getType() {
        return type;
    }

    public Category getCategory() {
        return category;
    }

    public String getTitle() {
        return title;
    }

    public long getAmount() {
        return amount;
    }

    public String getCounterpartyPhone() {
        return counterpartyPhone;
    }

    public String getNote() {
        return note;
    }

    public String getBankAccountMasked() {
        return bankAccountMasked;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
