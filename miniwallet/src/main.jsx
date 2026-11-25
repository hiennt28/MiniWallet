import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { WalletProvider } from './context/WalletContext';
import { applyTheme, getInitialTheme } from './utils/theme';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';

// Áp dụng giao diện sáng/tối trước khi render để không bị nháy màu
applyTheme(getInitialTheme());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <App />
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
