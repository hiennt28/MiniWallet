import { formatPhone, formatVND } from '../../utils/format';
import Avatar from '../common/Avatar';
import Button from '../common/Button';

export default function TransferConfirm({ phone, amount, note, recipient, balance, submitting, error, onBack, onConfirm }) {
  const name = recipient?.name ?? 'Người nhận mới';

  return (
    <section className="card" aria-labelledby="confirm-title">
      <h2 className="card__title" id="confirm-title">
        Kiểm tra lại thông tin
      </h2>

      <div className="recipient">
        <Avatar name={recipient?.name ?? '?'} size="lg" />
        <div>
          <p className="recipient__name">{name}</p>
          <p className="recipient__phone">{formatPhone(phone)}</p>
        </div>
      </div>

      <p className="confirm-amount">{formatVND(amount)}</p>

      <dl className="detail-list">
        <div className="detail-list__row">
          <dt>Phí giao dịch</dt>
          <dd className="text-income">Miễn phí</dd>
        </div>
        <div className="detail-list__row">
          <dt>Lời nhắn</dt>
          <dd>{note || <span className="text-muted">Không có</span>}</dd>
        </div>
        <div className="detail-list__row">
          <dt>Số dư sau giao dịch</dt>
          <dd>{formatVND(balance - amount)}</dd>
        </div>
      </dl>

      {!recipient && (
        <div className="alert alert--warning">Số điện thoại này chưa có trong danh bạ. Hãy chắc chắn bạn đã nhập đúng.</div>
      )}

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="button-row">
        <Button variant="secondary" onClick={onBack} disabled={submitting}>
          Quay lại
        </Button>
        <Button onClick={onConfirm} loading={submitting}>
          Xác nhận chuyển
        </Button>
      </div>
    </section>
  );
}
