-- Người dùng, ví, giao dịch và refresh token.
-- Tiền lưu bằng BIGINT theo đơn vị đồng (VND không có phần lẻ), không dùng số thực để tránh sai số làm tròn.

CREATE TABLE users (
    id                  BIGSERIAL    PRIMARY KEY,
    phone               VARCHAR(10)  NOT NULL UNIQUE,
    name                VARCHAR(50)  NOT NULL,
    pin_hash            VARCHAR(100) NOT NULL,
    failed_pin_attempts INT          NOT NULL DEFAULT 0 CHECK (failed_pin_attempts >= 0),
    pin_locked_until    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL
);

-- Mỗi người dùng có đúng một ví. CHECK đảm bảo số dư không bao giờ âm, kể cả khi code có lỗi.
CREATE TABLE wallets (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    balance    BIGINT      NOT NULL CHECK (balance >= 0),
    frozen     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE transactions (
    id                  UUID         PRIMARY KEY,
    wallet_id           BIGINT       NOT NULL REFERENCES wallets (id) ON DELETE CASCADE,
    type                VARCHAR(10)  NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    category            VARCHAR(20)  NOT NULL CHECK (category IN (
                            'FOOD', 'SHOPPING', 'TRANSPORT', 'BILLS', 'ENTERTAINMENT',
                            'TRANSFER_OUT', 'TRANSFER_IN', 'SALARY', 'BONUS', 'TOPUP', 'WITHDRAW')),
    title               VARCHAR(100) NOT NULL,
    amount              BIGINT       NOT NULL CHECK (amount > 0),
    counterparty_phone  VARCHAR(10),
    note                VARCHAR(100),
    bank_account_masked VARCHAR(20),
    created_at          TIMESTAMPTZ  NOT NULL
);

-- Lịch sử giao dịch luôn đọc theo ví, mới nhất trước.
CREATE INDEX idx_transactions_wallet_created ON transactions (wallet_id, created_at DESC);

-- Chỉ lưu SHA-256 của refresh token: lộ database cũng không dùng được token.
CREATE TABLE refresh_tokens (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
