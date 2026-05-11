import { Buffer } from 'buffer';

const API_BASE = 'http://127.0.0.1:8000/api';

export async function initPython() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    return await res.json();
  } catch (err) {
    console.error('Failed to init Python bridge:', err);
    return null;
  }
}

export async function recoverWallet(walletData: { text: string; source?: string; context?: string }) {
  try {
    const res = await fetch(`${API_BASE}/assistant/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: walletData.text,
        source: walletData.source || 'manual_recovery',
        context: walletData.context || ''
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('Python wallet recovery failed:', err);
    throw err;
  }
}
