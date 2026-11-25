/*
 * API giả lập: mỗi hàm trả về Promise và có độ trễ như gọi mạng thật,
 * kiểm tra dữ liệu lại ở phía "server" và báo lỗi bằng ApiError có mã lỗi.
 */
import { getDb, resetDb, setDb } from './db';
import { digitsOnly, formatPhone } from '../utils/format';
import { validateTransfer } from '../utils/validators';
import { expenseByCategory, filterTransactions, paginate, summarizeMonth } from '../utils/transactions';
import type { DashboardData, OtpTicket, Page, Transaction, TransactionFilters, TransferInput, WalletInfo } from '../types';

export type ApiErrorCode =
  | 'UNKNOWN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'SERVER_ERROR'
  | 'TOO_SOON'
  | 'OTP_EXPIRED'
  | 'OTP_INVALID'
  | 'OTP_LOCKED'
  | 'INSUFFICIENT_BALANCE';

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(message: string, code: ApiErrorCode = 'UNKNOWN') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/** Lỗi bắt được trong catch có kiểu unknown: lấy ra mã và thông báo an toàn. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
}

export const OTP_TTL_MS = 2 * 60 * 1000;
export const OTP_RESEND_AFTER_MS = 30 * 1000;
export const OTP_MAX_ATTEMPTS = 3;

/** Chuyển tới số này để thử trường hợp máy chủ lỗi. */
export const FAILING_PHONE = '0999999999';

const IS_TEST = import.meta.env?.MODE === 'test';

function delay(min = 300, max = 700): Promise<void> {
  if (IS_TEST) return Promise.resolve();
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const randomId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const randomOtp = () => String(Math.floor(100000 + Math.random() * 900000));

interface PendingTransfer {
  id: string;
  phone: string;
  amount: number;
  note: string;
  otp: string;
  sentAt: number;
  expiresAt: number;
  attempts: number;
}

// Các giao dịch đang chờ nhập OTP: transferId -> thông tin
const pendingTransfers = new Map<string, PendingTransfer>();

export async function getWallet(): Promise<WalletInfo> {
  await delay(200, 400);
  const { balance, profile, contacts } = getDb();
  return { balance, profile, contacts };
}

export async function getDashboard(ref: Date = new Date()): Promise<DashboardData> {
  await delay();
  const { balance, transactions } = getDb();
  return {
    balance,
    month: summarizeMonth(transactions, ref),
    byCategory: expenseByCategory(transactions, ref),
    recent: transactions.slice(0, 5),
  };
}

export async function getTransactions({
  page = 1,
  pageSize = 10,
  ...filters
}: TransactionFilters & { page?: number; pageSize?: number } = {}): Promise<Page<Transaction>> {
  await delay();
  return paginate(filterTransactions(getDb().transactions, filters), page, pageSize);
}

export async function getTransaction(id: string): Promise<Transaction> {
  await delay(200, 400);
  const tx = getDb().transactions.find((t) => t.id === id);
  if (!tx) throw new ApiError('Không tìm thấy giao dịch.', 'NOT_FOUND');
  return tx;
}

function issueOtp(transfer: PendingTransfer): OtpTicket {
  const sentAt = Date.now();
  transfer.otp = randomOtp();
  transfer.sentAt = sentAt;
  transfer.expiresAt = sentAt + OTP_TTL_MS;
  transfer.attempts = 0;
  // Thực tế OTP gửi qua SMS; ở đây trả về để hiển thị dạng "tin nhắn giả lập"
  return { transferId: transfer.id, otp: transfer.otp, sentAt, expiresAt: transfer.expiresAt };
}

/** Bước 1: tạo yêu cầu chuyển tiền và gửi OTP. */
export async function createTransfer({ phone, amount, note = '' }: TransferInput): Promise<OtpTicket> {
  await delay();
  const db = getDb();
  const cleanPhone = digitsOnly(phone);
  const errors = validateTransfer({ phone: cleanPhone, amount, note }, { balance: db.balance, ownPhone: db.profile.phone });
  const firstError = Object.values(errors)[0];
  if (firstError) throw new ApiError(firstError, 'VALIDATION');
  if (cleanPhone === FAILING_PHONE) {
    throw new ApiError('Hệ thống đang bận, vui lòng thử lại sau ít phút.', 'SERVER_ERROR');
  }

  const transfer: PendingTransfer = { id: randomId('tf'), phone: cleanPhone, amount, note, otp: '', sentAt: 0, expiresAt: 0, attempts: 0 };
  pendingTransfers.set(transfer.id, transfer);
  return issueOtp(transfer);
}

export async function resendOtp(transferId: string): Promise<OtpTicket> {
  await delay(200, 400);
  const transfer = pendingTransfers.get(transferId);
  if (!transfer) throw new ApiError('Giao dịch không tồn tại hoặc đã bị hủy.', 'NOT_FOUND');
  if (Date.now() - transfer.sentAt < OTP_RESEND_AFTER_MS && Date.now() < transfer.expiresAt) {
    throw new ApiError('Vui lòng đợi trước khi gửi lại mã.', 'TOO_SOON');
  }
  return issueOtp(transfer);
}

/** Bước 2: xác thực OTP, trừ tiền và ghi giao dịch. */
export async function confirmTransfer(transferId: string, otp: string): Promise<Transaction> {
  await delay();
  const transfer = pendingTransfers.get(transferId);
  if (!transfer) throw new ApiError('Giao dịch không tồn tại hoặc đã bị hủy.', 'NOT_FOUND');

  if (Date.now() > transfer.expiresAt) {
    throw new ApiError('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.', 'OTP_EXPIRED');
  }
  if (otp !== transfer.otp) {
    transfer.attempts += 1;
    const left = OTP_MAX_ATTEMPTS - transfer.attempts;
    if (left <= 0) {
      pendingTransfers.delete(transferId);
      throw new ApiError(`Bạn đã nhập sai OTP ${OTP_MAX_ATTEMPTS} lần. Giao dịch đã bị hủy.`, 'OTP_LOCKED');
    }
    throw new ApiError(`Mã OTP không đúng. Bạn còn ${left} lần thử.`, 'OTP_INVALID');
  }

  const db = getDb();
  pendingTransfers.delete(transferId);
  // Số dư có thể đã thay đổi trong lúc chờ OTP: kiểm tra lại
  if (transfer.amount > db.balance) {
    throw new ApiError('Số dư không đủ để thực hiện giao dịch.', 'INSUFFICIENT_BALANCE');
  }

  const contact = db.contacts.find((c) => c.phone === transfer.phone);
  const tx: Transaction = {
    id: randomId('tx'),
    type: 'expense',
    category: 'transfer_out',
    title: `Chuyển tiền đến ${contact?.name ?? formatPhone(transfer.phone)}`,
    amount: transfer.amount,
    phone: transfer.phone,
    note: transfer.note,
    status: 'success',
    createdAt: new Date().toISOString(),
  };

  setDb({ ...db, balance: db.balance - transfer.amount, transactions: [tx, ...db.transactions] });
  return tx;
}

export async function resetData(): Promise<void> {
  await delay();
  pendingTransfers.clear();
  resetDb();
}
