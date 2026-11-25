/* Kiểu dữ liệu dùng chung giữa API giả lập, state và giao diện. */

export type TransactionType = 'income' | 'expense';

export type CategoryKey =
  | 'food'
  | 'shopping'
  | 'transport'
  | 'bills'
  | 'entertainment'
  | 'transfer_out'
  | 'transfer_in'
  | 'salary'
  | 'bonus';

export interface Category {
  label: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: CategoryKey;
  title: string;
  /** Số nguyên, đơn vị đồng. */
  amount: number;
  phone?: string;
  note?: string;
  status: 'success';
  /** ISO 8601 */
  createdAt: string;
}

export interface Profile {
  name: string;
  phone: string;
}

export interface Contact {
  name: string;
  phone: string;
}

/** Mã băm PIN. Không bao giờ lưu PIN dạng chữ thường. */
export interface PinCredentials {
  salt: string;
  hash: string;
  iterations: number;
}

export interface SecurityState {
  /** Số lần sai liên tiếp, dùng chung cho đăng nhập và xác nhận giao dịch. */
  failedPinAttempts: number;
  /** Thời điểm (ms) hết khóa PIN, null nếu không bị khóa. */
  pinLockedUntil: number | null;
  /** Khóa ví khẩn cấp: chặn mọi giao dịch trừ tiền. */
  frozen: boolean;
}

export interface Account {
  profile: Profile;
  pin: PinCredentials;
  security: SecurityState;
  balance: number;
  contacts: Contact[];
  transactions: Transaction[];
  createdAt: string;
}

export interface Session {
  phone: string;
  /** ms; được gia hạn mỗi lần gọi API (sliding expiration). */
  expiresAt: number;
}

/** "Cơ sở dữ liệu" phía server giả lập. */
export interface Database {
  version: 2;
  /** Khóa là số điện thoại. */
  accounts: Record<string, Account>;
  /** Khóa là token phiên đăng nhập. */
  sessions: Record<string, Session>;
}

export type TypeFilter = 'all' | TransactionType;

export interface TransactionFilters {
  query?: string;
  type?: TypeFilter;
  category?: CategoryKey | 'all';
  /** "YYYY-MM-DD" */
  from?: string;
  to?: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
}

export interface MonthSummary {
  income: number;
  expense: number;
}

export interface CategoryTotal {
  category: CategoryKey;
  total: number;
}

export interface WalletInfo {
  balance: number;
  profile: Profile;
  contacts: Contact[];
  frozen: boolean;
}

export interface DashboardData {
  balance: number;
  month: MonthSummary;
  byCategory: CategoryTotal[];
  recent: Transaction[];
}

export interface OtpTicket {
  transferId: string;
  otp: string;
  sentAt: number;
  expiresAt: number;
}

export interface TransferInput {
  phone: string;
  amount: number;
  note?: string;
}

/** Chuyển tiền nhỏ hoàn tất ngay sau PIN; từ ngưỡng OTP trở lên phải nhập thêm OTP. */
export type CreateTransferResult = { status: 'completed'; tx: Transaction } | { status: 'otp_required'; ticket: OtpTicket };

export interface RegisterInput {
  name: string;
  phone: string;
  pin: string;
}

export interface LoginInput {
  phone: string;
  pin: string;
}

export type Theme = 'light' | 'dark';
