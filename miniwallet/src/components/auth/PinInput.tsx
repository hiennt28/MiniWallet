import { forwardRef, type InputHTMLAttributes } from 'react';
import { digitsOnly } from '../../utils/format';
import type { FieldControlProps } from '../common/Field';

type PinInputProps = FieldControlProps &
  Pick<InputHTMLAttributes<HTMLInputElement>, 'autoFocus' | 'disabled'> & {
    value: string;
    onChange: (value: string) => void;
    /** "current-password" khi nhập PIN cũ, "new-password" khi tạo PIN mới. */
    autoComplete?: 'current-password' | 'new-password' | 'off';
  };

/** Ô nhập mã PIN 6 số: che ký tự, bàn phím số trên điện thoại, chỉ nhận chữ số. */
const PinInput = forwardRef<HTMLInputElement, PinInputProps>(function PinInput(
  { value, onChange, autoComplete = 'current-password', ...rest },
  ref,
) {
  return (
    <input
      {...rest}
      ref={ref}
      className="input pin-input"
      type="password"
      inputMode="numeric"
      autoComplete={autoComplete}
      maxLength={6}
      placeholder="••••••"
      value={value}
      onChange={(e) => onChange(digitsOnly(e.target.value).slice(0, 6))}
    />
  );
});

export default PinInput;
