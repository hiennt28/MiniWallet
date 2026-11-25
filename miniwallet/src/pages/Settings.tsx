import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { freezeWallet, unfreezeWallet } from '../api/authApi';
import { resetData, toApiError } from '../api/walletApi';
import PinInput from '../components/auth/PinInput';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import Field from '../components/common/Field';
import Modal from '../components/common/Modal';
import Switch from '../components/common/Switch';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../hooks/useTheme';
import { formatPhone } from '../utils/format';

type Dialog = null | 'reset' | 'freeze' | 'unfreeze';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { profile, frozen, hideBalance, toggleBalance, refresh } = useWallet();
  const { logout } = useAuth();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  function openDialog(next: Dialog) {
    setPin('');
    setPinError('');
    setDialog(next);
  }

  const closeDialog = () => !busy && setDialog(null);

  async function handleReset() {
    setBusy(true);
    try {
      await resetData();
      // Dữ liệu (kể cả phiên đăng nhập) đã bị xóa: đưa về trang đăng nhập
      await logout();
    } catch (err) {
      setMessage({ type: 'error', text: toApiError(err).message });
      setBusy(false);
      setDialog(null);
    }
  }

  async function handleFreeze() {
    setBusy(true);
    try {
      await freezeWallet();
      await refresh();
      setMessage({ type: 'success', text: 'Đã khóa ví. Mọi giao dịch chuyển, nạp và rút tiền sẽ bị chặn cho tới khi bạn mở khóa.' });
    } catch (err) {
      setMessage({ type: 'error', text: toApiError(err).message });
    } finally {
      setBusy(false);
      setDialog(null);
    }
  }

  async function handleUnfreeze(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pin.length !== 6) {
      setPinError('Mã PIN gồm 6 chữ số.');
      return;
    }
    setBusy(true);
    try {
      await unfreezeWallet(pin);
      await refresh();
      setMessage({ type: 'success', text: 'Đã mở khóa ví.' });
      setDialog(null);
    } catch (err) {
      setPinError(toApiError(err).message);
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page--narrow">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Tài khoản, bảo mật và giao diện</p>
          <h1 className="page-title">Cài đặt</h1>
        </div>
      </header>

      {message && (
        <div className={`alert alert--${message.type}`} role="status">
          {message.text}
        </div>
      )}

      {profile && (
        <section className="card profile-card">
          <Avatar name={profile.name} size="lg" />
          <div className="profile-card__text">
            <p className="profile-card__name">{profile.name}</p>
            <p className="text-muted">{formatPhone(profile.phone)}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={logout}>
            Đăng xuất
          </Button>
        </section>
      )}

      <section className="card settings-group">
        <h2 className="card__title">Ngân hàng liên kết</h2>
        <p className="text-muted">Liên kết tối đa 3 tài khoản ngân hàng để nạp tiền vào ví và rút tiền về.</p>
        <div>
          <Link to="/banks" className="btn btn--secondary">
            <span>Quản lý tài khoản ngân hàng</span>
          </Link>
        </div>
      </section>

      <section className="card settings-group" aria-labelledby="security-title">
        <h2 className="card__title" id="security-title">
          Bảo mật
        </h2>
        {frozen ? (
          <>
            <div className="alert alert--warning">Ví đang bị khóa. Mọi giao dịch chuyển, nạp và rút tiền đều bị chặn.</div>
            <p className="text-muted">Nhập mã PIN để mở khóa và giao dịch lại bình thường.</p>
            <div>
              <Button onClick={() => openDialog('unfreeze')}>Mở khóa ví</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted">
              Mất điện thoại hoặc nghi ngờ bị lộ mã PIN? Khóa ví ngay để chặn mọi giao dịch chuyển, nạp và rút tiền. Bạn vẫn xem được số dư và lịch sử.
            </p>
            <div>
              <Button variant="danger" onClick={() => openDialog('freeze')}>
                Khóa ví khẩn cấp
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="card settings-group">
        <h2 className="card__title">Hiển thị</h2>
        <Switch
          label="Chế độ tối"
          description="Giao diện nền tối, dễ nhìn hơn vào ban đêm."
          checked={theme === 'dark'}
          onChange={(on) => setTheme(on ? 'dark' : 'light')}
        />
        <Switch
          label="Ẩn số dư"
          description="Che số tiền trên mọi màn hình. Có thể bật/tắt nhanh ở trang Tổng quan."
          checked={hideBalance}
          onChange={toggleBalance}
        />
      </section>

      <section className="card settings-group">
        <h2 className="card__title">Dữ liệu</h2>
        <p className="text-muted">
          Ứng dụng dùng dữ liệu giả lập lưu trên trình duyệt. Khôi phục sẽ xóa mọi tài khoản đã đăng ký, đặt lại tài khoản dùng thử và đăng xuất.
        </p>
        <div>
          <Button variant="danger" onClick={() => openDialog('reset')}>
            Khôi phục dữ liệu mẫu
          </Button>
        </div>
      </section>

      <Modal
        open={dialog === 'reset'}
        title="Khôi phục dữ liệu mẫu?"
        onClose={closeDialog}
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog} disabled={busy}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleReset} loading={busy}>
              Khôi phục
            </Button>
          </>
        }
      >
        <p>Mọi tài khoản và giao dịch bạn đã tạo sẽ bị xóa, bạn sẽ bị đăng xuất. Không thể hoàn tác.</p>
      </Modal>

      <Modal
        open={dialog === 'freeze'}
        title="Khóa ví khẩn cấp?"
        onClose={closeDialog}
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog} disabled={busy}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleFreeze} loading={busy}>
              Khóa ví
            </Button>
          </>
        }
      >
        <p>Mọi giao dịch chuyển, nạp và rút tiền sẽ bị chặn ngay lập tức. Để mở khóa, bạn cần nhập mã PIN.</p>
      </Modal>

      <Modal open={dialog === 'unfreeze'} title="Mở khóa ví" onClose={closeDialog}>
        <form className="form" onSubmit={handleUnfreeze} noValidate>
          <Field id="unfreeze-pin" label="Mã PIN" error={pinError}>
            {(props) => (
              <PinInput
                {...props}
                autoFocus
                value={pin}
                onChange={(v) => {
                  setPin(v);
                  setPinError('');
                }}
              />
            )}
          </Field>
          <div className="button-row">
            <Button variant="secondary" onClick={closeDialog} disabled={busy}>
              Hủy
            </Button>
            <Button type="submit" loading={busy} disabled={pin.length < 6}>
              Mở khóa
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
