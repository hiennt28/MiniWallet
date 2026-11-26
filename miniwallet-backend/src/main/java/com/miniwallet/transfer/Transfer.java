package com.miniwallet.transfer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Một lệnh chuyển tiền. Luật OTP (hết hạn, gửi lại, đếm số lần sai) nằm trong entity.
 * Tham chiếu tới user/ví bằng id thay vì quan hệ JPA: lệnh chuyển không cần tải cả đối tượng ví,
 * và ví luôn được khóa riêng khi trừ/cộng tiền.
 */
@Entity
@Table(name = "transfers")
public class Transfer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "sender_user_id", nullable = false)
    private Long senderUserId;

    @Column(name = "sender_wallet_id", nullable = false)
    private Long senderWalletId;

    @Column(name = "receiver_wallet_id", nullable = false)
    private Long receiverWalletId;

    @Column(name = "receiver_phone", nullable = false, length = 10)
    private String receiverPhone;

    @Column(nullable = false)
    private long amount;

    @Column(length = 100)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransferStatus status;

    @Column(name = "otp_hash", length = 64)
    private String otpHash;

    @Column(name = "otp_sent_at")
    private Instant otpSentAt;

    @Column(name = "otp_expires_at")
    private Instant otpExpiresAt;

    @Column(name = "otp_attempts", nullable = false)
    private int otpAttempts;

    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;

    @Column(name = "transaction_id")
    private UUID transactionId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    protected Transfer() {}

    Transfer(Long senderUserId, Long senderWalletId, Long receiverWalletId, String receiverPhone,
             long amount, String note, String idempotencyKey, Instant now) {
        this.senderUserId = senderUserId;
        this.senderWalletId = senderWalletId;
        this.receiverWalletId = receiverWalletId;
        this.receiverPhone = receiverPhone;
        this.amount = amount;
        this.note = note;
        this.idempotencyKey = idempotencyKey;
        this.createdAt = now;
        this.status = TransferStatus.PENDING_OTP;
    }

    /** Gửi (hoặc gửi lại) OTP: mã mới, hạn mới, đếm lại số lần sai. */
    void issueOtp(String otpHash, Instant now) {
        this.otpHash = otpHash;
        this.otpSentAt = now;
        this.otpExpiresAt = now.plus(TransferPolicy.OTP_TTL);
        this.otpAttempts = 0;
    }

    boolean isOtpExpired(Instant now) {
        return otpExpiresAt == null || !now.isBefore(otpExpiresAt);
    }

    /** Được gửi lại khi đã qua 30 giây, hoặc mã cũ đã hết hạn. */
    boolean canResendOtp(Instant now) {
        return isOtpExpired(now) || !now.isBefore(otpSentAt.plus(TransferPolicy.OTP_RESEND_AFTER));
    }

    /**
     * Ghi nhận một lần nhập sai OTP. Hết lượt thì hủy lệnh.
     *
     * @return số lần thử còn lại (0 nghĩa là lệnh vừa bị hủy)
     */
    int recordWrongOtp() {
        otpAttempts++;
        int left = TransferPolicy.OTP_MAX_ATTEMPTS - otpAttempts;
        if (left <= 0) {
            status = TransferStatus.CANCELLED;
            return 0;
        }
        return left;
    }

    void complete(UUID senderTransactionId, Instant now) {
        this.status = TransferStatus.COMPLETED;
        this.transactionId = senderTransactionId;
        this.completedAt = now;
        this.otpHash = null;
    }

    /** Request gửi lại cùng Idempotency-Key phải có cùng nội dung. */
    boolean hasSameContent(String receiverPhone, long amount, String note) {
        return this.receiverPhone.equals(receiverPhone) && this.amount == amount && Objects.equals(this.note, note);
    }

    public UUID getId() {
        return id;
    }

    public Long getSenderUserId() {
        return senderUserId;
    }

    public Long getSenderWalletId() {
        return senderWalletId;
    }

    public Long getReceiverWalletId() {
        return receiverWalletId;
    }

    public String getReceiverPhone() {
        return receiverPhone;
    }

    public long getAmount() {
        return amount;
    }

    public String getNote() {
        return note;
    }

    public TransferStatus getStatus() {
        return status;
    }

    public String getOtpHash() {
        return otpHash;
    }

    public Instant getOtpSentAt() {
        return otpSentAt;
    }

    public Instant getOtpExpiresAt() {
        return otpExpiresAt;
    }

    public UUID getTransactionId() {
        return transactionId;
    }
}
