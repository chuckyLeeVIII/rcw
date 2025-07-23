/// <reference types="vite/client" />

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (eventName: string, handler: (params: any) => void) => void;
    removeListener: (eventName: string, handler: (params: any) => void) => void;
    isMetaMask?: boolean;
  };
}

declare module 'crypto-browserify' {
    export * from 'crypto';
}

declare module 'stream-browserify' {
    export * from 'stream';
}