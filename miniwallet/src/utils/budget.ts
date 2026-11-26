/*
 * Tính toán ngân sách theo tháng. Hàm thuần: nhận giao dịch, hạn mức và thời điểm hiện tại,
 * nên test được mọi trường hợp (đầu tháng, cuối tháng, tháng đã qua) mà không cần giả lập ngày.
 */
import { CATEGORIES } from '../data/categories';
import { expenseByCategory } from './transactions';
import type { BudgetItem, BudgetOverview, Budgets, BudgetStatus, CategoryKey, Transaction } from '../types';

/** Từ 80% hạn mức trở lên thì cảnh báo "sắp hết". */
export const BUDGET_WARNING_RATIO = 0.8;
export const BUDGET_LIMITS = { min: 50_000, max: 500_000_000 } as const;

/** Danh mục đặt được ngân sách: chi tiêu thật, không gồm tiền chuyển nội bộ (rút về ngân hàng). */
export const BUDGETABLE_CATEGORIES = (Object.keys(CATEGORIES) as CategoryKey[]).filter(
  (key) => CATEGORIES[key].type === 'expense' && !CATEGORIES[key].internal,
);

export function isBudgetable(key: string): key is CategoryKey {
  return (BUDGETABLE_CATEGORIES as string[]).includes(key);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Date -> "2026-11" */
export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** "2026-11" -> ngày 1 của tháng đó. Chuỗi sai định dạng thì trả về null. */
export function parseMonthKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Number(match[1]), month - 1, 1);
}

/** Cộng/trừ số tháng: shiftMonth("2026-01", -1) -> "2025-12" */
export function shiftMonth(key: string, delta: number): string {
  const date = parseMonthKey(key) ?? new Date();
  return toMonthKey(new Date(date.getFullYear(), date.getMonth() + delta, 1));
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (spent > limit) return 'over';
  if (spent >= limit * BUDGET_WARNING_RATIO) return 'warning';
  return 'ok';
}

/**
 * Tính một dòng ngân sách. Với tháng hiện tại, ước tính cuối tháng = chi trung bình mỗi ngày đã qua × số ngày trong tháng.
 * Hôm nay được tính là một ngày đã qua để đầu tháng không chia cho 0.
 */
export function computeBudgetItem(category: CategoryKey, limit: number, spent: number, month: Date, now: Date): BudgetItem {
  const isCurrent = toMonthKey(month) === toMonthKey(now);
  const total = daysInMonth(month);
  const elapsed = isCurrent ? now.getDate() : total;
  const daysLeft = isCurrent ? total - now.getDate() + 1 : 0;

  return {
    category,
    limit,
    spent,
    ratio: limit > 0 ? spent / limit : 0,
    status: budgetStatus(spent, limit),
    projected: isCurrent ? Math.round((spent / elapsed) * total) : spent,
    dailyAllowance: daysLeft > 0 ? Math.max(0, Math.floor((limit - spent) / daysLeft)) : 0,
  };
}

const STATUS_ORDER: Record<BudgetStatus, number> = { over: 0, warning: 1, ok: 2 };

export function buildBudgetOverview(transactions: Transaction[], budgets: Budgets, month: Date, now: Date): BudgetOverview {
  const spentMap = new Map(expenseByCategory(transactions, month).map((c) => [c.category, c.total]));
  const isCurrentMonth = toMonthKey(month) === toMonthKey(now);

  const items: BudgetItem[] = [];
  for (const category of BUDGETABLE_CATEGORIES) {
    const limit = budgets[category];
    if (limit) items.push(computeBudgetItem(category, limit, spentMap.get(category) ?? 0, month, now));
  }
  // Danh mục đáng lo nhất lên trước: đã vượt → sắp hết → bình thường, cùng mức thì tỉ lệ cao trước
  items.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.ratio - a.ratio);

  const unbudgeted = BUDGETABLE_CATEGORIES.filter((c) => !budgets[c])
    .map((category) => ({ category, total: spentMap.get(category) ?? 0 }))
    .sort((a, b) => b.total - a.total);

  return {
    month: toMonthKey(month),
    isCurrentMonth,
    daysLeft: isCurrentMonth ? daysInMonth(month) - now.getDate() + 1 : 0,
    items,
    unbudgeted,
    totalLimit: items.reduce((s, i) => s + i.limit, 0),
    totalSpent: items.reduce((s, i) => s + i.spent, 0),
  };
}

/** Một khoản chi sắp tới sẽ làm ngân sách chuyển sang mức nào (để cảnh báo trước khi xác nhận). */
export function budgetImpact(item: Pick<BudgetItem, 'limit' | 'spent'>, amount: number): { status: BudgetStatus; after: number; overBy: number } {
  const after = item.spent + amount;
  return { status: budgetStatus(after, item.limit), after, overBy: Math.max(0, after - item.limit) };
}

export function validateBudgetLimit(limit: number): string | undefined {
  if (!limit) return 'Vui lòng nhập hạn mức.';
  if (!Number.isInteger(limit) || limit < BUDGET_LIMITS.min) return 'Hạn mức tối thiểu là 50.000 ₫.';
  if (limit > BUDGET_LIMITS.max) return 'Hạn mức tối đa là 500.000.000 ₫.';
  return undefined;
}
