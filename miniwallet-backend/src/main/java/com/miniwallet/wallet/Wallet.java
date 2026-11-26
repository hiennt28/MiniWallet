package com.miniwallet.wallet;

import com.miniwallet.common.error.ApiException;
import com.miniwallet.common.error.ErrorCode;
import com.miniwallet.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/** Ví của một người dùng. Số dư chỉ thay đổi qua {@link #credit} và {@link #debit}. */
@Entity
@Table(name = "wallets")
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /** Đơn vị: đồng. */
    @Column(nullable = false)
    private long balance;

    @Column(nullable = false)
    private boolean frozen;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Wallet() {}

    private Wallet(User user, long balance, Instant createdAt) {
        this.user = user;
        this.balance = balance;
        this.createdAt = createdAt;
    }

    public static Wallet open(User user, long initialBalance, Instant now) {
        if (initialBalance < 0) throw new IllegalArgumentException("initialBalance must be >= 0");
        return new Wallet(user, initialBalance, now);
    }

    public void credit(long amount) {
        requirePositive(amount);
        balance = Math.addExact(balance, amount);
    }

    public void debit(long amount) {
        requirePositive(amount);
        if (amount > balance) throw new ApiException(ErrorCode.INSUFFICIENT_BALANCE);
        balance -= amount;
    }

    /** Khóa khẩn cấp: gọi lại khi đã khóa cũng không sao. */
    public void freeze() {
        frozen = true;
    }

    public void unfreeze() {
        frozen = false;
    }

    /** Gọi trước mọi giao dịch làm thay đổi số dư (chuyển, nạp, rút). */
    public void ensureNotFrozen() {
        if (frozen) throw new ApiException(ErrorCode.WALLET_FROZEN);
    }

    private static void requirePositive(long amount) {
        if (amount <= 0) throw new IllegalArgumentException("amount must be > 0");
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public long getBalance() {
        return balance;
    }

    public boolean isFrozen() {
        return frozen;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
