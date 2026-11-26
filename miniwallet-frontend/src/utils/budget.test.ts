import { describe, expect, it } from 'vitest';
import {
  BUDGETABLE_CATEGORIES,
  budgetImpact,
  budgetStatus,
  buildBudgetOverview,
  computeBudgetItem,
  parseMonthKey,
  shiftMonth,
  toMonthKey,
  validateBudgetLimit,
} from './budget';
import { createDemoAccount } from '../data/seed';
import type { CategoryKey, Transaction } from '../types';

const nov = new Date(2026, 10, 1);
const now = new Date(2026, 10, 10, 12); // 10/11/2026, tháng 11 có 30 ngày

let id = 0;
const tx = (category: CategoryKey, amount: number, date: Date, type: Transaction['type'] = 'expense'): Transaction => ({
  id: String((id += 1)),
  type,
  category,
  title: category,
  amount,
  status: 'success',
  createdAt: date.toISOString(),
});

describe('tháng', () => {
  it('chuyển đổi và cộng trừ tháng, kể cả qua năm', () => {
    expect(toMonthKey(nov)).toBe('2026-11');
    expect(parseMonthKey('2026-11')?.getMonth()).toBe(10);
    expect(parseMonthKey('2026-13')).toBeNull();
    expect(parseMonthKey('abc')).toBeNull();
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});

describe('trạng thái ngân sách', () => {
  it('dưới 80% là bình thường, từ 80% là sắp hết, vượt 100% là đã vượt', () => {
    expect(budgetStatus(790_000, 1_000_000)).toBe('ok');
    expect(budgetStatus(800_000, 1_000_000)).toBe('warning');
    expect(budgetStatus(1_000_000, 1_000_000)).toBe('warning');
    expect(budgetStatus(1_000_001, 1_000_000)).toBe('over');
  });

  it('chỉ cho đặt ngân sách với chi tiêu thật, không gồm rút tiền và các khoản thu', () => {
    expect(BUDGETABLE_CATEGORIES).toContain('food');
    expect(BUDGETABLE_CATEGORIES).toContain('transfer_out');
    expect(BUDGETABLE_CATEGORIES).not.toContain('withdraw');
    expect(BUDGETABLE_CATEGORIES).not.toContain('salary');
  });

  it('kiểm tra hạn mức', () => {
    expect(validateBudgetLimit(0)).toBeTruthy();
    expect(validateBudgetLimit(40_000)).toMatch(/tối thiểu/);
    expect(validateBudgetLimit(1_000_000)).toBeUndefined();
  });
});

describe('computeBudgetItem', () => {
  it('tháng hiện tại: ước tính cuối tháng theo tốc độ chi và gợi ý mỗi ngày', () => {
    // 10 ngày chi 1.000.000 → 30 ngày ~ 3.000.000; còn 21 ngày (tính cả hôm nay) cho 1.100.000
    const item = computeBudgetItem('food', 2_100_000, 1_000_000, nov, now);
    expect(item.projected).toBe(3_000_000);
    expect(item.dailyAllowance).toBe(Math.floor(1_100_000 / 21));
    expect(item.status).toBe('ok');
  });

  it('ngày đầu tháng không chia cho 0', () => {
    const item = computeBudgetItem('food', 1_000_000, 50_000, nov, new Date(2026, 10, 1, 8));
    expect(item.projected).toBe(1_500_000);
    expect(item.dailyAllowance).toBe(Math.floor(950_000 / 30));
  });

  it('tháng đã qua: ước tính bằng số đã chi, không còn gợi ý mỗi ngày', () => {
    const item = computeBudgetItem('food', 1_000_000, 1_200_000, new Date(2026, 9, 1), now);
    expect(item).toMatchObject({ projected: 1_200_000, dailyAllowance: 0, status: 'over' });
  });

  it('đã vượt thì gợi ý mỗi ngày là 0', () => {
    expect(computeBudgetItem('food', 1_000_000, 1_500_000, nov, now).dailyAllowance).toBe(0);
  });
});

describe('buildBudgetOverview', () => {
  const list = [
    tx('food', 900_000, new Date(2026, 10, 3)),
    tx('food', 200_000, new Date(2026, 9, 28)), // tháng trước, không tính
    tx('shopping', 300_000, new Date(2026, 10, 5)),
    tx('transport', 100_000, new Date(2026, 10, 6)),
    tx('bills', 400_000, new Date(2026, 10, 7)),
    tx('withdraw', 5_000_000, new Date(2026, 10, 8)), // rút tiền không tính là chi tiêu
    tx('salary', 15_000_000, new Date(2026, 10, 5), 'income'),
  ];

  it('chỉ tính chi tiêu trong tháng, sắp xếp danh mục đáng lo lên trước', () => {
    const o = buildBudgetOverview(list, { food: 1_000_000, shopping: 250_000, transport: 1_000_000 }, nov, now);
    expect(o.items.map((i) => [i.category, i.status])).toEqual([
      ['shopping', 'over'],
      ['food', 'warning'],
      ['transport', 'ok'],
    ]);
    expect(o.totalLimit).toBe(2_250_000);
    expect(o.totalSpent).toBe(1_300_000);
    expect(o.isCurrentMonth).toBe(true);
    expect(o.daysLeft).toBe(21);
  });

  it('liệt kê danh mục chưa đặt ngân sách kèm số đã chi', () => {
    const o = buildBudgetOverview(list, { food: 1_000_000 }, nov, now);
    expect(o.unbudgeted[0]).toEqual({ category: 'bills', total: 400_000 });
    expect(o.unbudgeted.map((u) => u.category)).not.toContain('withdraw');
  });
});

describe('budgetImpact', () => {
  it('báo trước khoản chi sẽ làm vượt ngân sách bao nhiêu', () => {
    expect(budgetImpact({ limit: 1_000_000, spent: 700_000 }, 100_000)).toEqual({ status: 'warning', after: 800_000, overBy: 0 });
    expect(budgetImpact({ limit: 1_000_000, spent: 700_000 }, 500_000)).toEqual({ status: 'over', after: 1_200_000, overBy: 200_000 });
  });
});

describe('ngân sách mẫu', () => {
  it('tài khoản demo luôn có đủ các trạng thái để trình diễn (trừ khi tháng chưa chi gì)', () => {
    for (const day of [new Date(2026, 10, 25), new Date(2026, 11, 20), new Date(2027, 0, 12)]) {
      const account = createDemoAccount(day);
      const o = buildBudgetOverview(account.transactions, account.budgets, new Date(day.getFullYear(), day.getMonth(), 1), day);
      const statuses = new Set(o.items.map((i) => i.status));
      expect(statuses).toEqual(new Set(['over', 'warning', 'ok']));
    }
  });
});
