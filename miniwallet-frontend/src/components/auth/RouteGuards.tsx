import { Navigate, Outlet, useLocation, type Location } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../common/States';

interface FromState {
  from?: Location;
}

/** Chỉ cho vào khi đã đăng nhập; chưa đăng nhập thì chuyển tới /login và nhớ trang đang muốn vào. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <div className="auth-page">
        <Spinner label="Đang kiểm tra đăng nhập…" />
      </div>
    );
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location } satisfies FromState} />;
  }
  return <Outlet />;
}

/** Trang đăng nhập/đăng ký: đã đăng nhập thì quay về trang trước đó (hoặc trang chủ). */
export function GuestOnly() {
  const { status } = useAuth();
  const location = useLocation();
  const from = (location.state as FromState | null)?.from;

  if (status === 'checking') {
    return (
      <div className="auth-page">
        <Spinner />
      </div>
    );
  }
  if (status === 'authenticated') {
    return <Navigate to={from ? `${from.pathname}${from.search}` : '/'} replace />;
  }
  return <Outlet />;
}
