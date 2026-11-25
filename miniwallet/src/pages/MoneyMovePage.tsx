import { useEffect, useReducer, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { bankLabel, getLinkedBanks, topUp, withdraw } from '../api/bankApi';
import { toApiError, type ApiErrorCode } from '../api/errors';
import PinConfirm from '../components/auth/PinConfirm';
import Button from '../components/common/Button';
import Field from '../components/common/Field';
import FrozenNotice from '../components/common/FrozenNotice';
import Money from '../components/common/Money';
import { EmptyState, ErrorState, Skeleton, Spinner } from '../components/common/States';
import { CheckIcon } from '../components/icons';
import BankBadge from '../components/money/BankBadge';
import { createMoneyMoveState, moneyMoveReducer } from '../components/money/moneyMoveReducer';
import { useWallet } from '../context/WalletContext';
import { useAsync } from '../hooks/useAsync';
import { cx } from '../utils/cx';
import { formatAmountInput, formatDateTime, formatVND, parseAmount } from '../utils/format';
import { MONEY_MOVE_LIMITS, validateMoneyMove } from '../utils/validators';
import type { LinkedBankView, MoneyMoveMode, Transaction } from '../types';

const QUICK_AMOUNTS = [100_000, 200_000, 500_000, 1_000_000];

// Lỗi khiến không thể tiếp tục ở bước PIN: quay về form
const FATAL_CODES = new Set<ApiErrorCode>(['PIN_LOCKED', 'WALLET_FROZEN', 'VALIDATION', 'NOT_FOUND', 'BANK_INSUFFICIENT', 'INSUFFICIENT_BALANCE']);

const COPY = {
  topup: {
    title: 'Nạp tiền',
    eyebrow: 'Từ tài khoản ngân hàng đã liên kết vào ví',
    bankLabel: 'Nạp từ tài khoản',
    verb: 'Nạp',
    success: 'Nạp tiền thành công',
    again: 'Nạp tiếp',
  },
  withdraw: {
    title: 'Rút tiền',
    eyebrow: 'Từ ví về tài khoản ngân hàng đã liên kết',
    bankLabel: 'Rút về tài khoản',
    verb: 'Rút',
    success: 'Rút tiền thành công',
    again: 'Rút tiếp',
  },
} as const satisfies Record<MoneyMoveMode, Record<string, string>>;

function ModeTabs() {
  return (
    <nav className="segmented" aria-label="Nạp hoặc rút">
      <NavLink to="/topup" className="segmented__item">
        Nạp tiền
      </NavLink>
      <NavLink to="/withdraw" className="segmented__item">
        Rút tiền
      </NavLink>
    </nav>
  );
}

interface BankPickerProps {
  banks: LinkedBankView[];
  value: string;
  error?: string;
  legend: string;
  onChange: (bankId: string) => void;
}

/** Chọn ngân hàng bằng radio thật để dùng được bàn phím (mũi tên lên/xuống) và trình đọc màn hình. */
function BankPicker({ banks, value, error, legend, onChange }: BankPickerProps) {
  return (
    <fieldset className={cx('bank-picker', error && 'field--error')} aria-describedby={error ? 'bank-picker-error' : undefined}>
      <legend className="field__label">{legend}</legend>
      {banks.map((bank) => (
        <label key={bank.id} className={cx('bank-option', value === bank.id && 'bank-option--active')}>
          <input type="radio" name="bankId" value={bank.id} checked={value === bank.id} onChange={() => onChange(bank.id)} />
          <BankBadge code={bank.bankCode} />
          <span className="bank-option__text">
            <strong>{bank.bankName}</strong>
            <span>
              {bank.accountMasked} · {bank.holderName}
            </span>
          </span>
        </label>
      ))}
      {error && (
        <p className="field__error" id="bank-picker-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function MoneyMoveSuccess({ mode, tx, onAgain }: { mode: MoneyMoveMode; tx: Transaction; onAgain: () => void }) {
  const copy = COPY[mode];
  return (
    <section className="card success" aria-labelledby="money-success-title">
      <span className="success__icon" aria-hidden="true">
        <CheckIcon size={32} />
      </span>
      <h2 className="success__title" id="money-success-title">
        {copy.success}
      </h2>
      <p className="success__amount">{formatVND(tx.amount)}</p>
      <dl className="detail-list">
        <div className="detail-list__row">
          <dt>{mode === 'topup' ? 'Từ tài khoản' : 'Về tài khoản'}</dt>
          <dd>{tx.bankAccount}</dd>
        </div>
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
        <Button variant="secondary" onClick={onAgain}>
          {copy.again}
        </Button>
        <Link to="/" className="btn btn--primary">
          <span>Về trang chủ</span>
        </Link>
      </div>
    </section>
  );
}

export default function MoneyMovePage({ mode }: { mode: MoneyMoveMode }) {
  const wallet = useWallet();
  const banks = useAsync(() => getLinkedBanks(), []);
  const [state, dispatch] = useReducer(moneyMoveReducer, undefined, () => createMoneyMoveState());
  const copy = COPY[mode];
  const limits = MONEY_MOVE_LIMITS[mode];

  // Chọn sẵn ngân hàng đầu tiên khi tải xong danh sách
  const firstBankId = banks.data?.[0]?.id;
  useEffect(() => {
    if (firstBankId && !state.values.bankId) dispatch({ type: 'CHANGE', field: 'bankId', value: firstBankId });
  }, [firstBankId, state.values.bankId]);

  const amount = parseAmount(state.values.amount);
  const selectedBank = banks.data?.find((b) => b.id === state.values.bankId);

  function handleContinue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors = validateMoneyMove(mode, { bankId: selectedBank?.id ?? '', amount }, { balance: wallet.balance });
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'VALIDATION_FAILED', errors });
      if (errors.amount) document.getElementById('money-amount')?.focus();
      return;
    }
    dispatch({ type: 'GO_PIN' });
  }

  async function handlePin(pin: string) {
    if (!selectedBank) return;
    dispatch({ type: 'SUBMIT_START' });
    try {
      const tx = await (mode === 'topup' ? topUp : withdraw)({ bankId: selectedBank.id, amount, pin });
      dispatch({ type: 'SUCCESS', tx });
      wallet.refresh();
    } catch (error) {
      const err = toApiError(error);
      dispatch({ type: FATAL_CODES.has(err.code) ? 'CANCELLED' : 'SUBMIT_ERROR', message: err.message });
      if (err.code === 'NOT_FOUND') banks.reload();
      if (err.code === 'WALLET_FROZEN' || err.code === 'INSUFFICIENT_BALANCE') wallet.refresh();
    }
  }

  let content;
  if (wallet.frozen && state.step !== 'success') {
    content = <FrozenNotice error={state.error} />;
  } else if (banks.error) {
    content = <ErrorState message={banks.error.message} onRetry={banks.reload} />;
  } else if (!banks.data) {
    content = (
      <section className="card form" aria-busy="true">
        <Skeleton height="64px" />
        <Skeleton height="48px" />
        <Skeleton height="48px" />
      </section>
    );
  } else if (banks.data.length === 0) {
    content = (
      <section className="card">
        <EmptyState
          title="Chưa liên kết ngân hàng"
          description={`Liên kết một tài khoản ngân hàng để ${copy.verb.toLowerCase()} tiền.`}
          action={
            <Link to="/banks" className="btn btn--primary">
              <span>Liên kết ngân hàng</span>
            </Link>
          }
        />
      </section>
    );
  } else if (state.step === 'form' || (state.step === 'pin' && !selectedBank)) {
    // Ngân hàng đang chọn có thể vừa bị hủy liên kết ở tab khác: quay lại form
    content = (
      <form className="card form" onSubmit={handleContinue} noValidate>
        {state.error && (
          <div className="alert alert--error" role="alert">
            {state.error}
          </div>
        )}

        <BankPicker
          banks={banks.data}
          value={state.values.bankId}
          error={state.errors.bankId}
          legend={copy.bankLabel}
          onChange={(bankId) => dispatch({ type: 'CHANGE', field: 'bankId', value: bankId })}
        />
        <Link to="/banks" className="link">
          Quản lý tài khoản ngân hàng
        </Link>

        <Field
          id="money-amount"
          label="Số tiền"
          error={state.errors.amount}
          hint={
            <>
              {mode === 'withdraw' && (
                <>
                  Số dư: <Money amount={wallet.balance} hidden={wallet.hideBalance} /> ·{' '}
                </>
              )}
              Từ {formatVND(limits.min)} đến {formatVND(limits.max)} mỗi lần
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
                value={state.values.amount}
                onChange={(e) => dispatch({ type: 'CHANGE', field: 'amount', value: formatAmountInput(e.target.value) })}
              />
              <span className="input-group__suffix">₫</span>
            </div>
          )}
        </Field>

        <div className="quick-amounts" role="group" aria-label="Chọn nhanh số tiền">
          {QUICK_AMOUNTS.map((value) => (
            <button key={value} type="button" className="chip" onClick={() => dispatch({ type: 'CHANGE', field: 'amount', value: formatAmountInput(String(value)) })}>
              {formatVND(value)}
            </button>
          ))}
          {mode === 'withdraw' && wallet.balance >= limits.min && (
            <button
              type="button"
              className="chip"
              onClick={() => dispatch({ type: 'CHANGE', field: 'amount', value: formatAmountInput(String(Math.min(wallet.balance, limits.max))) })}
            >
              Rút hết
            </button>
          )}
        </div>

        <Button type="submit" block size="lg">
          Tiếp tục
        </Button>
      </form>
    );
  } else if (state.step === 'pin' && selectedBank) {
    content = (
      <PinConfirm
        idPrefix="money"
        description={
          <>
            {copy.verb} <strong>{formatVND(amount)}</strong> {mode === 'topup' ? 'từ' : 'về'} {bankLabel(selectedBank)}.
          </>
        }
        submitLabel={`Xác nhận ${copy.verb.toLowerCase()}`}
        submitting={state.submitting}
        error={state.error}
        onSubmit={handlePin}
        onBack={() => dispatch({ type: 'BACK_TO_FORM' })}
      />
    );
  } else if (state.step === 'success' && state.result) {
    content = <MoneyMoveSuccess mode={mode} tx={state.result} onAgain={() => dispatch({ type: 'RESET' })} />;
  } else {
    content = <Spinner />;
  }

  return (
    <div className="page page--narrow">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">{copy.eyebrow}</p>
          <h1 className="page-title">{copy.title}</h1>
        </div>
      </header>
      {state.step === 'form' && <ModeTabs />}
      {content}
    </div>
  );
}
