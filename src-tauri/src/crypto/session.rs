use dashmap::DashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use thiserror::Error;
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::crypto::ecdh::{DerivedKeys, EcdhSession};

const ANTI_REPLAY_WINDOW: u64 = 64;

#[derive(Debug, Error)]
pub enum SessionError {
    #[error("No session found for peer: {0}")]
    NoSession(String),
    #[error("Replay attack detected — sequence {0} already seen")]
    ReplayDetected(u64),
    #[error("Sequence number too old: {0}")]
    SequenceTooOld(u64),
    #[error("Key exchange failed: {0}")]
    KeyExchangeFailed(String),
}

#[derive(ZeroizeOnDrop)]
pub struct SessionKeys {
    pub aes_key: [u8; 32],
    pub hmac_key: [u8; 64],
}

pub struct Session {
    keys: SessionKeys,
    send_seq: AtomicU64,
    recv_seq: AtomicU64,
    replay_window: Mutex<u128>,
    pub peer_id: String,
    pub established_at: u64,
}

impl Session {
    fn new(peer_id: String, keys: SessionKeys) -> Self {
        let established_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        Self {
            keys,
            send_seq: AtomicU64::new(0),
            recv_seq: AtomicU64::new(0),
            replay_window: Mutex::new(0u128),
            peer_id,
            established_at,
        }
    }

    pub fn aes_key(&self) -> &[u8; 32] {
        &self.keys.aes_key
    }

    pub fn hmac_key(&self) -> &[u8; 64] {
        &self.keys.hmac_key
    }

    pub fn next_send_seq(&self) -> u64 {
        self.send_seq.fetch_add(1, Ordering::SeqCst)
    }

    pub fn validate_recv_seq(&self, seq: u64) -> Result<(), SessionError> {
        let current = self.recv_seq.load(Ordering::SeqCst);

        if seq + ANTI_REPLAY_WINDOW < current {
            return Err(SessionError::SequenceTooOld(seq));
        }

        let mut window = self.replay_window.lock().unwrap();

        if seq >= current {
            let shift = seq - current;
            if shift < 128 {
                *window <<= shift;
            } else {
                *window = 0;
            }
            *window |= 1;
            self.recv_seq.store(seq + 1, Ordering::SeqCst);
        } else {
            let bit_pos = current - seq - 1;
            if bit_pos >= 128 {
                return Err(SessionError::SequenceTooOld(seq));
            }
            let mask = 1u128 << bit_pos;
            if *window & mask != 0 {
                return Err(SessionError::ReplayDetected(seq));
            }
            *window |= mask;
        }

        Ok(())
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        self.keys.aes_key.zeroize();
        self.keys.hmac_key.zeroize();
    }
}

pub struct SessionRegistry {
    sessions: Arc<DashMap<String, Arc<Session>>>,
    pending: Arc<DashMap<String, EcdhSession>>,
}

impl SessionRegistry {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(DashMap::new()),
            pending: Arc::new(DashMap::new()),
        }
    }

    pub fn initiate_handshake(&self, peer_id: String) -> [u8; 32] {
        let session = EcdhSession::new();
        let public_key = session.public_key_bytes();
        self.pending.insert(peer_id, session);
        public_key
    }

    pub fn complete_handshake(
        &self,
        peer_id: &str,
        their_public_key: &[u8; 32],
    ) -> Result<(), SessionError> {
        let (_, ecdh) = self
            .pending
            .remove(peer_id)
            .ok_or_else(|| SessionError::KeyExchangeFailed("No pending handshake".into()))?;

        let derived: DerivedKeys = ecdh
            .derive_keys(their_public_key)
            .map_err(|e| SessionError::KeyExchangeFailed(e.to_string()))?;

        let session_keys = SessionKeys {
            aes_key: derived.aes_key,
            hmac_key: derived.hmac_key,
        };

        let session = Session::new(peer_id.to_string(), session_keys);
        self.sessions.insert(peer_id.to_string(), Arc::new(session));
        Ok(())
    }

    pub fn get_session(&self, peer_id: &str) -> Option<Arc<Session>> {
        self.sessions.get(peer_id).map(|s| Arc::clone(&*s))
    }

    pub fn remove_session(&self, peer_id: &str) {
        self.sessions.remove(peer_id);
        self.pending.remove(peer_id);
    }

    pub fn has_session(&self, peer_id: &str) -> bool {
        self.sessions.contains_key(peer_id)
    }

    pub fn active_count(&self) -> usize {
        self.sessions.len()
    }
}

impl Default for SessionRegistry {
    fn default() -> Self {
        Self::new()
    }
}
