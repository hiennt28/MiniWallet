import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { WELCOME_BONUS } from '../api/authApi';
import { toApiError } from '../api/errors';
import AuthLayout from '../components/auth/AuthLayout';
import PinInput from '../components/auth/PinInput';
import Button from '../components/common/Button';
import Field from '../components/common/Field';
import { useAuth } from '../context/AuthContext';
import { digitsOnly, formatVND } from '../utils/format';
import { NAME_LIMITS, validateRegistration, type RegisterErrors, type RegisterField } from '../utils/validators';

const EMPTY = { name: '', phone: '', pin: '', confirmPin: '' };

export default function Register() {
  const { register } = useAuth();
  const [values, setValues] = useState<Record<RegisterField, string>>(EMPTY);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function change(field: RegisterField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors(({ [field]: _removed, ...rest }) => rest);
    setError('');
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = validateRegistration(values);
    setErrors(next);
    const firstField = Object.keys(next)[0];
    if (firstField) {
      document.getElementById(`register-${firstField}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await register({ name: values.name, phone: values.phone, pin: values.pin });
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'PHONE_TAKEN') {
        setErrors({ phone: apiError.message });
        document.getElementById('register-phone')?.focus();
      } else {
        setError(apiError.message);
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle={<>Nhận ngay {formatVND(WELCOME_BONUS)} vào ví khi đăng ký.</>}
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to="/login" className="link">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <Field id="register-name" label="Họ và tên" error={errors.name}>
          {(props) => (
            <input
              {...props}
              className="input"
              type="text"
              autoComplete="name"
              maxLength={NAME_LIMITS.max}
              placeholder="Ví dụ: Nguyễn Văn An"
              value={values.name}
              onChange={(e) => change('name', e.target.value)}
            />
          )}
        </Field>

        <Field id="register-phone" label="Số điện thoại" error={errors.phone}>
          {(props) => (
            <input
              {...props}
              className="input"
              type="tel"
              inputMode="numeric"
              autoComplete="username"
              placeholder="Ví dụ: 0912345678"
              value={values.phone}
              onChange={(e) => change('phone', digitsOnly(e.target.value).slice(0, 10))}
            />
          )}
        </Field>

        <Field
          id="register-pin"
          label="Tạo mã PIN"
          error={errors.pin}
          hint="6 chữ số, không dùng số giống nhau hoặc dãy liên tiếp. Dùng để đăng nhập và xác nhận giao dịch."
        >
          {(props) => <PinInput {...props} autoComplete="new-password" value={values.pin} onChange={(v) => change('pin', v)} />}
        </Field>

        <Field id="register-confirmPin" label="Nhập lại mã PIN" error={errors.confirmPin}>
          {(props) => (
            <PinInput {...props} autoComplete="new-password" value={values.confirmPin} onChange={(v) => change('confirmPin', v)} />
          )}
        </Field>

        <Button type="submit" block size="lg" loading={submitting}>
          Đăng ký
        </Button>
      </form>
    </AuthLayout>
  );
}
