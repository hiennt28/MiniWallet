import { Link } from 'react-router-dom';
import { EmptyState } from '../components/common/States';

export default function NotFound() {
  return (
    <div className="page page--narrow">
      <section className="card">
        <EmptyState
          title="Không tìm thấy trang"
          description="Đường dẫn không tồn tại hoặc đã bị thay đổi."
          action={
            <Link to="/" className="btn btn--primary">
              <span>Về trang chủ</span>
            </Link>
          }
        />
      </section>
    </div>
  );
}
