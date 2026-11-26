-- unaccent: tìm kiếm không dấu ("ca phe" khớp "Cà phê").
-- pg_trgm: index trigram cho tìm kiếm LIKE '%...%' trên tiêu đề, lời nhắn giao dịch.
-- Cả hai là "trusted extension" từ PostgreSQL 13, chủ database tạo được mà không cần superuser.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
