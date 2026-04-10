import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import * as esbuild from 'esbuild';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Plugin that injects a pre-bundled IIFE of the buffer package into <head>
 * so Buffer is available as a global before any ESM modules evaluate.
 */
function injectBufferPlugin(): Plugin {
  return {
    name: 'inject-buffer-iife',
    async transformIndexHtml(html) {
      // Build a tiny IIFE that exposes Buffer to window
      const result = await esbuild.build({
        stdin: {
          contents: `import { Buffer } from 'buffer'; window.Buffer = Buffer; window.global = window;`,
          resolveDir: __dirname,
        },
        bundle: true,
        write: false,
        format: 'iife',
        target: 'es2020',
        external: [],
        alias: {
          buffer: require.resolve('buffer/'),
        },
        define: { global: 'window' },
      });
      const code = new TextDecoder().decode(result.outputFiles[0].contents);
      return {
        html: html.replace('</head>', `<script>${code}</script></head>`),
        tags: [],
      };
    },
  };
}

export default defineConfig({
  plugins: [injectBufferPlugin(), react()],
  define: {
    global: 'globalThis',
    'process.env.NODE_DEBUG': 'undefined',
    'process.env': {},
    'process.version': '"16.0.0"',
    'process.platform': '"browser"',
    'process.browser': 'true',
    'process.env.NODE_ENV': '"development"',
  },
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      url: 'url',
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
      supported: { bigint: true },
      define: { global: 'globalThis' }
    },
    include: [
      'buffer',
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'bip39',
      'bitcoinjs-lib',
      '@bitcoinerlab/secp256k1',
      'ethers',
      'crypto-browserify',
    ]
  },
  build: {
    target: 'es2020',
    commonjsOptions: { transformMixedEsModules: true }
  }
});
