import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { RecoveryPoolProvider } from './context/RecoveryPoolContext';
import { MarketplaceProvider } from './context/MarketplaceContext';
import { KeyManagementProvider } from './context/KeyManagementContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { WalletPage } from './pages/WalletPage';
import { SendPage } from './pages/SendPage';
import { HistoryPage } from './pages/HistoryPage';
import { RecoveryPage } from './pages/RecoveryPage';
import { RecoveryPoolPage } from './pages/RecoveryPoolPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { KeyManagementPage } from './pages/KeyManagementPage';
import { UniversalCalculatorPage } from './pages/UniversalCalculatorPage';

function App() {
  return (
    <WalletProvider>
      <RecoveryPoolProvider>
        <MarketplaceProvider>
          <KeyManagementProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="wallet" element={<WalletPage />} />
                  <Route path="send" element={<SendPage />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="recovery" element={<RecoveryPage />} />
                  <Route path="pool" element={<RecoveryPoolPage />} />
                  <Route path="marketplace" element={<MarketplacePage />} />
                  <Route path="keys" element={<KeyManagementPage />} />
                  <Route path="calculator" element={<UniversalCalculatorPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </KeyManagementProvider>
        </MarketplaceProvider>
      </RecoveryPoolProvider>
    </WalletProvider>
  );
}

export default App;
