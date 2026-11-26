import { Link } from 'react-router-dom';
import { getCategory } from '../../data/categories';
import { formatDate, formatTime } from '../../utils/format';
import { cx } from '../../utils/cx';
import Money from '../common/Money';
import type { Transaction } from '../../types';

interface TransactionItemProps {
  tx: Transaction;
  hidden?: boolean;
  showDate?: boolean;
}

/** Một dòng giao dịch, bấm vào để xem chi tiết. showDate = false khi danh sách đã gom theo ngày. */
export default function TransactionItem({ tx, hidden = false, showDate = true }: TransactionItemProps) {
  const category = getCategory(tx.category);
  const when = showDate ? `${formatTime(tx.createdAt)} · ${formatDate(tx.createdAt)}` : formatTime(tx.createdAt);

  return (
    <Link to={`/transactions/${tx.id}`} className="tx-item">
      <span className="tx-item__icon" style={{ backgroundColor: `${category.color}1f`, color: category.color }} aria-hidden="true">
        {category.icon}
      </span>
      <span className="tx-item__body">
        <span className="tx-item__title">{tx.title}</span>
        <span className="tx-item__meta">
          {category.label} · {when}
        </span>
      </span>
      <Money
        amount={tx.amount}
        type={tx.type}
        hidden={hidden}
        className={cx('tx-item__amount', tx.type === 'income' ? 'text-income' : 'text-expense')}
      />
    </Link>
  );
}
