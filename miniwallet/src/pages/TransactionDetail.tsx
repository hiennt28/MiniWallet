import { Link, useNavigate, useParams } from 'react-router-dom';
import { getTransaction } from '../api/walletApi';
import Money from '../components/common/Money';
import { EmptyState, ErrorState, Spinner } from '../components/common/States';
import { ChevronLeftIcon } from '../components/icons';
import { useWallet } from '../context/WalletContext';
import { getCategory } from '../data/categories';
import { useAsync } from '../hooks/useAsync';
import { formatDateTime, formatPhone } from '../utils/format';
import { cx } from '../utils/cx';

export default function TransactionDetail() {
  // Route "transactions/:id" luôn có id; để chuỗi rỗng thì API trả NOT_FOUND
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { hideBalance } = useWallet();
  const { data: tx, error, loading, reload } = useAsync(() => getTransaction(id), [id]);

  let content;
  if (loading || (!tx && !error)) {
    content = <Spinner />;
  } else if (error?.code === 'NOT_FOUND') {
    content = (
      <EmptyState
        title="Không tìm thấy giao dịch"
        description="Giao dịch có thể đã bị xóa khi khôi phục dữ liệu mẫu."
        action={
          <Link to="/transactions" className="btn btn--secondary">
            <span>Về lịch sử giao dịch</span>
          </Link>
        }
      />
    );
  } else if (error || !tx) {
    content = <ErrorState message={error?.message} onRetry={reload} />;
  } else {
    const category = getCategory(tx.category);
    content = (
      <>
        <div className="detail-hero">
          <span className="detail-hero__icon" style={{ backgroundColor: `${category.color}1f`, color: category.color }} aria-hidden="true">
            {category.icon}
          </span>
          <p className="detail-hero__title">{tx.title}</p>
          <Money
            amount={tx.amount}
            type={tx.type}
            hidden={hideBalance}
            className={cx('detail-hero__amount', tx.type === 'income' ? 'text-income' : 'text-expense')}
          />
          <span className="badge badge--success">Thành công</span>
        </div>

        <dl className="detail-list">
          <div className="detail-list__row">
            <dt>Loại giao dịch</dt>
            <dd>{tx.type === 'income' ? 'Tiền vào' : 'Tiền ra'}</dd>
          </div>
          <div className="detail-list__row">
            <dt>Danh mục</dt>
            <dd>{category.label}</dd>
          </div>
          <div className="detail-list__row">
            <dt>Thời gian</dt>
            <dd>{formatDateTime(tx.createdAt)}</dd>
          </div>
          {tx.phone && (
            <div className="detail-list__row">
              <dt>Số điện thoại</dt>
              <dd>{formatPhone(tx.phone)}</dd>
            </div>
          )}
          {tx.note && (
            <div className="detail-list__row">
              <dt>Lời nhắn</dt>
              <dd>{tx.note}</dd>
            </div>
          )}
          <div className="detail-list__row">
            <dt>Mã giao dịch</dt>
            <dd className="mono">{tx.id}</dd>
          </div>
        </dl>
      </>
    );
  }

  return (
    <div className="page page--narrow">
      <button type="button" className="back-link" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/transactions'))}>
        <ChevronLeftIcon size={18} />
        <span>Quay lại</span>
      </button>
      <h1 className="page-title">Chi tiết giao dịch</h1>
      <section className="card">{content}</section>
    </div>
  );
}
