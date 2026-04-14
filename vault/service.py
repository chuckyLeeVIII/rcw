"""
Vault - Secure key storage without exposing to LLM/assistant
Stores keys encrypted at rest, only exposes metadata to assistant
"""

import os
import json
import time
import threading
from pathlib import Path
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
from dataclasses import dataclass, asdict


@dataclass
class VaultEntry:
    """Encrypted vault entry"""
    id: str
    key_encrypted: str
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
    - Encrypted at rest
    """
    
    def __init__(
        self,
        vault_path: str = "vault.json",
        encryption_key: Optional[bytes] = None,
    ):
        self.vault_path = Path(vault_path)
        self.encryption_key = encryption_key or os.urandom(32)
        
        self._entries: Dict[str, VaultEntry] = {}
        self._lock = threading.Lock()
        
        # Load existing vault
        self._load()
    
    def _encrypt(self, plaintext: str) -> str:
        """Simple XOR encryption (replace with proper AES in production)"""
        # TODO: Use proper AES-256-GCM
        key = self.encryption_key[:len(plaintext)]
        encrypted = bytes(a ^ b for a, b in zip(plaintext.encode(), key))
        return encrypted.hex()
    
    def _decrypt(self, ciphertext: str) -> str:
        """Decrypt (replace with proper AES in production)"""
        key = self.encryption_key[:len(ciphertext)//2]
        decrypted = bytes(a ^ b for a, b in zip(bytes.fromhex(ciphertext), key))
        return decrypted.decode()
    
    def _load(self):
        """Load vault from disk"""
        if self.vault_path.exists():
            try:
                with open(self.vault_path, 'r') as f:
                    data = json.load(f)
                
                for entry_id, entry_data in data.get('entries', {}).items():
                    self._entries[entry_id] = VaultEntry(**entry_data)
            except Exception as e:
                print(f"[Vault] Error loading vault: {e}")
    
    def _save(self):
        """Save vault to disk"""
        with self._lock:
            data = {
                'version': 1,
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
        
        entry = VaultEntry(
            id=entry_id,
            key_encrypted=self._encrypt(key),
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
        return self._decrypt(entry.key_encrypted)
    
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
