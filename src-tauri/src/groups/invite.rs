use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use uuid::Uuid;

const INVITE_TTL: Duration = Duration::from_secs(120);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InviteResponse {
    Accepted,
    Declined,
}

#[derive(Debug, Clone)]
pub struct Invite {
    pub id: String,
    pub group_id: String,
    pub group_name: String,
    pub inviter_id: String,
    pub inviter_name: String,
    pub invitee_id: String,
    pub created_at: u64,
    pub expires_at: u64,
    pub responded: bool,
}

pub struct InviteRegistry {
    invites: Arc<DashMap<String, Invite>>,
}

impl InviteRegistry {
    pub fn new() -> Self {
        Self {
            invites: Arc::new(DashMap::new()),
        }
    }

    pub fn create_invite(
        &self,
        group_id: String,
        group_name: String,
        inviter_id: String,
        inviter_name: String,
        invitee_id: String,
    ) -> Invite {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let invite = Invite {
            id: Uuid::new_v4().to_string(),
            group_id,
            group_name,
            inviter_id,
            inviter_name,
            invitee_id,
            created_at: now,
            expires_at: now + INVITE_TTL.as_millis() as u64,
            responded: false,
        };

        self.invites.insert(invite.id.clone(), invite.clone());
        invite
    }

    pub fn get_invite(&self, invite_id: &str) -> Option<Invite> {
        self.invites.get(invite_id).map(|e| e.clone())
    }

    pub fn respond_to_invite(
        &self,
        invite_id: &str,
        _response: InviteResponse,
    ) -> Result<Invite, &'static str> {
        let mut entry = self.invites.get_mut(invite_id).ok_or("Invite not found")?;

        if entry.responded {
            return Err("Invite already responded to");
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        if now > entry.expires_at {
            return Err("Invite has expired");
        }

        entry.responded = true;
        Ok(entry.clone())
    }

    pub fn invalidate(&self, invite_id: &str) {
        self.invites.remove(invite_id);
    }

    pub fn purge_expired(&self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        self.invites.retain(|_, v| v.expires_at > now);
    }
}

impl Default for InviteRegistry {
    fn default() -> Self {
        Self::new()
    }
}
