import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  isConnected: false,
  chainId: null,
  provider: null,
  signer: null,
  connect: async () => {},
  disconnect: () => {},
  switchNetwork: async () => {},
});

export const useAccount = () => {
  const { address, isConnected, chainId } = useContext(WalletContext);
  return { address, isConnected, chainId };
};

export const useWallet = () => {
  return useContext(WalletContext);
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    chainId: null,
    provider: null,
    signer: null,
  });

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert('No injected wallet found. Please install MetaMask or another Web3 wallet.');
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      setState({ address, isConnected: true, chainId: network.chainId, provider, signer });
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      alert(err?.message || 'Connection failed');
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, isConnected: false, chainId: null, provider: null, signer: null });
  }, []);

  const switchNetwork = useCallback(async (chainId: number) => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + chainId.toString(16) }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        alert('Network not available in wallet. Please add it manually.');
      }
      throw switchError;
    }
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setState((prev) => ({ ...prev, address: accounts[0], isConnected: true }));
      }
    };
    const handleChainChanged = (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      setState((prev) => ({ ...prev, chainId }));
      // Reload provider on chain change
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        setState((prev) => ({ ...prev, provider, signer: provider.getSigner() }));
      }
    };
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect]);

  // Auto-connect if already authorized
  useEffect(() => {
    if (!window.ethereum) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    provider.listAccounts().then((accounts) => {
      if (accounts.length > 0) {
        const signer = provider.getSigner();
        signer.getAddress().then((address) => {
          provider.getNetwork().then((network) => {
            setState({ address, isConnected: true, chainId: network.chainId, provider, signer });
          });
        });
      }
    });
  }, []);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, switchNetwork }}>
      {children}
    </WalletContext.Provider>
  );
};
