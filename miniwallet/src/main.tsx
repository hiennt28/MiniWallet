import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { applyTheme, getInitialTheme } from './utils/theme';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';

// Áp dụng giao diện sáng/tối trước khi render để không bị nháy màu
applyTheme(getInitialTheme());

const root = document.getElementById('root');
if (!root) throw new Error('Không tìm thấy phần tử #root trong index.html.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
