import { digitsOnly, formatVND } from './format';
import type { TransferInput } from '../types';

export const TRANSFER_LIMITS = {
  min: 10_000,
  max: 50_000_000,
  noteMax: 100,
} as const;

export type TransferField = 'phone' | 'amount' | 'note';
export type TransferErrors = Partial<Record<TransferField, string>>;

/** Số di động Việt Nam: 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09. */
export function isValidPhone(phone: string): boolean {
  return /^0[35789]\d{8}$/.test(digitsOnly(phone));
}

export function isValidOtp(otp: string | null | undefined): boolean {
  return /^\d{6}$/.test(String(otp ?? ''));
}

/**
 * Kiểm tra form chuyển tiền. Trả về object lỗi theo từng trường, rỗng nghĩa là hợp lệ.
 * Dùng chung cho cả form (client) và API giả lập (server).
 */
export function validateTransfer(
  { phone, amount, note = '' }: TransferInput,
  { balance, ownPhone }: { balance: number; ownPhone: string },
): TransferErrors {
  const errors: TransferErrors = {};
  const p = digitsOnly(phone);

  if (!p) errors.phone = 'Vui lòng nhập số điện thoại người nhận.';
  else if (!isValidPhone(p)) errors.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).';
  else if (p === ownPhone) errors.phone = 'Không thể chuyển tiền cho chính mình.';

  if (!amount) errors.amount = 'Vui lòng nhập số tiền.';
  else if (!Number.isInteger(amount) || amount < TRANSFER_LIMITS.min) {
    errors.amount = `Số tiền tối thiểu là ${formatVND(TRANSFER_LIMITS.min)}.`;
  } else if (amount > TRANSFER_LIMITS.max) {
    errors.amount = `Mỗi lần chuyển tối đa ${formatVND(TRANSFER_LIMITS.max)}.`;
  } else if (amount > balance) {
    errors.amount = 'Số dư không đủ để thực hiện giao dịch.';
  }

  if (note.length > TRANSFER_LIMITS.noteMax) {
    errors.note = `Lời nhắn tối đa ${TRANSFER_LIMITS.noteMax} ký tự.`;
  }

  return errors;
}
