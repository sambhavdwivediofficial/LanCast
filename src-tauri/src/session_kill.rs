use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::RwLock;
use tracing::info;
use zeroize::Zeroize;

use crate::audit::logger::{AuditEventKind, AuditLogger};
use crate::crypto::session::SessionRegistry;
use crate::groups::manager::GroupManager;
use crate::network::peer::PeerRegistry;

pub struct KillResult {
    pub sessions_destroyed: usize,
    pub peers_cleared: usize,
    pub groups_cleared: usize,
}

pub async fn execute_kill(
    app: &AppHandle,
    session_registry: Arc<SessionRegistry>,
    peer_registry: Arc<PeerRegistry>,
    group_manager: Arc<RwLock<GroupManager>>,
    local_name: Arc<RwLock<String>>,
    audit: Arc<AuditLogger>,
) -> KillResult {
    let actor = local_name.read().await.clone();

    let sessions_destroyed = session_registry.active_count();
    session_registry.wipe_all();

    let peers = peer_registry.get_all().await;
    let peers_cleared = peers.len();
    peer_registry.clear_all().await;

    let mut manager = group_manager.write().await;
    let groups_cleared = manager.group_count();
    manager.wipe_all();
    drop(manager);

    let mut name = local_name.write().await;
    name.zeroize();
    drop(name);

    audit.log(
        AuditEventKind::KeysDestroyed,
        &actor,
        None,
        Some(format!("{sessions_destroyed} sessions destroyed")),
    );

    audit.log(
        AuditEventKind::RamWiped,
        &actor,
        None,
        Some("Full RAM wipe executed".into()),
    );

    audit.log(
        AuditEventKind::SessionKilled,
        &actor,
        None,
        Some("Kill switch activated — all state destroyed".into()),
    );

    audit.wipe();

    let _ = app.emit("kill_executed", serde_json::json!({
        "sessionsDestroyed": sessions_destroyed,
        "peersCleared": peers_cleared,
        "groupsCleared": groups_cleared,
    }));

    info!("Kill switch executed — all state destroyed");

    KillResult {
        sessions_destroyed,
        peers_cleared,
        groups_cleared,
    }
}
