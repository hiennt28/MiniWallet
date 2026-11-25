import { useReducer, type FormEvent } from 'react';
import { confirmTransfer, createTransfer, resendOtp, toApiError, type ApiErrorCode } from '../api/walletApi';
import StepIndicator from '../components/transfer/StepIndicator';
import TransferForm from '../components/transfer/TransferForm';
import TransferConfirm from '../components/transfer/TransferConfirm';
import PinConfirm from '../components/auth/PinConfirm';
import FrozenNotice from '../components/common/FrozenNotice';
import OtpStep from '../components/transfer/OtpStep';
import TransferSuccess from '../components/transfer/TransferSuccess';
import { initialTransferState, transferReducer } from '../components/transfer/transferReducer';
import { Spinner } from '../components/common/States';
import { useWallet } from '../context/WalletContext';
import { digitsOnly, formatPhone, formatVND, parseAmount } from '../utils/format';
import { requiresOtp, validateTransfer, type TransferField } from '../utils/validators';

// Các lỗi khiến giao dịch không thể tiếp tục: quay về bước nhập thông tin
const FATAL_CODES = new Set<ApiErrorCode>(['OTP_LOCKED', 'NOT_FOUND', 'INSUFFICIENT_BALANCE', 'PIN_LOCKED', 'WALLET_FROZEN', 'VALIDATION']);

export default function TransferPage() {
  const wallet = useWallet();
  const [state, dispatch] = useReducer(transferReducer, initialTransferState);

  const { profile } = wallet;
  if (!profile) return <Spinner />;
  const ownPhone = profile.phone;

  const phone = digitsOnly(state.values.phone);
  const amount = parseAmount(state.values.amount);
  const note = state.values.note.trim();
  const recipient = wallet.contacts.find((c) => c.phone === phone);
  const needsOtp = requiresOtp(amount);

  const handleChange = (field: TransferField, value: string) => dispatch({ type: 'CHANGE', field, value });

  function failWith(error: unknown) {
    const err = toApiError(error);
    dispatch({ type: FATAL_CODES.has(err.code) ? 'CANCELLED' : 'SUBMIT_ERROR', message: err.message });
    // Ví có thể vừa bị khóa ở thiết bị khác: tải lại để hiện trạng thái mới
    if (err.code === 'WALLET_FROZEN' || err.code === 'INSUFFICIENT_BALANCE') wallet.refresh();
  }

  function handleContinue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors = validateTransfer({ phone, amount, note }, { balance: wallet.balance, ownPhone });
    const firstField = Object.keys(errors)[0];
    if (firstField) {
      dispatch({ type: 'VALIDATION_FAILED', errors });
      // Đưa con trỏ tới ô lỗi đầu tiên
      document.getElementById(`transfer-${firstField}`)?.focus();
      return;
    }
    dispatch({ type: 'GO_CONFIRM' });
  }

  async function handlePin(pin: string) {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const result = await createTransfer({ phone, amount, note, pin });
      if (result.status === 'completed') {
        dispatch({ type: 'CONFIRM_SUCCESS', tx: result.tx });
        wallet.refresh(); // cập nhật số dư hiển thị ở các trang khác
      } else {
        dispatch({ type: 'OTP_SENT', ...result.ticket });
      }
    } catch (err) {
      failWith(err);
    }
  }

  async function handleVerify(transferId: string, code: string) {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const tx = await confirmTransfer(transferId, code);
      dispatch({ type: 'CONFIRM_SUCCESS', tx });
      wallet.refresh();
    } catch (err) {
      failWith(err);
    }
  }

  async function handleResend(transferId: string) {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const otp = await resendOtp(transferId);
      dispatch({ type: 'OTP_SENT', ...otp });
    } catch (err) {
      failWith(err);
    }
  }

  const { transferId, otp, sentAt, expiresAt } = state;
  const header = (
    <header className="page-header">
      <div>
        <p className="page-eyebrow">Chuyển tiền tới ví MiniWallet khác</p>
        <h1 className="page-title">Chuyển tiền</h1>
      </div>
    </header>
  );

  // Ví bị khóa: không cho bắt đầu giao dịch (server cũng chặn, đây chỉ là để báo sớm)
  if (wallet.frozen && state.step !== 'success') {
    return (
      <div className="page page--narrow">
        {header}
        <FrozenNotice error={state.error} />
      </div>
    );
  }

  return (
    <div className="page page--narrow">
      {header}

      {state.step !== 'success' && <StepIndicator step={state.step} withOtp={needsOtp} />}

      {state.step === 'form' && (
        <TransferForm
          values={state.values}
          errors={state.errors}
          error={state.error}
          contacts={wallet.contacts}
          recipient={recipient}
          balance={wallet.balance}
          hideBalance={wallet.hideBalance}
          onChange={handleChange}
          onSubmit={handleContinue}
        />
      )}

      {state.step === 'confirm' && (
        <TransferConfirm
          phone={phone}
          amount={amount}
          note={note}
          recipient={recipient}
          balance={wallet.balance}
          needsOtp={needsOtp}
          error={state.error}
          onBack={() => dispatch({ type: 'BACK_TO_FORM' })}
          onConfirm={() => dispatch({ type: 'GO_PIN' })}
        />
      )}

      {state.step === 'pin' && (
        <PinConfirm
          idPrefix="transfer"
          description={
            <>
              Xác nhận chuyển <strong>{formatVND(amount)}</strong> đến {recipient?.name ?? formatPhone(phone)}.
              {needsOtp && ' Sau bước này bạn cần nhập thêm mã OTP.'}
            </>
          }
          submitLabel={needsOtp ? 'Tiếp tục' : 'Xác nhận chuyển'}
          submitting={state.submitting}
          error={state.error}
          onSubmit={handlePin}
          onBack={() => dispatch({ type: 'BACK_TO_CONFIRM' })}
        />
      )}

      {/* Reducer luôn điền đủ thông tin OTP khi chuyển sang bước "otp" */}
      {state.step === 'otp' && transferId && otp && sentAt !== null && expiresAt !== null && (
        <OtpStep
          key={sentAt}
          otp={otp}
          sentAt={sentAt}
          expiresAt={expiresAt}
          ownPhone={ownPhone}
          submitting={state.submitting}
          error={state.error}
          onVerify={(code) => handleVerify(transferId, code)}
          onResend={() => handleResend(transferId)}
          onCancel={() => dispatch({ type: 'BACK_TO_FORM' })}
        />
      )}

      {state.step === 'success' && state.result && (
        <TransferSuccess tx={state.result} recipientName={recipient?.name} onNewTransfer={() => dispatch({ type: 'RESET' })} />
      )}
    </div>
  );
}
