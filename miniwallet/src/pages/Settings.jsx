import { useState } from 'react';
import { resetData } from '../api/walletApi';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Switch from '../components/common/Switch';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../hooks/useTheme';
import { formatPhone } from '../utils/format';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { profile, hideBalance, toggleBalance, refresh } = useWallet();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleReset() {
    setResetting(true);
    try {
      await resetData();
      await refresh();
      setMessage({ type: 'success', text: 'Đã khôi phục dữ liệu mẫu.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setResetting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="page page--narrow">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Tài khoản và giao diện</p>
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
          <div>
            <p className="profile-card__name">{profile.name}</p>
            <p className="text-muted">{formatPhone(profile.phone)}</p>
          </div>
        </section>
      )}

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
          Ứng dụng dùng dữ liệu giả lập lưu trên trình duyệt. Khôi phục sẽ xóa các giao dịch bạn đã tạo và đặt lại số dư.
        </p>
        <div>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Khôi phục dữ liệu mẫu
          </Button>
        </div>
      </section>

      <Modal
        open={confirmOpen}
        title="Khôi phục dữ liệu mẫu?"
        onClose={() => !resetting && setConfirmOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={resetting}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleReset} loading={resetting}>
              Khôi phục
            </Button>
          </>
        }
      >
        <p>Toàn bộ giao dịch bạn đã tạo sẽ bị xóa và số dư trở về ban đầu. Không thể hoàn tác.</p>
      </Modal>
    </div>
  );
}
