-- Tạo user và database cho môi trường phát triển ở máy.
-- Chạy bằng tài khoản superuser "postgres" (thay <mat-khau> bằng mật khẩu bạn chọn cho user miniwallet):
--   psql -U postgres -v app_password=<mat-khau> -f db/create-local-db.sql
-- Sau đó ghi cùng mật khẩu vào file .env (DB_PASSWORD).

CREATE ROLE miniwallet WITH LOGIN PASSWORD :'app_password';

CREATE DATABASE miniwallet OWNER miniwallet ENCODING 'UTF8';
CREATE DATABASE miniwallet_test OWNER miniwallet ENCODING 'UTF8';
