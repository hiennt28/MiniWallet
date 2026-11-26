/* API giả lập cho ngân sách: xem tổng quan theo tháng và đặt / xóa hạn mức từng danh mục. */
import { getCategory } from '../data/categories';
import { buildBudgetOverview, isBudgetable, parseMonthKey, toMonthKey, validateBudgetLimit } from '../utils/budget';
import { saveAccount } from './db';
import { ApiError } from './errors';
import { delay, requireAccount } from './server';
import type { BudgetOverview, CategoryKey } from '../types';

/** month: "YYYY-MM", bỏ trống là tháng hiện tại. Không xem được tháng trong tương lai. */
export async function getBudgetOverview(month?: string): Promise<BudgetOverview> {
  await delay();
  const account = requireAccount();
  const now = new Date();
  const ref = month ? parseMonthKey(month) : new Date(now.getFullYear(), now.getMonth(), 1);
  if (!ref) throw new ApiError('Tháng không hợp lệ.', 'VALIDATION');
  if (toMonthKey(ref) > toMonthKey(now)) throw new ApiError('Không xem được ngân sách của tháng chưa tới.', 'VALIDATION');
  return buildBudgetOverview(account.transactions, account.budgets, ref, now);
}

/** limit = null để xóa ngân sách của danh mục. */
export async function setBudget(category: CategoryKey, limit: number | null): Promise<void> {
  await delay(300, 500);
  const account = requireAccount();
  if (!isBudgetable(category)) {
    throw new ApiError(`Không đặt được ngân sách cho danh mục "${getCategory(category).label}".`, 'VALIDATION');
  }

  const { [category]: _previous, ...rest } = account.budgets;
  if (limit === null) {
    saveAccount({ ...account, budgets: rest });
    return;
  }
  const error = validateBudgetLimit(limit);
  if (error) throw new ApiError(error, 'VALIDATION');
  saveAccount({ ...account, budgets: { ...rest, [category]: limit } });
}
