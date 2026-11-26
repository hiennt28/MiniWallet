import { Link } from 'react-router-dom';
import { formatDateTime, formatPhone, formatVND } from '../../utils/format';
import { CheckIcon } from '../icons';
import Button from '../common/Button';
import type { Transaction } from '../../types';

interface TransferSuccessProps {
  tx: Transaction;
  recipientName: string | undefined;
  onNewTransfer: () => void;
}

export default function TransferSuccess({ tx, recipientName, onNewTransfer }: TransferSuccessProps) {
  return (
    <section className="card success" aria-labelledby="success-title">
      <span className="success__icon" aria-hidden="true">
        <CheckIcon size={32} />
      </span>
      <h2 className="success__title" id="success-title">
        Chuyển tiền thành công
      </h2>
      <p className="success__amount">{formatVND(tx.amount)}</p>

      <dl className="detail-list">
        <div className="detail-list__row">
          <dt>Người nhận</dt>
          <dd>{recipientName ?? formatPhone(tx.phone)}</dd>
        </div>
        <div className="detail-list__row">
          <dt>Số điện thoại</dt>
          <dd>{formatPhone(tx.phone)}</dd>
        </div>
        {tx.note && (
          <div className="detail-list__row">
            <dt>Lời nhắn</dt>
            <dd>{tx.note}</dd>
          </div>
        )}
        <div className="detail-list__row">
          <dt>Thời gian</dt>
          <dd>{formatDateTime(tx.createdAt)}</dd>
        </div>
        <div className="detail-list__row">
          <dt>Mã giao dịch</dt>
          <dd className="mono">{tx.id}</dd>
        </div>
      </dl>

      <div className="button-row">
        <Button variant="secondary" onClick={onNewTransfer}>
          Chuyển tiếp
        </Button>
        <Link to="/" className="btn btn--primary">
          <span>Về trang chủ</span>
        </Link>
      </div>
      <Link to={`/transactions/${tx.id}`} className="link">
        Xem chi tiết giao dịch
      </Link>
    </section>
  );
}
