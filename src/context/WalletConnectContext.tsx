import React, { createContext, useContext, useState, ReactNode } from 'react';
import { getApiUrl } from '../utils/apiConfig';

interface WalletConnectContextType {
  isConnected: boolean;
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletConnectContext = createContext<WalletConnectContextType | undefined>(undefined);

export function WalletConnectProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const connect = async () => {
    // Priority Snapshot before action
    fetch(getApiUrl('/screenwatcher/snapshot'), { method: 'POST' }).catch(() => {});

    // Mock connection
    setIsConnected(true);
    setAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
  };

  const disconnect = () => {
    setIsConnected(false);
    setAddress(null);
  };

  return (
    <WalletConnectContext.Provider value={{ isConnected, address, connect, disconnect }}>
      {children}
    </WalletConnectContext.Provider>
  );
}

export function useWalletConnect() {
  const context = useContext(WalletConnectContext);
  if (context === undefined) {
    throw new Error('useWalletConnect must be used within a WalletConnectProvider');
  }
  return context;
}
