-- Lệnh chuyển tiền giữa hai ví. Khoản nhỏ hoàn tất ngay (COMPLETED); khoản lớn chờ OTP (PENDING_OTP).
CREATE TABLE transfers (
    id                 UUID         PRIMARY KEY,
    sender_user_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    sender_wallet_id   BIGINT       NOT NULL REFERENCES wallets (id) ON DELETE CASCADE,
    receiver_wallet_id BIGINT       NOT NULL REFERENCES wallets (id) ON DELETE CASCADE,
    receiver_phone     VARCHAR(10)  NOT NULL,
    amount             BIGINT       NOT NULL CHECK (amount > 0),
    note               VARCHAR(100),
    status             VARCHAR(20)  NOT NULL CHECK (status IN ('PENDING_OTP', 'COMPLETED', 'CANCELLED')),
    -- OTP chỉ lưu mã băm; giới hạn 3 lần thử + hạn 2 phút mới là lớp bảo vệ chính
    otp_hash           VARCHAR(64),
    otp_sent_at        TIMESTAMPTZ,
    otp_expires_at     TIMESTAMPTZ,
    otp_attempts       INT          NOT NULL DEFAULT 0,
    -- Client gửi kèm header Idempotency-Key: gửi lại cùng key (mạng chập chờn, bấm 2 lần) không bị trừ tiền 2 lần
    idempotency_key    VARCHAR(64),
    -- Giao dịch "Chuyển tiền" bên người gửi, để trả lại đúng kết quả khi request bị gửi lặp
    transaction_id     UUID         REFERENCES transactions (id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ  NOT NULL,
    completed_at       TIMESTAMPTZ,
    -- NULL không trùng nhau trong UNIQUE, nên lệnh không có key vẫn tạo bình thường
    CONSTRAINT uq_transfers_idempotency UNIQUE (sender_user_id, idempotency_key)
);
