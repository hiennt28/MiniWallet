import { Link } from 'react-router-dom';

/** Thông báo thay cho form giao dịch khi ví đang bị khóa khẩn cấp. */
export default function FrozenNotice({ error }: { error?: string }) {
  return (
    <section className="card form">
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}
      <h2 className="card__title">Ví đang bị khóa</h2>
      <p className="text-muted">Bạn đã khóa ví khẩn cấp nên tạm thời không thể chuyển, nạp hay rút tiền. Mở khóa bằng mã PIN trong phần Cài đặt.</p>
      <div>
        <Link to="/settings" className="btn btn--primary">
          <span>Đi tới Cài đặt</span>
        </Link>
      </div>
    </section>
  );
}
