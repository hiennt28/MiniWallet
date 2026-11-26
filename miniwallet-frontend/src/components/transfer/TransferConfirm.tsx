import { formatPhone, formatVND } from '../../utils/format';
import { TRANSFER_LIMITS } from '../../utils/validators';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import type { Contact } from '../../types';

interface TransferConfirmProps {
  phone: string;
  amount: number;
  note: string;
  recipient: Contact | undefined;
  balance: number;
  needsOtp: boolean;
  budgetWarning?: string;
  error: string;
  onBack: () => void;
  onConfirm: () => void;
}

export default function TransferConfirm({ phone, amount, note, recipient, balance, needsOtp, budgetWarning, error, onBack, onConfirm }: TransferConfirmProps) {
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

      {budgetWarning && (
        <div className="alert alert--warning" role="status">
          {budgetWarning}
        </div>
      )}

      {needsOtp && (
        <div className="alert alert--warning">Giao dịch từ {formatVND(TRANSFER_LIMITS.otpFrom)} trở lên cần xác thực thêm bằng mã OTP sau khi nhập PIN.</div>
      )}

      {!recipient && (
        <div className="alert alert--warning">Số điện thoại này chưa có trong danh bạ. Hãy chắc chắn bạn đã nhập đúng.</div>
      )}

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="button-row">
        <Button variant="secondary" onClick={onBack}>
          Quay lại
        </Button>
        <Button onClick={onConfirm}>Tiếp tục</Button>
      </div>
    </section>
  );
}
