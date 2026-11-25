import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { formatPhone } from '../../utils/format';
import { cx } from '../../utils/cx';
import { HomeIcon, ListIcon, LockIcon, LogOutIcon, SendIcon, SettingsIcon } from '../icons';
import Avatar from '../common/Avatar';
import { ErrorState, Skeleton } from '../common/States';

const NAV_ITEMS = [
  { to: '/', label: 'Tổng quan', icon: HomeIcon, end: true },
  { to: '/transfer', label: 'Chuyển tiền', icon: SendIcon },
  { to: '/transactions', label: 'Lịch sử', icon: ListIcon },
  { to: '/settings', label: 'Cài đặt', icon: SettingsIcon },
];

function Brand() {
  return (
    <span className="brand">
      <img src="/favicon.svg" alt="" width="32" height="32" />
      <span className="brand__name">MiniWallet</span>
    </span>
  );
}

export default function Layout() {
  const { profile, status, error, refresh, frozen } = useWallet();
  const { logout } = useAuth();
  const failedToLoad = status === 'error' && !profile;

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Bỏ qua tới nội dung chính
      </a>

      <header className="topbar">
        <Brand />
        <div className="topbar__actions">
          {profile && <Avatar name={profile.name} size="sm" />}
          <button type="button" className="icon-btn" onClick={logout} aria-label="Đăng xuất">
            <LogOutIcon />
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <div className="sidebar__brand">
          <Brand />
        </div>

        <nav className="nav" aria-label="Điều hướng chính">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('nav__link', isActive && 'nav__link--active')}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__profile">
          {profile ? (
            <>
              <Avatar name={profile.name} />
              <span className="sidebar__profile-text">
                <strong>{profile.name}</strong>
                <span>{formatPhone(profile.phone)}</span>
              </span>
              <button type="button" className="icon-btn" onClick={logout} aria-label="Đăng xuất" title="Đăng xuất">
                <LogOutIcon />
              </button>
            </>
          ) : (
            <Skeleton height="40px" />
          )}
        </div>
      </aside>

      <main className="main" id="main" tabIndex={-1}>
        {frozen && (
          <div className="frozen-banner" role="status">
            <LockIcon />
            <span>
              Ví đang bị khóa khẩn cấp, mọi giao dịch chuyển tiền đều bị chặn.{' '}
              <Link to="/settings" className="link">
                Mở khóa
              </Link>
            </span>
          </div>
        )}
        {failedToLoad ? <ErrorState message={error?.message} onRetry={refresh} /> : <Outlet />}
      </main>
    </div>
  );
}
