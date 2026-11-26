-- Tìm kiếm giao dịch không phân biệt dấu và hoa/thường: "ca phe" khớp "Cà phê sáng".

-- unaccent() là STABLE nên không dùng được trong cột sinh tự động hay index.
-- Bọc lại thành hàm IMMUTABLE (chỉ định rõ từ điển) là cách làm phổ biến trên PostgreSQL.
CREATE FUNCTION f_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- Chuỗi tìm kiếm tính sẵn khi ghi (tiêu đề + lời nhắn + số điện thoại), không phải tính lại mỗi lần đọc.
ALTER TABLE transactions
    ADD COLUMN search_text VARCHAR(300) GENERATED ALWAYS AS (
        CAST(f_unaccent(lower(title || ' ' || coalesce(note, '') || ' ' || coalesce(counterparty_phone, ''))) AS VARCHAR(300))
    ) STORED;

-- Index trigram: tăng tốc LIKE '%...%' (index B-tree thường không dùng được khi có % ở đầu).
CREATE INDEX idx_transactions_search ON transactions USING gin (search_text gin_trgm_ops);
