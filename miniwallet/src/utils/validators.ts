import { digitsOnly, formatVND } from './format';
import type { MoneyMoveMode, TransferInput } from '../types';

export const TRANSFER_LIMITS = {
  min: 10_000,
  max: 50_000_000,
  noteMax: 100,
  /** Từ mức này trở lên phải nhập thêm OTP sau PIN. */
  otpFrom: 5_000_000,
} as const;

export const NAME_LIMITS = { min: 2, max: 50 } as const;

/** Hạn mức mỗi lần nạp / rút. */
export const MONEY_MOVE_LIMITS = {
  topup: { min: 10_000, max: 20_000_000 },
  withdraw: { min: 50_000, max: 20_000_000 },
} as const satisfies Record<MoneyMoveMode, { min: number; max: number }>;

export const MAX_LINKED_BANKS = 3;
export const BANK_ACCOUNT_LENGTH = { min: 8, max: 14 } as const;

export type MoneyMoveField = 'bankId' | 'amount';
export type MoneyMoveErrors = Partial<Record<MoneyMoveField, string>>;

/** Kiểm tra form nạp / rút. Dùng chung cho client và "server". */
export function validateMoneyMove(mode: MoneyMoveMode, { bankId, amount }: { bankId: string; amount: number }, { balance }: { balance: number }): MoneyMoveErrors {
  const errors: MoneyMoveErrors = {};
  const { min, max } = MONEY_MOVE_LIMITS[mode];
  const verb = mode === 'topup' ? 'nạp' : 'rút';

  if (!bankId) errors.bankId = 'Vui lòng chọn tài khoản ngân hàng.';

  if (!amount) errors.amount = 'Vui lòng nhập số tiền.';
  else if (!Number.isInteger(amount) || amount < min) errors.amount = `Số tiền ${verb} tối thiểu là ${formatVND(min)}.`;
  else if (amount > max) errors.amount = `Mỗi lần ${verb} tối đa ${formatVND(max)}.`;
  else if (mode === 'withdraw' && amount > balance) errors.amount = 'Số dư ví không đủ để rút.';

  return errors;
}

export type BankLinkField = 'bankCode' | 'accountNumber';
export type BankLinkErrors = Partial<Record<BankLinkField, string>>;

export function validateBankLink({ bankCode, accountNumber }: { bankCode: string; accountNumber: string }, { knownBank }: { knownBank: (code: string) => boolean }): BankLinkErrors {
  const errors: BankLinkErrors = {};
  if (!bankCode) errors.bankCode = 'Vui lòng chọn ngân hàng.';
  else if (!knownBank(bankCode)) errors.bankCode = 'Ngân hàng không được hỗ trợ.';

  const digits = digitsOnly(accountNumber);
  if (!digits) errors.accountNumber = 'Vui lòng nhập số tài khoản.';
  else if (digits !== accountNumber || digits.length < BANK_ACCOUNT_LENGTH.min || digits.length > BANK_ACCOUNT_LENGTH.max) {
    errors.accountNumber = `Số tài khoản gồm ${BANK_ACCOUNT_LENGTH.min}–${BANK_ACCOUNT_LENGTH.max} chữ số.`;
  }
  return errors;
}

export function requiresOtp(amount: number): boolean {
  return amount >= TRANSFER_LIMITS.otpFrom;
}

export type TransferField = 'phone' | 'amount' | 'note';
export type TransferErrors = Partial<Record<TransferField, string>>;

/** Số di động Việt Nam: 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09. */
export function isValidPhone(phone: string): boolean {
  return /^0[35789]\d{8}$/.test(digitsOnly(phone));
}

export function isValidOtp(otp: string | null | undefined): boolean {
  return /^\d{6}$/.test(String(otp ?? ''));
}

/** PIN cùng định dạng với OTP: đúng 6 chữ số. */
export const isValidPin = isValidOtp;

/** PIN dễ đoán: 6 số giống nhau (111111) hoặc dãy liên tiếp tăng/giảm (123456, 987654). */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1{5}$/.test(pin)) return true;
  const steps = new Set<number>();
  for (let i = 1; i < pin.length; i += 1) steps.add(Number(pin[i]) - Number(pin[i - 1]));
  return steps.size === 1 && (steps.has(1) || steps.has(-1));
}

export type RegisterField = 'name' | 'phone' | 'pin' | 'confirmPin';
export type RegisterErrors = Partial<Record<RegisterField, string>>;

export function validatePinChoice(pin: string): string | undefined {
  if (!pin) return 'Vui lòng tạo mã PIN.';
  if (!isValidPin(pin)) return 'Mã PIN gồm đúng 6 chữ số.';
  if (isWeakPin(pin)) return 'Mã PIN quá dễ đoán. Không dùng 6 số giống nhau hoặc dãy số liên tiếp.';
  return undefined;
}

/** Kiểm tra form đăng ký. confirmPin chỉ có ở client nên không bắt buộc. */
export function validateRegistration({ name, phone, pin, confirmPin }: { name: string; phone: string; pin: string; confirmPin?: string }): RegisterErrors {
  const errors: RegisterErrors = {};
  const trimmed = name.trim();
  if (!trimmed) errors.name = 'Vui lòng nhập họ tên.';
  else if (trimmed.length < NAME_LIMITS.min || trimmed.length > NAME_LIMITS.max) {
    errors.name = `Họ tên từ ${NAME_LIMITS.min} đến ${NAME_LIMITS.max} ký tự.`;
  }

  const p = digitsOnly(phone);
  if (!p) errors.phone = 'Vui lòng nhập số điện thoại.';
  else if (!isValidPhone(p)) errors.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).';

  const pinError = validatePinChoice(pin);
  if (pinError) errors.pin = pinError;
  else if (confirmPin !== undefined && confirmPin !== pin) errors.confirmPin = 'Mã PIN nhập lại không khớp.';

  return errors;
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
