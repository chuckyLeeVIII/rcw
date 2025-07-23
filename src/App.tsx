import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { WalletPage } from './pages/WalletPage';
import { SendPage } from './pages/SendPage';
import { HistoryPage } from './pages/HistoryPage';
import { RecoveryPage } from './pages/RecoveryPage';
import { WagmiConfig } from 'wagmi';
import { config } from './config/wagmi';

function App() {
  return (
    <WagmiConfig config={config}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="send" element={<SendPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="recovery" element={<RecoveryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WagmiConfig>
  );
}

export default App;