import React, { createContext, useContext, useState, useCallback } from 'react';

interface WalletState {
  address: string | null;
  isConnected: boolean;
}

interface WalletContextValue extends WalletState {
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  isConnected: false,
  connect: () => { },
  disconnect: () => { },
});

export const useAccount = () => {
  const { address, isConnected } = useContext(WalletContext);
  return { address, isConnected };
};

export const useWallet = () => {
  return useContext(WalletContext);
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
  });

  const connect = useCallback(() => {
    const mockAddress = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setState({ address: mockAddress, isConnected: true });
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, isConnected: false });
  }, []);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
};
