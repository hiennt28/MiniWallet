import { useEffect, useRef, useState } from 'react';
import { OTP_RESEND_AFTER_MS } from '../../api/walletApi';
import { useNow } from '../../hooks/useNow';
import { digitsOnly, formatCountdown, maskPhone } from '../../utils/format';
import { isValidOtp } from '../../utils/validators';
import Button from '../common/Button';
import Field from '../common/Field';

/** Bước nhập OTP. Component được tạo lại (key = sentAt) mỗi lần gửi mã mới để xóa ô nhập. */
export default function OtpStep({ otp, sentAt, expiresAt, ownPhone, submitting, error, onVerify, onResend, onCancel }) {
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState('');
  const inputRef = useRef(null);
  const now = useNow(1000);

  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const expired = secondsLeft === 0;
  const resendIn = Math.max(0, Math.ceil((sentAt + OTP_RESEND_AFTER_MS - now) / 1000));
  const canResend = expired || resendIn === 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!isValidOtp(code)) {
      setLocalError('Mã OTP gồm 6 chữ số.');
      return;
    }
    onVerify(code);
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <div>
        <h2 className="card__title">Nhập mã xác thực</h2>
        <p className="text-muted">Mã OTP gồm 6 chữ số đã được gửi tới số {maskPhone(ownPhone)}.</p>
      </div>

      <div className="otp-demo" role="note">
        <span className="otp-demo__badge">Tin nhắn giả lập</span>
        <span>
          Mã OTP MiniWallet của bạn là <strong className="otp-demo__code">{otp}</strong>. Không chia sẻ mã này cho bất kỳ ai.
        </span>
      </div>

      <Field id="otp-code" label="Mã OTP" error={localError || error}>
        {(props) => (
          <input
            {...props}
            ref={inputRef}
            className="input otp-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => {
              setCode(digitsOnly(e.target.value).slice(0, 6));
              setLocalError('');
            }}
          />
        )}
      </Field>

      <p className="otp-timer" aria-live="polite">
        {expired ? 'Mã đã hết hạn, vui lòng gửi lại mã mới.' : `Mã hết hạn sau ${formatCountdown(secondsLeft)}`}
      </p>

      <Button type="submit" block size="lg" loading={submitting} disabled={expired || code.length < 6}>
        Xác nhận
      </Button>

      <div className="button-row button-row--center">
        <Button variant="ghost" onClick={onResend} disabled={!canResend || submitting}>
          {canResend ? 'Gửi lại mã' : `Gửi lại mã sau ${resendIn}s`}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Hủy giao dịch
        </Button>
      </div>
    </form>
  );
}
