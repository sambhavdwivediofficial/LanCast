use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use parking_lot::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AuditEventKind {
    PeerJoined,
    PeerLeft,
    ScreenshotBlocked,
    InviteSent,
    InviteAccepted,
    InviteDeclined,
    FileUploaded,
    FileDownloaded,
    BroadcastStarted,
    BroadcastStopped,
    GroupCreated,
    GroupJoined,
    GroupLeft,
    MessageSent,
    MessageReceived,
    SessionStarted,
    SessionKilled,
    EncryptionHandshake,
    TransferStarted,
    TransferCompleted,
    TransferCancelled,
    KeysDestroyed,
    RamWiped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEvent {
    pub id: String,
    pub kind: AuditEventKind,
    pub actor: String,
    pub target: Option<String>,
    pub detail: Option<String>,
    pub timestamp: u64,
}

impl AuditEvent {
    pub fn new(
        kind: AuditEventKind,
        actor: impl Into<String>,
        target: Option<String>,
        detail: Option<String>,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            kind,
            actor: actor.into(),
            target,
            detail,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        }
    }
}

pub struct AuditLogger {
    events: Arc<RwLock<Vec<AuditEvent>>>,
    max_events: usize,
}

impl AuditLogger {
    pub fn new() -> Self {
        Self {
            events: Arc::new(RwLock::new(Vec::with_capacity(512))),
            max_events: 2048,
        }
    }

    pub fn log(
        &self,
        kind: AuditEventKind,
        actor: impl Into<String>,
        target: Option<String>,
        detail: Option<String>,
    ) -> AuditEvent {
        let event = AuditEvent::new(kind, actor, target, detail);
        let mut events = self.events.write();
        if events.len() >= self.max_events {
            events.drain(0..256);
        }
        events.push(event.clone());
        event
    }

    pub fn get_all(&self) -> Vec<AuditEvent> {
        self.events.read().clone()
    }

    pub fn get_recent(&self, limit: usize) -> Vec<AuditEvent> {
        let events = self.events.read();
        let start = events.len().saturating_sub(limit);
        events[start..].to_vec()
    }

    pub fn get_by_kind(&self, kind: &AuditEventKind) -> Vec<AuditEvent> {
        self.events
            .read()
            .iter()
            .filter(|e| &e.kind == kind)
            .cloned()
            .collect()
    }

    pub fn wipe(&self) {
        self.events.write().clear();
    }

    pub fn count(&self) -> usize {
        self.events.read().len()
    }
}

impl Default for AuditLogger {
    fn default() -> Self {
        Self::new()
    }
}
