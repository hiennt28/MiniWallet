/*
 * Băm mã PIN bằng PBKDF2-SHA256 (Web Crypto, có sẵn trong trình duyệt và Node 18+).
 * Mỗi tài khoản có salt riêng nên hai người cùng PIN vẫn ra hai mã băm khác nhau.
 *
 * Lưu ý: đây là mô phỏng chạy trên trình duyệt. PIN 6 số chỉ có 1 triệu khả năng nên
 * băm không đủ để chống dò; thứ thực sự bảo vệ là giới hạn số lần nhập sai (xem security.ts),
 * và ở hệ thống thật việc này phải làm ở server.
 */
import type { PinCredentials } from '../types';

/** Lưu cùng mã băm để sau này tăng số vòng mà không làm hỏng tài khoản cũ. */
export const PIN_HASH_ITERATIONS = 100_000;

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** Chuỗi hex ngẫu nhiên an toàn (dùng cho salt và token phiên đăng nhập). */
export function randomHex(byteLength = 16): string {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function hashPin(pin: string, salt: string, iterations = PIN_HASH_ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations }, key, 256);
  return toHex(new Uint8Array(bits));
}

export async function createPinCredentials(pin: string): Promise<PinCredentials> {
  const salt = randomHex(16);
  return { salt, iterations: PIN_HASH_ITERATIONS, hash: await hashPin(pin, salt) };
}

/** So sánh hết chuỗi thay vì dừng ở ký tự sai đầu tiên, tránh lộ thông tin qua thời gian chạy. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPin(pin: string, credentials: PinCredentials): Promise<boolean> {
  return safeEqual(await hashPin(pin, credentials.salt, credentials.iterations), credentials.hash);
}
