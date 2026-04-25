import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface WalletState {
  address: string | null;
  isConnected: boolean;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  isConnected: false,
  connect: async () => { },
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

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('No injected wallet found. Install MetaMask or a compatible wallet.');
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
    const address = accounts?.[0] ?? null;
    setState({ address, isConnected: !!address });
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, isConnected: false });
  }, []);

  useEffect(() => {
    if (!window.ethereum || !window.ethereum.on) return;

    const handleAccountsChanged = (accounts: string[]) => {
      const address = accounts?.[0] ?? null;
      setState({ address, isConnected: !!address });
    };

    const handleDisconnect = () => {
      setState({ address: null, isConnected: false });
    };

    window.ethereum.request({ method: 'eth_accounts' })
      .then((accounts) => handleAccountsChanged(accounts as string[]))
      .catch(() => handleDisconnect());

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    return () => {
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener?.('disconnect', handleDisconnect);
    };
  }, []);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
};
