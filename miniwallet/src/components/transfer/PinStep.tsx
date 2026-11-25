import { useEffect, useRef, useState, type FormEvent } from 'react';
import { formatVND } from '../../utils/format';
import { isValidPin } from '../../utils/validators';
import PinInput from '../auth/PinInput';
import Button from '../common/Button';
import Field from '../common/Field';

interface PinStepProps {
  amount: number;
  recipientName: string;
  needsOtp: boolean;
  submitting: boolean;
  error: string;
  onSubmit: (pin: string) => void;
  onBack: () => void;
}

/** Bước nhập mã PIN để xác nhận giao dịch. */
export default function PinStep({ amount, recipientName, needsOtp, submitting, error, onSubmit, onBack }: PinStepProps) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sai PIN thì xóa ô nhập để gõ lại từ đầu
  useEffect(() => {
    if (error) setPin('');
    inputRef.current?.focus();
  }, [error]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isValidPin(pin)) onSubmit(pin);
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <div>
        <h2 className="card__title">Nhập mã PIN</h2>
        <p className="text-muted">
          Xác nhận chuyển <strong>{formatVND(amount)}</strong> đến {recipientName}.
          {needsOtp && ' Sau bước này bạn cần nhập thêm mã OTP.'}
        </p>
      </div>

      <Field id="transfer-pin" label="Mã PIN 6 số" error={error}>
        {(props) => <PinInput {...props} ref={inputRef} value={pin} onChange={setPin} disabled={submitting} />}
      </Field>

      <Button type="submit" block size="lg" loading={submitting} disabled={pin.length < 6}>
        {needsOtp ? 'Tiếp tục' : 'Xác nhận chuyển'}
      </Button>
      <div className="button-row button-row--center">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          Quay lại
        </Button>
      </div>
    </form>
  );
}
