/* Lọc, phân trang và thống kê giao dịch. Hàm thuần, dùng trong API giả lập và trong test. */
import { getCategory } from '../data/categories';
import type { CategoryKey, CategoryTotal, MonthSummary, Page, Transaction, TransactionFilters } from '../types';

/** Bỏ dấu tiếng Việt và chữ hoa để tìm kiếm: "Chuyển Tiền" -> "chuyen tien" */
export function normalizeText(text: string | null | undefined): string {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/** "2026-11-24" -> thời điểm 00:00 hoặc 23:59:59.999 ngày đó theo giờ địa phương */
function dayBoundary(value: string, end = false): number {
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number);
  const start = new Date(y, m - 1, d).getTime();
  return end ? start + 24 * 60 * 60 * 1000 - 1 : start;
}

export function filterTransactions(
  list: Transaction[],
  { query = '', type = 'all', category = 'all', from = '', to = '' }: TransactionFilters = {},
): Transaction[] {
  const q = normalizeText(query);
  const fromTime = from ? dayBoundary(from) : -Infinity;
  const toTime = to ? dayBoundary(to, true) : Infinity;

  return list.filter((tx) => {
    if (type !== 'all' && tx.type !== type) return false;
    if (category !== 'all' && tx.category !== category) return false;
    const time = new Date(tx.createdAt).getTime();
    if (time < fromTime || time > toTime) return false;
    if (q) {
      const haystack = normalizeText(`${tx.title} ${tx.note ?? ''} ${tx.phone ?? ''}`);
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function paginate<T>(list: T[], page = 1, pageSize = 10): Page<T> {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * pageSize;
  return {
    items: list.slice(start, start + pageSize),
    page: current,
    pageSize,
    totalPages,
    total: list.length,
  };
}

export function isSameMonth(iso: string, ref: Date = new Date()): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

/** Tổng thu, tổng chi trong tháng của ngày ref. */
export function summarizeMonth(list: Transaction[], ref: Date = new Date()): MonthSummary {
  return list.reduce<MonthSummary>(
    (acc, tx) => {
      if (!isSameMonth(tx.createdAt, ref)) return acc;
      if (tx.type === 'income') acc.income += tx.amount;
      else acc.expense += tx.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );
}

/** Chi tiêu trong tháng gom theo danh mục, sắp xếp giảm dần. Bỏ qua tiền chuyển nội bộ (rút về ngân hàng của mình). */
export function expenseByCategory(list: Transaction[], ref: Date = new Date()): CategoryTotal[] {
  const totals = new Map<CategoryKey, number>();
  for (const tx of list) {
    if (tx.type !== 'expense' || getCategory(tx.category).internal || !isSameMonth(tx.createdAt, ref)) continue;
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount);
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export interface DateGroup<T> {
  label: string;
  items: T[];
}

/** Gom các giao dịch (đã sắp xếp mới nhất trước) theo ngày để hiển thị. */
export function groupByDate<T extends { createdAt: string }>(list: T[], formatDate: (iso: string) => string): DateGroup<T>[] {
  const groups: DateGroup<T>[] = [];
  for (const tx of list) {
    const label = formatDate(tx.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(tx);
    else groups.push({ label, items: [tx] });
  }
  return groups;
}
