use dashmap::DashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone)]
pub struct Peer {
    pub id: String,
    pub name: String,
    pub public_key: [u8; 32],
    pub last_seen: u64,
    pub broadcasting: bool,
    pub addr: SocketAddr,
}

pub struct PeerRegistry {
    peers: Arc<DashMap<String, Peer>>,
}

impl PeerRegistry {
    pub fn new() -> Self {
        Self {
            peers: Arc::new(DashMap::new()),
        }
    }

    pub async fn upsert(&self, peer: Peer) -> bool {
        let is_new = !self.peers.contains_key(&peer.id);
        self.peers.insert(peer.id.clone(), peer);
        is_new
    }

    pub async fn get_all(&self) -> Vec<Peer> {
        self.peers.iter().map(|e| e.value().clone()).collect()
    }

    pub async fn get(&self, peer_id: &str) -> Option<Peer> {
        self.peers.get(peer_id).map(|e| e.value().clone())
    }

    pub async fn get_by_name(&self, name: &str) -> Option<Peer> {
        self.peers
            .iter()
            .find(|e| e.value().name == name)
            .map(|e| e.value().clone())
    }

    pub async fn remove(&self, peer_id: &str) {
        self.peers.remove(peer_id);
    }

    pub async fn remove_stale(&self, timeout: Duration) -> Vec<String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let timeout_ms = timeout.as_millis() as u64;

        let stale: Vec<String> = self
            .peers
            .iter()
            .filter(|e| now.saturating_sub(e.value().last_seen) > timeout_ms)
            .map(|e| e.key().clone())
            .collect();

        for id in &stale {
            self.peers.remove(id);
        }

        stale
    }

    pub fn count(&self) -> usize {
        self.peers.len()
    }

    pub async fn touch(&self, peer_id: &str) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        if let Some(mut peer) = self.peers.get_mut(peer_id) {
            peer.last_seen = now;
        }
    }

    pub async fn clear_all(&self) {
        self.peers.clear();
    }
}

impl Default for PeerRegistry {
    fn default() -> Self {
        Self::new()
    }
}
