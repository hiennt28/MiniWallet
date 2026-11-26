import { Link } from 'react-router-dom';
import { getBudgetOverview } from '../../api/budgetApi';
import { useAsync } from '../../hooks/useAsync';
import { EmptyState, ErrorState, Skeleton } from '../common/States';
import BudgetRow from './BudgetRow';

const MAX_ROWS = 3;

/** Thẻ ngân sách ở trang Tổng quan: các danh mục đáng lo nhất của tháng này. */
export default function BudgetCard({ hidden }: { hidden: boolean }) {
  const { data, error, reload } = useAsync(() => getBudgetOverview(), []);
  const alerts = data?.items.filter((i) => i.status !== 'ok').length ?? 0;

  return (
    <section className="card" aria-labelledby="budget-card-title">
      <div className="card__header">
        <h2 className="card__title" id="budget-card-title">
          Ngân sách tháng này
          {alerts > 0 && <span className="badge badge--budget-over budget-card__count">{alerts} cảnh báo</span>}
        </h2>
        <Link to="/budgets" className="link">
          {data?.items.length ? 'Xem tất cả' : 'Đặt ngân sách'}
        </Link>
      </div>
      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !data ? (
        <>
          <Skeleton height="48px" />
          <Skeleton height="48px" />
        </>
      ) : data.items.length === 0 ? (
        <EmptyState title="Chưa có ngân sách" description="Đặt hạn mức cho từng danh mục để được cảnh báo khi sắp chi quá tay." />
      ) : (
        <ul className="budget-list">
          {data.items.slice(0, MAX_ROWS).map((item) => (
            <li key={item.category}>
              <BudgetRow item={item} hidden={hidden} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
