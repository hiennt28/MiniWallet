import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toApiError } from '../api/errors';
import AuthLayout from '../components/auth/AuthLayout';
import PinInput from '../components/auth/PinInput';
import Button from '../components/common/Button';
import Field from '../components/common/Field';
import { useAuth } from '../context/AuthContext';
import { DEMO_PIN, PROFILE } from '../data/seed';
import { digitsOnly, formatPhone } from '../utils/format';
import { isValidPhone, isValidPin } from '../utils/validators';

export default function Login() {
  const { login, notice, clearNotice } = useAuth();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; pin?: string }>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!isValidPhone(phone)) next.phone = 'Vui lòng nhập số điện thoại hợp lệ.';
    if (!isValidPin(pin)) next.pin = 'Mã PIN gồm 6 chữ số.';
    setErrors(next);
    const firstField = Object.keys(next)[0];
    if (firstField) {
      document.getElementById(`login-${firstField}`)?.focus();
      return;
    }

    setSubmitting(true);
    setError('');
    clearNotice();
    try {
      await login({ phone, pin });
      // GuestOnly tự chuyển về trang trước đó sau khi đăng nhập thành công
    } catch (err) {
      setError(toApiError(err).message);
      setPin('');
      document.getElementById('login-pin')?.focus();
      setSubmitting(false);
    }
  }

  function fillDemo() {
    setPhone(PROFILE.phone);
    setPin(DEMO_PIN);
    setErrors({});
    setError('');
  }

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Nhập số điện thoại và mã PIN 6 số của bạn."
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="link">
            Đăng ký ngay
          </Link>
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {notice && !error && (
          <div className="alert alert--warning" role="status">
            {notice}
          </div>
        )}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <Field id="login-phone" label="Số điện thoại" error={errors.phone}>
          {(props) => (
            <input
              {...props}
              className="input"
              type="tel"
              inputMode="numeric"
              autoComplete="username"
              placeholder="Ví dụ: 0912345678"
              value={phone}
              onChange={(e) => setPhone(digitsOnly(e.target.value).slice(0, 10))}
            />
          )}
        </Field>

        <Field id="login-pin" label="Mã PIN" error={errors.pin}>
          {(props) => <PinInput {...props} value={pin} onChange={setPin} />}
        </Field>

        <Button type="submit" block size="lg" loading={submitting}>
          Đăng nhập
        </Button>
      </form>

      <div className="demo-account" role="note">
        <div>
          <p className="demo-account__title">Tài khoản dùng thử</p>
          <p className="text-muted">
            {formatPhone(PROFILE.phone)} · PIN <span className="mono">{DEMO_PIN}</span>
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fillDemo}>
          Điền sẵn
        </Button>
      </div>
    </AuthLayout>
  );
}
