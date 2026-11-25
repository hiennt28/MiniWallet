import { useReducer } from 'react';
import { confirmTransfer, createTransfer, resendOtp } from '../api/walletApi';
import StepIndicator from '../components/transfer/StepIndicator';
import TransferForm from '../components/transfer/TransferForm';
import TransferConfirm from '../components/transfer/TransferConfirm';
import OtpStep from '../components/transfer/OtpStep';
import TransferSuccess from '../components/transfer/TransferSuccess';
import { initialTransferState, transferReducer } from '../components/transfer/transferReducer';
import { Spinner } from '../components/common/States';
import { useWallet } from '../context/WalletContext';
import { digitsOnly, parseAmount } from '../utils/format';
import { validateTransfer } from '../utils/validators';

// Các lỗi khiến giao dịch không thể tiếp tục: quay về bước nhập thông tin
const FATAL_CODES = new Set(['OTP_LOCKED', 'NOT_FOUND', 'INSUFFICIENT_BALANCE']);

export default function TransferPage() {
  const wallet = useWallet();
  const [state, dispatch] = useReducer(transferReducer, initialTransferState);

  if (!wallet.profile) return <Spinner />;

  const phone = digitsOnly(state.values.phone);
  const amount = parseAmount(state.values.amount);
  const note = state.values.note.trim();
  const recipient = wallet.contacts.find((c) => c.phone === phone);

  const handleChange = (field, value) => dispatch({ type: 'CHANGE', field, value });

  function handleContinue(e) {
    e.preventDefault();
    const errors = validateTransfer({ phone, amount, note }, { balance: wallet.balance, ownPhone: wallet.profile.phone });
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'VALIDATION_FAILED', errors });
      // Đưa con trỏ tới ô lỗi đầu tiên
      const firstField = Object.keys(errors)[0];
      document.getElementById(`transfer-${firstField}`)?.focus();
      return;
    }
    dispatch({ type: 'GO_CONFIRM' });
  }

  async function handleConfirm() {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const otp = await createTransfer({ phone, amount, note });
      dispatch({ type: 'OTP_SENT', ...otp });
    } catch (err) {
      dispatch({ type: 'SUBMIT_ERROR', message: err.message });
    }
  }

  async function handleVerify(code) {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const tx = await confirmTransfer(state.transferId, code);
      dispatch({ type: 'CONFIRM_SUCCESS', tx });
      wallet.refresh(); // cập nhật số dư hiển thị ở các trang khác
    } catch (err) {
      dispatch({ type: FATAL_CODES.has(err.code) ? 'CANCELLED' : 'SUBMIT_ERROR', message: err.message });
    }
  }

  async function handleResend() {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const otp = await resendOtp(state.transferId);
      dispatch({ type: 'OTP_SENT', ...otp });
    } catch (err) {
      dispatch({ type: FATAL_CODES.has(err.code) ? 'CANCELLED' : 'SUBMIT_ERROR', message: err.message });
    }
  }

  return (
    <div className="page page--narrow">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Chuyển tiền tới ví MiniWallet khác</p>
          <h1 className="page-title">Chuyển tiền</h1>
        </div>
      </header>

      {state.step !== 'success' && <StepIndicator step={state.step} />}

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
          submitting={state.submitting}
          error={state.error}
          onBack={() => dispatch({ type: 'BACK_TO_FORM' })}
          onConfirm={handleConfirm}
        />
      )}

      {state.step === 'otp' && (
        <OtpStep
          key={state.sentAt}
          otp={state.otp}
          sentAt={state.sentAt}
          expiresAt={state.expiresAt}
          ownPhone={wallet.profile.phone}
          submitting={state.submitting}
          error={state.error}
          onVerify={handleVerify}
          onResend={handleResend}
          onCancel={() => dispatch({ type: 'BACK_TO_FORM' })}
        />
      )}

      {state.step === 'success' && (
        <TransferSuccess tx={state.result} recipientName={recipient?.name} onNewTransfer={() => dispatch({ type: 'RESET' })} />
      )}
    </div>
  );
}
