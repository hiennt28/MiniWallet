/* Các hàm định dạng tiền, ngày giờ, số điện thoại. Không phụ thuộc React để dễ test. */

const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

/** 1250000 -> "1.250.000 ₫" */
export function formatVND(amount) {
  return vndFormatter.format(Math.round(Number(amount) || 0));
}

/** Số tiền có dấu theo loại giao dịch: thu "+", chi "−". */
export function formatSignedVND(amount, type) {
  const sign = type === 'income' ? '+' : '−';
  return `${sign}${formatVND(Math.abs(amount))}`;
}

/** Giữ lại chữ số. */
export function digitsOnly(text) {
  return String(text ?? '').replace(/\D/g, '');
}

const MAX_AMOUNT_DIGITS = 12;

/** "1.250.000" -> 1250000. Chuỗi rỗng -> 0. */
export function parseAmount(text) {
  const digits = digitsOnly(text).slice(0, MAX_AMOUNT_DIGITS);
  return digits ? Number(digits) : 0;
}

/** Định dạng ô nhập tiền khi người dùng gõ: "1250000" -> "1.250.000". */
export function formatAmountInput(text) {
  const digits = digitsOnly(text).replace(/^0+(?=\d)/, '').slice(0, MAX_AMOUNT_DIGITS);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "0912345678" -> "0912 345 678" */
export function formatPhone(phone) {
  const d = digitsOnly(phone);
  if (d.length !== 10) return d;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

/** "0912345678" -> "0912 *** 678" */
export function maskPhone(phone) {
  const d = digitsOnly(phone);
  if (d.length !== 10) return d;
  return `${d.slice(0, 4)} *** ${d.slice(7)}`;
}

const pad = (n) => String(n).padStart(2, '0');

/** ISO -> "24/11/2026" (giờ địa phương) */
export function formatDate(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** ISO -> "14:05" */
export function formatTime(iso) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO -> "14:05 · 24/11/2026" */
export function formatDateTime(iso) {
  return `${formatTime(iso)} · ${formatDate(iso)}`;
}

/** Date -> "2026-11-24" để dùng cho <input type="date"> */
export function toDateInputValue(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 125 giây -> "02:05" */
export function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** "Nguyễn Văn An" -> "VA" */
export function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}
