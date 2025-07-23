import { Buffer } from 'buffer';

// Set up Buffer globally
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
  window.global = window;
}

declare global {
  interface Window {
    Buffer: typeof Buffer;
    global: typeof globalThis;
    process: {
      env: Record<string, string>;
      version: string;
      versions: Record<string, string>;
      platform: string;
      nextTick: (fn: Function) => void;
      browser: boolean;
    };
  }
}