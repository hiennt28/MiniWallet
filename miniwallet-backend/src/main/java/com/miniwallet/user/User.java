package com.miniwallet.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;

/**
 * Người dùng ví. Luật khóa PIN nằm ngay trong entity (rich domain model):
 * sai {@value #MAX_PIN_ATTEMPTS} lần liên tiếp thì khóa {@link #PIN_LOCK_DURATION}.
 */
@Entity
@Table(name = "users")
public class User {

    public static final int MAX_PIN_ATTEMPTS = 5;
    public static final Duration PIN_LOCK_DURATION = Duration.ofMinutes(5);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String phone;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "pin_hash", nullable = false, length = 100)
    private String pinHash;

    @Column(name = "failed_pin_attempts", nullable = false)
    private int failedPinAttempts;

    @Column(name = "pin_locked_until")
    private Instant pinLockedUntil;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /** Dành cho JPA. */
    protected User() {}

    private User(String name, String phone, String pinHash, Instant createdAt) {
        this.name = name;
        this.phone = phone;
        this.pinHash = pinHash;
        this.createdAt = createdAt;
    }

    public static User register(String name, String phone, String pinHash, Instant now) {
        return new User(name, phone, pinHash, now);
    }

    public boolean isPinLocked(Instant now) {
        return pinLockedUntil != null && now.isBefore(pinLockedUntil);
    }

    /** Số phút còn bị khóa, làm tròn lên để hiển thị ("thử lại sau 3 phút"). */
    public long pinLockMinutesLeft(Instant now) {
        if (!isPinLocked(now)) return 0;
        long seconds = Duration.between(now, pinLockedUntil).toSeconds();
        return Math.max(1, (seconds + 59) / 60);
    }

    /**
     * Ghi nhận một lần nhập sai PIN.
     *
     * @return {@code true} nếu lần sai này làm tài khoản bị khóa
     */
    public boolean recordPinFailure(Instant now) {
        // Khóa cũ đã hết hạn thì đếm lại từ đầu
        if (pinLockedUntil != null && !now.isBefore(pinLockedUntil)) {
            failedPinAttempts = 0;
            pinLockedUntil = null;
        }
        failedPinAttempts++;
        if (failedPinAttempts >= MAX_PIN_ATTEMPTS) {
            failedPinAttempts = 0;
            pinLockedUntil = now.plus(PIN_LOCK_DURATION);
            return true;
        }
        return false;
    }

    public void recordPinSuccess() {
        failedPinAttempts = 0;
        pinLockedUntil = null;
    }

    public int pinAttemptsLeft() {
        return MAX_PIN_ATTEMPTS - failedPinAttempts;
    }

    public Long getId() {
        return id;
    }

    public String getPhone() {
        return phone;
    }

    public String getName() {
        return name;
    }

    public String getPinHash() {
        return pinHash;
    }

    public int getFailedPinAttempts() {
        return failedPinAttempts;
    }

    public Instant getPinLockedUntil() {
        return pinLockedUntil;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
