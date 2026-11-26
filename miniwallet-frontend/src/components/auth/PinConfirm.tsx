import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { isValidPin } from '../../utils/validators';
import Button from '../common/Button';
import Field from '../common/Field';
import PinInput from './PinInput';

interface PinConfirmProps {
  /** Dùng để tạo id cho ô nhập, ví dụ "transfer" -> "transfer-pin". */
  idPrefix: string;
  title?: string;
  description: ReactNode;
  submitLabel: string;
  submitting: boolean;
  error: string;
  onSubmit: (pin: string) => void;
  onBack: () => void;
}

/** Bước nhập mã PIN dùng chung cho chuyển tiền, nạp và rút tiền. */
export default function PinConfirm({ idPrefix, title = 'Nhập mã PIN', description, submitLabel, submitting, error, onSubmit, onBack }: PinConfirmProps) {
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
        <h2 className="card__title">{title}</h2>
        <p className="text-muted">{description}</p>
      </div>

      <Field id={`${idPrefix}-pin`} label="Mã PIN 6 số" error={error}>
        {(props) => <PinInput {...props} ref={inputRef} value={pin} onChange={setPin} disabled={submitting} />}
      </Field>

      <Button type="submit" block size="lg" loading={submitting} disabled={pin.length < 6}>
        {submitLabel}
      </Button>
      <div className="button-row button-row--center">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          Quay lại
        </Button>
      </div>
    </form>
  );
}
