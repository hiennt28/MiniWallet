/*
 * API giả lập: mỗi hàm trả về Promise và có độ trễ như gọi mạng thật,
 * kiểm tra dữ liệu lại ở phía "server" và báo lỗi bằng ApiError có mã lỗi.
 * Mọi hàm đều gắn với tài khoản đang đăng nhập (xem server.ts › requireAccount).
 */
import { getDb, resetDb, setDb } from './db';
import { ApiError } from './errors';
import { checkPin, delay, randomId, requireAccount } from './server';
import { setToken } from './session';
import { digitsOnly, formatPhone } from '../utils/format';
import { requiresOtp, validateTransfer } from '../utils/validators';
import { expenseByCategory, filterTransactions, paginate, summarizeMonth } from '../utils/transactions';
import type {
  Account,
  CreateTransferResult,
  DashboardData,
  OtpTicket,
  Page,
  Transaction,
  TransactionFilters,
  TransferInput,
  WalletInfo,
} from '../types';

export { ApiError, toApiError, type ApiErrorCode } from './errors';

export const OTP_TTL_MS = 2 * 60 * 1000;
export const OTP_RESEND_AFTER_MS = 30 * 1000;
export const OTP_MAX_ATTEMPTS = 3;

/** Chuyển tới số này để thử trường hợp máy chủ lỗi. */
export const FAILING_PHONE = '0999999999';

const randomOtp = () => String(Math.floor(100000 + Math.random() * 900000));

interface PendingTransfer {
  id: string;
  /** Người tạo giao dịch: chỉ chính họ mới xác nhận được. */
  ownerPhone: string;
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

function assertNotFrozen(account: Account): void {
  if (account.security.frozen) {
    throw new ApiError('Ví đang bị khóa. Vào Cài đặt để mở khóa trước khi giao dịch.', 'WALLET_FROZEN');
  }
}

export async function getWallet(): Promise<WalletInfo> {
  await delay(200, 400);
  const { balance, profile, contacts, security } = requireAccount();
  return { balance, profile, contacts, frozen: security.frozen };
}

export async function getDashboard(ref: Date = new Date()): Promise<DashboardData> {
  await delay();
  const { balance, transactions } = requireAccount();
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
  return paginate(filterTransactions(requireAccount().transactions, filters), page, pageSize);
}

export async function getTransaction(id: string): Promise<Transaction> {
  await delay(200, 400);
  const tx = requireAccount().transactions.find((t) => t.id === id);
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

/**
 * Trừ tiền người gửi và ghi giao dịch. Nếu người nhận cũng có tài khoản MiniWallet
 * thì cộng tiền và ghi giao dịch "Nhận tiền" cho họ, trong cùng một lần ghi dữ liệu.
 */
function executeTransfer(senderPhone: string, { phone, amount, note }: { phone: string; amount: number; note: string }): Transaction {
  const db = getDb();
  const sender = db.accounts[senderPhone];
  if (!sender) throw new ApiError('Không tìm thấy tài khoản.', 'NOT_FOUND');
  assertNotFrozen(sender);
  // Số dư có thể đã thay đổi trong lúc chờ PIN/OTP: kiểm tra lại
  if (amount > sender.balance) {
    throw new ApiError('Số dư không đủ để thực hiện giao dịch.', 'INSUFFICIENT_BALANCE');
  }

  const receiver = db.accounts[phone];
  const contact = sender.contacts.find((c) => c.phone === phone);
  const createdAt = new Date().toISOString();
  const tx: Transaction = {
    id: randomId('tx'),
    type: 'expense',
    category: 'transfer_out',
    title: `Chuyển tiền đến ${contact?.name ?? receiver?.profile.name ?? formatPhone(phone)}`,
    amount,
    phone,
    note,
    status: 'success',
    createdAt,
  };

  const accounts = { ...db.accounts, [senderPhone]: { ...sender, balance: sender.balance - amount, transactions: [tx, ...sender.transactions] } };
  if (receiver) {
    const incoming: Transaction = {
      id: randomId('tx'),
      type: 'income',
      category: 'transfer_in',
      title: `Nhận tiền từ ${sender.profile.name}`,
      amount,
      phone: senderPhone,
      note,
      status: 'success',
      createdAt,
    };
    accounts[phone] = { ...receiver, balance: receiver.balance + amount, transactions: [incoming, ...receiver.transactions] };
  }

  setDb({ ...db, accounts });
  return tx;
}

/**
 * Bước 1: kiểm tra dữ liệu và PIN. Số tiền nhỏ thì chuyển luôn;
 * từ ngưỡng OTP trở lên thì tạo yêu cầu chờ và gửi OTP.
 */
export async function createTransfer({ phone, amount, note = '', pin }: TransferInput & { pin: string }): Promise<CreateTransferResult> {
  await delay();
  const account = requireAccount();
  assertNotFrozen(account);

  const cleanPhone = digitsOnly(phone);
  const errors = validateTransfer({ phone: cleanPhone, amount, note }, { balance: account.balance, ownPhone: account.profile.phone });
  const firstError = Object.values(errors)[0];
  if (firstError) throw new ApiError(firstError, 'VALIDATION');
  if (cleanPhone === FAILING_PHONE) {
    throw new ApiError('Hệ thống đang bận, vui lòng thử lại sau ít phút.', 'SERVER_ERROR');
  }

  // Kiểm tra dữ liệu trước rồi mới kiểm tra PIN, để lỗi nhập liệu không làm mất lượt thử PIN
  await checkPin(account.profile.phone, pin);

  if (!requiresOtp(amount)) {
    return { status: 'completed', tx: executeTransfer(account.profile.phone, { phone: cleanPhone, amount, note }) };
  }

  const transfer: PendingTransfer = {
    id: randomId('tf'),
    ownerPhone: account.profile.phone,
    phone: cleanPhone,
    amount,
    note,
    otp: '',
    sentAt: 0,
    expiresAt: 0,
    attempts: 0,
  };
  pendingTransfers.set(transfer.id, transfer);
  return { status: 'otp_required', ticket: issueOtp(transfer) };
}

/** Lấy giao dịch đang chờ của chính người dùng hiện tại. */
function getOwnPending(transferId: string): PendingTransfer {
  const account = requireAccount();
  const transfer = pendingTransfers.get(transferId);
  if (!transfer || transfer.ownerPhone !== account.profile.phone) {
    throw new ApiError('Giao dịch không tồn tại hoặc đã bị hủy.', 'NOT_FOUND');
  }
  return transfer;
}

export async function resendOtp(transferId: string): Promise<OtpTicket> {
  await delay(200, 400);
  const transfer = getOwnPending(transferId);
  if (Date.now() - transfer.sentAt < OTP_RESEND_AFTER_MS && Date.now() < transfer.expiresAt) {
    throw new ApiError('Vui lòng đợi trước khi gửi lại mã.', 'TOO_SOON');
  }
  return issueOtp(transfer);
}

/** Bước 2 (chỉ với giao dịch lớn): xác thực OTP rồi chuyển tiền. */
export async function confirmTransfer(transferId: string, otp: string): Promise<Transaction> {
  await delay();
  const transfer = getOwnPending(transferId);

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

  pendingTransfers.delete(transferId);
  return executeTransfer(transfer.ownerPhone, transfer);
}

/** Xóa toàn bộ dữ liệu (mọi tài khoản) về dữ liệu mẫu và đăng xuất. */
export async function resetData(): Promise<void> {
  await delay();
  pendingTransfers.clear();
  resetDb();
  setToken(null);
}
