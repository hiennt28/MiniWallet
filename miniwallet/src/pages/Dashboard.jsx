import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../api/walletApi';
import DonutChart from '../components/charts/DonutChart';
import Money from '../components/common/Money';
import { EmptyState, ErrorState, Skeleton, TransactionListSkeleton } from '../components/common/States';
import { ArrowDownLeftIcon, ArrowUpRightIcon, EyeIcon, EyeOffIcon } from '../components/icons';
import TransactionItem from '../components/transaction/TransactionItem';
import { useWallet } from '../context/WalletContext';
import { getCategory } from '../data/categories';
import { useAsync } from '../hooks/useAsync';

function StatCard({ label, amount, type, loading, hidden }) {
  const Icon = type === 'income' ? ArrowDownLeftIcon : ArrowUpRightIcon;
  return (
    <div className="card stat">
      <span className={`stat__icon stat__icon--${type}`} aria-hidden="true">
        <Icon />
      </span>
      <div>
        <p className="stat__label">{label}</p>
        {loading ? <Skeleton width="120px" height="1.4rem" /> : <Money className="stat__value" amount={amount} hidden={hidden} />}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { balance, profile, hideBalance, toggleBalance } = useWallet();
  const { data, error, loading, reload } = useAsync(() => getDashboard(), []);
  const showSkeleton = loading && !data;
  const monthLabel = `tháng ${new Date().getMonth() + 1}`;

  const chartData = useMemo(
    () =>
      (data?.byCategory ?? []).map(({ category, total }) => {
        const c = getCategory(category);
        return { key: category, label: c.label, value: total, color: c.color };
      }),
    [data],
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Xin chào{profile ? `, ${profile.name.split(' ').pop()}` : ''}</p>
          <h1 className="page-title">Tổng quan</h1>
        </div>
      </header>

      <section className="balance-card" aria-label="Số dư ví">
        <div className="balance-card__top">
          <span>Số dư ví</span>
          <button
            type="button"
            className="icon-btn icon-btn--on-dark"
            onClick={toggleBalance}
            aria-label={hideBalance ? 'Hiện số dư' : 'Ẩn số dư'}
            aria-pressed={hideBalance}
          >
            {hideBalance ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <p className="balance-card__amount">
          {profile ? <Money amount={balance} hidden={hideBalance} /> : <Skeleton width="60%" height="2.25rem" light />}
        </p>
        <div className="balance-card__actions">
          <Link to="/transfer" className="btn btn--on-dark">
            <span>Chuyển tiền</span>
          </Link>
          <Link to="/transactions" className="btn btn--ghost-on-dark">
            <span>Lịch sử</span>
          </Link>
        </div>
      </section>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : (
        <>
          <section className="stats-grid" aria-label={`Thu chi ${monthLabel}`}>
            <StatCard label={`Tiền vào ${monthLabel}`} type="income" amount={data?.month.income} loading={showSkeleton} hidden={hideBalance} />
            <StatCard label={`Tiền ra ${monthLabel}`} type="expense" amount={data?.month.expense} loading={showSkeleton} hidden={hideBalance} />
          </section>

          <div className="dashboard-grid">
            <section className="card">
              <div className="card__header">
                <h2 className="card__title">Chi tiêu {monthLabel}</h2>
              </div>
              {showSkeleton ? (
                <Skeleton height="200px" />
              ) : chartData.length > 0 ? (
                <DonutChart data={chartData} hidden={hideBalance} centerLabel="Tổng chi" />
              ) : (
                <EmptyState title="Chưa có chi tiêu" description="Các khoản chi trong tháng sẽ hiện ở đây." />
              )}
            </section>

            <section className="card">
              <div className="card__header">
                <h2 className="card__title">Giao dịch gần đây</h2>
                <Link to="/transactions" className="link">
                  Xem tất cả
                </Link>
              </div>
              {showSkeleton ? (
                <TransactionListSkeleton count={5} />
              ) : data.recent.length > 0 ? (
                <ul className="tx-list">
                  {data.recent.map((tx) => (
                    <li key={tx.id}>
                      <TransactionItem tx={tx} hidden={hideBalance} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Chưa có giao dịch" />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
