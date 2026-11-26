import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Khung chung của trang đăng nhập và đăng ký. */
export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="auth-page" id="main">
      <div className="auth-card">
        <div className="auth-card__brand">
          <img src="/favicon.svg" alt="" width="40" height="40" />
          <span className="brand__name">MiniWallet</span>
        </div>
        <h1 className="auth-card__title">{title}</h1>
        {subtitle && <p className="auth-card__subtitle text-muted">{subtitle}</p>}
        {children}
        {footer && <p className="auth-card__footer">{footer}</p>}
      </div>
    </main>
  );
}
