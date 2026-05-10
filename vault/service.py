"""
Vault - Secure key storage without exposing to LLM/assistant
Stores keys encrypted at rest, only exposes metadata to assistant
"""

import os
import json
import time
import threading
import hashlib
from pathlib import Path
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes


@dataclass
class VaultEntry:
    """Encrypted vault entry"""
    id: str
    key_encrypted: str
    nonce: str
    source: str
    metadata: Dict[str, Any]
    created_at: float
    accessed_at: float
    access_count: int


class Vault:
    """
    Secure vault for storing private keys
    - Keys are never exposed raw to assistant/LLM
    - Only metadata (coin, address, balance) is exposed
    - Encrypted at rest with AES-256-GCM
    """
    
    def __init__(
        self,
        vault_path: str = "vault.json",
        password: Optional[str] = None,
    ):
        self.vault_path = Path(vault_path)
        self.password = password or "default-recovery-password" # Should be user-provided
        
        self._entries: Dict[str, VaultEntry] = {}
        self._lock = threading.Lock()
        self._salt = None
        self.aesgcm = None
        
        # Load existing vault to get salt
        self._load()

        if not self._salt:
            self._salt = os.urandom(16)

        self._derive_key()

    def _derive_key(self):
        """Derive encryption key from password and salt"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self._salt,
            iterations=100_000,
        )
        encryption_key = kdf.derive(self.password.encode())
        self.aesgcm = AESGCM(encryption_key)
    
    def _encrypt(self, plaintext: str) -> (str, str):
        """AES-256-GCM encryption"""
        nonce = os.urandom(12)
        ciphertext = self.aesgcm.encrypt(nonce, plaintext.encode(), None)
        return ciphertext.hex(), nonce.hex()
    
    def _decrypt(self, ciphertext_hex: str, nonce_hex: str) -> str:
        """AES-256-GCM decryption"""
        ciphertext = bytes.fromhex(ciphertext_hex)
        nonce = bytes.fromhex(nonce_hex)
        plaintext = self.aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode()
    
    def _load(self):
        """Load vault from disk"""
        if self.vault_path.exists():
            try:
                with open(self.vault_path, 'r') as f:
                    data = json.load(f)
                
                self._salt = bytes.fromhex(data.get('salt')) if data.get('salt') else None

                for entry_id, entry_data in data.get('entries', {}).items():
                    self._entries[entry_id] = VaultEntry(**entry_data)
            except Exception as e:
                print(f"[Vault] Error loading vault: {e}")
    
    def _save(self):
        """Save vault to disk"""
        with self._lock:
            data = {
                'version': 2, # Version 2 for AES-GCM
                'salt': self._salt.hex() if self._salt else None,
                'entries': {
                    k: asdict(v) for k, v in self._entries.items()
                },
                'last_saved': time.time(),
            }
            
            # Write atomically
            tmp_path = self.vault_path.with_suffix('.tmp')
            with open(tmp_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            tmp_path.rename(self.vault_path)
    
    def store_key(
        self,
        key: str,
        source: str,
        metadata: Dict[str, Any],
    ) -> str:
        """
        Store a key in the vault
        Returns entry ID
        """
        import uuid
        
        entry_id = str(uuid.uuid4())
        encrypted_val, nonce = self._encrypt(key)
        
        entry = VaultEntry(
            id=entry_id,
            key_encrypted=encrypted_val,
            nonce=nonce,
            source=source,
            metadata=metadata,
            created_at=time.time(),
            accessed_at=time.time(),
            access_count=0,
        )
        
        with self._lock:
            self._entries[entry_id] = entry
        
        self._save()
        
        return entry_id
    
    def get_key(self, entry_id: str) -> Optional[str]:
        """Retrieve a key (increments access count)"""
        with self._lock:
            entry = self._entries.get(entry_id)
            if not entry:
                return None
            
            entry.accessed_at = time.time()
            entry.access_count += 1
        
        self._save()
        return self._decrypt(entry.key_encrypted, entry.nonce)
    
    def get_metadata(self, entry_id: str) -> Optional[Dict]:
        """Get metadata without exposing key"""
        with self._lock:
            entry = self._entries.get(entry_id)
            if not entry:
                return None
        
        return {
            'id': entry.id,
            'source': entry.source,
            'metadata': entry.metadata,
            'created_at': entry.created_at,
            'accessed_at': entry.accessed_at,
            'access_count': entry.access_count,
        }
    
    def list_entries(self) -> List[Dict]:
        """List all entries (metadata only)"""
        with self._lock:
            return [
                {
                    'id': entry.id,
                    'source': entry.source,
                    'metadata': entry.metadata,
                    'created_at': entry.created_at,
                    'access_count': entry.access_count,
                }
                for entry in self._entries.values()
            ]
    
    def delete_entry(self, entry_id: str) -> bool:
        """Delete an entry"""
        with self._lock:
            if entry_id in self._entries:
                del self._entries[entry_id]
                self._save()
                return True
        return False
    
    def get_stats(self) -> Dict:
        """Get vault statistics"""
        with self._lock:
            total_entries = len(self._entries)
            total_value = sum(
                entry.metadata.get('total_usd', 0)
                for entry in self._entries.values()
            )
            
            by_source = {}
            for entry in self._entries.values():
                source = entry.source
                if source not in by_source:
                    by_source[source] = {'count': 0, 'value': 0}
                by_source[source]['count'] += 1
                by_source[source]['value'] += entry.metadata.get('total_usd', 0)
        
        return {
            'total_entries': total_entries,
            'total_value_usd': total_value,
            'by_source': by_source,
        }
