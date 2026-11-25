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
  | 'salary';

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

export interface Database {
  balance: number;
  profile: Profile;
  contacts: Contact[];
  transactions: Transaction[];
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

export type Theme = 'light' | 'dark';
