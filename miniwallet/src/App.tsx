import { Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireAuth } from './components/auth/RouteGuards';
import Layout from './components/layout/Layout';
import BanksPage from './pages/BanksPage';
import { WalletProvider } from './context/WalletContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import MoneyMovePage from './pages/MoneyMovePage';
import NotFound from './pages/NotFound';
import Register from './pages/Register';
import Settings from './pages/Settings';
import TransactionDetail from './pages/TransactionDetail';
import Transactions from './pages/Transactions';
import TransferPage from './pages/TransferPage';

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      <Route element={<RequireAuth />}>
        {/* WalletProvider nằm trong vùng đã đăng nhập: đổi tài khoản là có state ví mới hoàn toàn */}
        <Route
          element={
            <WalletProvider>
              <Layout />
            </WalletProvider>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="transfer" element={<TransferPage />} />
          {/* key khác nhau để đổi giữa nạp và rút thì form được tạo mới */}
          <Route path="topup" element={<MoneyMovePage key="topup" mode="topup" />} />
          <Route path="withdraw" element={<MoneyMovePage key="withdraw" mode="withdraw" />} />
          <Route path="banks" element={<BanksPage />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="transactions/:id" element={<TransactionDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
