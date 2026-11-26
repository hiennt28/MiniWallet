import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBudgetOverview } from '../api/budgetApi';
import BudgetDialog from '../components/budget/BudgetDialog';
import BudgetRow, { BudgetProgress } from '../components/budget/BudgetRow';
import Money from '../components/common/Money';
import { EmptyState, ErrorState, Skeleton } from '../components/common/States';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons';
import { useWallet } from '../context/WalletContext';
import { getCategory } from '../data/categories';
import { useAsync } from '../hooks/useAsync';
import { budgetStatus, parseMonthKey, shiftMonth, toMonthKey } from '../utils/budget';
import type { BudgetOverview, CategoryKey } from '../types';

/** Chỉ cho xem lại tối đa 12 tháng. */
const HISTORY_MONTHS = 12;

function monthTitle(key: string): string {
  const date = parseMonthKey(key);
  return date ? `Tháng ${date.getMonth() + 1}/${date.getFullYear()}` : key;
}

function Summary({ data, hidden }: { data: BudgetOverview; hidden: boolean }) {
  const over = data.items.filter((i) => i.status === 'over').length;
  const warning = data.items.filter((i) => i.status === 'warning').length;
  const ratio = data.totalLimit ? data.totalSpent / data.totalLimit : 0;
  const status = budgetStatus(data.totalSpent, data.totalLimit);

  return (
    <section className="card budget-summary" aria-label="Tổng ngân sách">
      <div className="budget-summary__numbers">
        <div>
          <p className="stat__label">Đã chi (các danh mục có ngân sách)</p>
          <Money className="budget-summary__value" amount={data.totalSpent} hidden={hidden} />
        </div>
        <div className="budget-summary__limit">
          <p className="stat__label">Tổng hạn mức</p>
          <Money className="budget-summary__value" amount={data.totalLimit} hidden={hidden} />
        </div>
      </div>
      <BudgetProgress item={{ spent: data.totalSpent, limit: data.totalLimit, ratio, status }} label="Tổng ngân sách" hidden={hidden} />
      <p className="text-muted">
        {over > 0 && <strong className="text-expense">{over} danh mục đã vượt. </strong>}
        {warning > 0 && <strong className="text-warning">{warning} danh mục sắp hết. </strong>}
        {over === 0 && warning === 0 && 'Mọi danh mục đều trong hạn mức. '}
        {data.isCurrentMonth && `Còn ${data.daysLeft} ngày trong tháng.`}
      </p>
    </section>
  );
}

export default function BudgetsPage() {
  const { hideBalance } = useWallet();
  const [params, setParams] = useSearchParams();
  const currentMonth = toMonthKey(new Date());
  const requested = params.get('month');
  // Tháng trên URL không hợp lệ hoặc ở tương lai thì dùng tháng hiện tại
  const month = requested && parseMonthKey(requested) && requested <= currentMonth ? requested : currentMonth;
  const oldest = shiftMonth(currentMonth, -(HISTORY_MONTHS - 1));

  const { data, error, loading, reload } = useAsync(() => getBudgetOverview(month), [month]);
  const [editing, setEditing] = useState<CategoryKey | null>(null);
  const [message, setMessage] = useState('');

  function goTo(next: string) {
    setMessage('');
    setParams(next === currentMonth ? {} : { month: next }, { replace: true });
  }

  const editingItem = data?.items.find((i) => i.category === editing);
  const editingSpent = editingItem?.spent ?? data?.unbudgeted.find((u) => u.category === editing)?.total ?? 0;

  return (
    <div className="page page--narrow">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Hạn mức chi tiêu mỗi tháng theo danh mục</p>
          <h1 className="page-title">Ngân sách</h1>
        </div>
      </header>

      <nav className="month-nav" aria-label="Chọn tháng">
        <button type="button" className="icon-btn" onClick={() => goTo(shiftMonth(month, -1))} disabled={month <= oldest} aria-label="Tháng trước">
          <ChevronLeftIcon />
        </button>
        <span className="month-nav__label" aria-live="polite">
          {monthTitle(month)}
          {month === currentMonth && <span className="text-muted"> · tháng này</span>}
        </span>
        <button type="button" className="icon-btn" onClick={() => goTo(shiftMonth(month, 1))} disabled={month >= currentMonth} aria-label="Tháng sau">
          <ChevronRightIcon />
        </button>
      </nav>

      {message && (
        <div className="alert alert--success" role="status">
          {message}
        </div>
      )}

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data ? (
        <section className="card" aria-busy="true">
          <Skeleton height="72px" />
          <Skeleton height="56px" />
          <Skeleton height="56px" />
        </section>
      ) : (
        <div className={loading ? 'is-refreshing budget-stack' : 'budget-stack'}>
          {!data.isCurrentMonth && (
            <p className="field__hint">Đang xem tháng đã qua theo hạn mức hiện tại. Hạn mức áp dụng chung cho mọi tháng.</p>
          )}
          {data.items.length > 0 && <Summary data={data} hidden={hideBalance} />}

          <section className="card" aria-labelledby="budget-list-title">
            <h2 className="card__title" id="budget-list-title">
              Danh mục có ngân sách
            </h2>
            {data.items.length === 0 ? (
              <EmptyState title="Chưa đặt ngân sách nào" description="Chọn một danh mục bên dưới để đặt hạn mức chi tiêu mỗi tháng." />
            ) : (
              <ul className="budget-list">
                {data.items.map((item) => (
                  <li key={item.category}>
                    <BudgetRow item={item} hidden={hideBalance} showForecast={data.isCurrentMonth} onEdit={() => setEditing(item.category)} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.unbudgeted.length > 0 && (
            <section className="card" aria-labelledby="unbudgeted-title">
              <h2 className="card__title" id="unbudgeted-title">
                Chưa đặt ngân sách
              </h2>
              <ul className="bank-list">
                {data.unbudgeted.map(({ category, total }) => {
                  const c = getCategory(category);
                  return (
                    <li key={category} className="bank-list__item">
                      <span className="tx-item__icon" style={{ backgroundColor: `${c.color}1f`, color: c.color }} aria-hidden="true">
                        {c.icon}
                      </span>
                      <span className="bank-option__text">
                        <strong>{c.label}</strong>
                        <span>
                          Đã chi <Money amount={total} hidden={hideBalance} />
                        </span>
                      </span>
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditing(category)}>
                        <span>Đặt ngân sách</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}

      <BudgetDialog
        category={editing}
        currentLimit={editingItem?.limit ?? null}
        spent={editingSpent}
        onClose={() => setEditing(null)}
        onSaved={(text) => {
          setEditing(null);
          setMessage(text);
          reload();
        }}
      />
    </div>
  );
}
