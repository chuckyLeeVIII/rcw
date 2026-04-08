import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [
    react(),
    wasm()
  ],
  define: {
    global: 'globalThis',
    'process.env.NODE_DEBUG': 'undefined',
    'process.env': {},
    'process.version': '"16.0.0"',
    'process.versions': JSON.stringify({ node: '16.0.0' }),
    'process.platform': '"browser"',
    'process.browser': 'true'
  },
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      assert: 'assert',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      url: 'url',
      buffer: 'buffer'
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
      supported: { 
        bigint: true 
      },
      define: {
        global: 'globalThis'
      }
    },
    include: [
      '@bitcoinerlab/secp256k1',
      'bitcoinjs-lib',
      'buffer',
      'process'
    ]
  },
  build: {
    target: 'es2020',
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
});