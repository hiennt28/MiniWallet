import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getLinkedBanks, linkBank, unlinkBank } from '../api/bankApi';
import { toApiError } from '../api/errors';
import PinInput from '../components/auth/PinInput';
import Button from '../components/common/Button';
import Field from '../components/common/Field';
import Modal from '../components/common/Modal';
import { EmptyState, ErrorState, TransactionListSkeleton } from '../components/common/States';
import BankBadge from '../components/money/BankBadge';
import { useWallet } from '../context/WalletContext';
import { BANKS } from '../data/banks';
import { useAsync } from '../hooks/useAsync';
import { digitsOnly, formatDate, toBankHolderName } from '../utils/format';
import { BANK_ACCOUNT_LENGTH, isValidPin, MAX_LINKED_BANKS, validateBankLink, type BankLinkErrors } from '../utils/validators';
import type { LinkedBankView } from '../types';

function LinkBankDialog({ open, holderName, onClose, onLinked }: { open: boolean; holderName: string; onClose: () => void; onLinked: (bank: LinkedBankView) => void }) {
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<BankLinkErrors & { pin?: string }>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setBankCode('');
    setAccountNumber('');
    setPin('');
    setErrors({});
    setError('');
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: typeof errors = validateBankLink({ bankCode, accountNumber }, { knownBank: (code) => BANKS.some((b) => b.code === code) });
    if (!isValidPin(pin)) next.pin = 'Nhập mã PIN 6 số để xác nhận.';
    setErrors(next);
    const firstField = Object.keys(next)[0];
    if (firstField) {
      document.getElementById(`link-${firstField}`)?.focus();
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const bank = await linkBank({ bankCode, accountNumber, pin });
      reset();
      onLinked(bank);
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'PIN_INVALID') setErrors({ pin: apiError.message });
      else setError(apiError.message);
      setPin('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Liên kết ngân hàng"
      onClose={() => {
        if (submitting) return;
        reset();
        onClose();
      }}
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <Field id="link-bankCode" label="Ngân hàng" error={errors.bankCode}>
          {(props) => (
            <select
              {...props}
              className="input"
              value={bankCode}
              onChange={(e) => {
                setBankCode(e.target.value);
                setErrors(({ bankCode: _cleared, ...rest }) => rest);
              }}
            >
              <option value="">Chọn ngân hàng</option>
              {BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          id="link-accountNumber"
          label="Số tài khoản"
          error={errors.accountNumber}
          hint={`${BANK_ACCOUNT_LENGTH.min}–${BANK_ACCOUNT_LENGTH.max} chữ số. Thử số có đuôi 0000 để xem ngân hàng từ chối.`}
        >
          {(props) => (
            <input
              {...props}
              className="input mono"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ví dụ: 0071000123456"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(digitsOnly(e.target.value).slice(0, BANK_ACCOUNT_LENGTH.max));
                setErrors(({ accountNumber: _cleared, ...rest }) => rest);
              }}
            />
          )}
        </Field>

        <div className="detail-list__row">
          <span className="text-muted">Chủ tài khoản</span>
          <strong>{holderName}</strong>
        </div>
        <p className="field__hint">Tên chủ tài khoản ngân hàng phải trùng với tên ví.</p>

        <Field id="link-pin" label="Mã PIN" error={errors.pin}>
          {(props) => (
            <PinInput
              {...props}
              value={pin}
              onChange={(v) => {
                setPin(v);
                setErrors(({ pin: _cleared, ...rest }) => rest);
              }}
            />
          )}
        </Field>

        <Button type="submit" block loading={submitting}>
          Liên kết
        </Button>
      </form>
    </Modal>
  );
}

export default function BanksPage() {
  const { profile, frozen } = useWallet();
  const { data: banks, error, reload } = useAsync(() => getLinkedBanks(), []);
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedBankView | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const full = (banks?.length ?? 0) >= MAX_LINKED_BANKS;

  async function handleUnlink() {
    if (!unlinkTarget) return;
    setUnlinking(true);
    try {
      await unlinkBank(unlinkTarget.id);
      setMessage({ type: 'success', text: `Đã hủy liên kết ${unlinkTarget.bankName} ${unlinkTarget.accountMasked}.` });
      reload();
    } catch (err) {
      setMessage({ type: 'error', text: toApiError(err).message });
    } finally {
      setUnlinking(false);
      setUnlinkTarget(null);
    }
  }

  return (
    <div className="page page--narrow">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Dùng để nạp tiền vào ví và rút tiền về</p>
          <h1 className="page-title">Tài khoản ngân hàng</h1>
        </div>
      </header>

      {message && (
        <div className={`alert alert--${message.type}`} role="status">
          {message.text}
        </div>
      )}

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">
            Đã liên kết {banks ? `(${banks.length}/${MAX_LINKED_BANKS})` : ''}
          </h2>
          <Button size="sm" onClick={() => setLinkOpen(true)} disabled={!banks || full || frozen}>
            Liên kết mới
          </Button>
        </div>
        {frozen && <p className="field__hint">Ví đang bị khóa nên không thể liên kết thêm ngân hàng.</p>}
        {full && <p className="field__hint">Đã đạt tối đa {MAX_LINKED_BANKS} tài khoản. Hủy một liên kết để thêm tài khoản khác.</p>}

        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : !banks ? (
          <TransactionListSkeleton count={2} />
        ) : banks.length === 0 ? (
          <EmptyState title="Chưa có ngân hàng nào" description="Liên kết tài khoản ngân hàng để nạp và rút tiền." />
        ) : (
          <ul className="bank-list">
            {banks.map((bank) => (
              <li key={bank.id} className="bank-list__item">
                <BankBadge code={bank.bankCode} />
                <span className="bank-option__text">
                  <strong>
                    {bank.bankName} · <span className="mono">{bank.accountMasked}</span>
                  </strong>
                  <span>
                    {bank.holderName} · Liên kết {formatDate(bank.linkedAt)}
                  </span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => setUnlinkTarget(bank)} aria-label={`Hủy liên kết ${bank.bankName} ${bank.accountMasked}`}>
                  Hủy liên kết
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="button-row">
        <Link to="/topup" className="btn btn--secondary">
          <span>Nạp tiền</span>
        </Link>
        <Link to="/withdraw" className="btn btn--secondary">
          <span>Rút tiền</span>
        </Link>
      </div>

      <LinkBankDialog
        open={linkOpen}
        holderName={profile ? toBankHolderName(profile.name) : ''}
        onClose={() => setLinkOpen(false)}
        onLinked={(bank) => {
          setLinkOpen(false);
          setMessage({ type: 'success', text: `Đã liên kết ${bank.bankName} ${bank.accountMasked}.` });
          reload();
        }}
      />

      <Modal
        open={unlinkTarget !== null}
        title="Hủy liên kết ngân hàng?"
        onClose={() => !unlinking && setUnlinkTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setUnlinkTarget(null)} disabled={unlinking}>
              Không
            </Button>
            <Button variant="danger" onClick={handleUnlink} loading={unlinking}>
              Hủy liên kết
            </Button>
          </>
        }
      >
        <p>
          Bạn sẽ không nạp hay rút tiền qua {unlinkTarget?.bankName} {unlinkTarget?.accountMasked} được nữa. Có thể liên kết lại bất cứ lúc nào.
        </p>
      </Modal>
    </div>
  );
}
