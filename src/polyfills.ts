import { Buffer } from 'buffer';

// Attach Buffer to global scope BEFORE any other imports
if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).Buffer = Buffer;
  (window as any).process = {
    env: {},
    browser: true,
    versions: { node: '16.0.0' }
  };
}
