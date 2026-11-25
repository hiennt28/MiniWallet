import { digitsOnly, formatAmountInput, formatVND } from '../../utils/format';
import { TRANSFER_LIMITS } from '../../utils/validators';
import { cx } from '../../utils/cx';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import Field from '../common/Field';
import Money from '../common/Money';

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000];

export default function TransferForm({ values, errors, error, contacts, recipient, balance, hideBalance, onChange, onSubmit }) {
  const phone = digitsOnly(values.phone);

  return (
    <form className="card form" onSubmit={onSubmit} noValidate>
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      {contacts.length > 0 && (
        <div className="form__section">
          <p className="form__section-title">Danh bạ gần đây</p>
          <div className="contact-chips">
            {contacts.map((c) => (
              <button
                key={c.phone}
                type="button"
                className={cx('contact-chip', phone === c.phone && 'contact-chip--active')}
                aria-pressed={phone === c.phone}
                onClick={() => onChange('phone', c.phone)}
              >
                <Avatar name={c.name} size="sm" />
                <span>{c.name.split(' ').pop()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Field
        id="transfer-phone"
        label="Số điện thoại người nhận"
        error={errors.phone}
        hint={recipient ? `Người nhận: ${recipient.name}` : 'Ví dụ: 0987654321'}
      >
        {(props) => (
          <input
            {...props}
            className="input"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Nhập số điện thoại"
            value={values.phone}
            onChange={(e) => onChange('phone', digitsOnly(e.target.value).slice(0, 10))}
          />
        )}
      </Field>

      <Field
        id="transfer-amount"
        label="Số tiền"
        error={errors.amount}
        hint={
          <>
            Số dư: <Money amount={balance} hidden={hideBalance} /> · Tối thiểu {formatVND(TRANSFER_LIMITS.min)}
          </>
        }
      >
        {(props) => (
          <div className="input-group">
            <input
              {...props}
              className="input input--amount"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={values.amount}
              onChange={(e) => onChange('amount', formatAmountInput(e.target.value))}
            />
            <span className="input-group__suffix">₫</span>
          </div>
        )}
      </Field>

      <div className="quick-amounts" role="group" aria-label="Chọn nhanh số tiền">
        {QUICK_AMOUNTS.map((amount) => (
          <button key={amount} type="button" className="chip" onClick={() => onChange('amount', formatAmountInput(String(amount)))}>
            {formatVND(amount)}
          </button>
        ))}
      </div>

      <Field
        id="transfer-note"
        label="Lời nhắn (không bắt buộc)"
        error={errors.note}
        counter={`${values.note.length}/${TRANSFER_LIMITS.noteMax}`}
      >
        {(props) => (
          <textarea
            {...props}
            className="input textarea"
            rows={2}
            maxLength={TRANSFER_LIMITS.noteMax}
            placeholder="Ví dụ: Trả tiền ăn trưa"
            value={values.note}
            onChange={(e) => onChange('note', e.target.value)}
          />
        )}
      </Field>

      <Button type="submit" block size="lg">
        Tiếp tục
      </Button>
    </form>
  );
}
