#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use tauri::Manager;
use tokio::sync::RwLock;
use tracing::info;
use tracing_subscriber::{fmt, EnvFilter};

mod audit;
mod commands;
mod crypto;
mod discovery;
mod events;
mod groups;
mod network;
mod screenshot;
mod session_kill;

use audit::logger::AuditLogger;
use discovery::multicast::DiscoveryService;
use groups::manager::GroupManager;
use network::peer::PeerRegistry;
use network::tcp::TcpService;
use screenshot::ScreenshotGuard;
use crypto::session::SessionRegistry;

pub struct AppState {
    pub peer_registry: Arc<PeerRegistry>,
    pub group_manager: Arc<RwLock<GroupManager>>,
    pub tcp_service: Arc<TcpService>,
    pub discovery_service: Arc<DiscoveryService>,
    pub screenshot_guard: Arc<ScreenshotGuard>,
    pub local_name: Arc<RwLock<String>>,
    pub broadcasting: Arc<RwLock<bool>>,
    pub audit_logger: Arc<AuditLogger>,
    pub session_registry: Arc<SessionRegistry>,
    pub session_start: std::time::Instant,
}

fn main() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("lancast=info,warn"));

    fmt().with_env_filter(filter).with_target(false).compact().init();

    info!("LANCAST starting");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let peer_registry = Arc::new(PeerRegistry::new());
            let group_manager = Arc::new(RwLock::new(GroupManager::new()));
            let session_registry = Arc::new(SessionRegistry::new());
            let tcp_service = Arc::new(TcpService::new(Arc::clone(&peer_registry)));
            let discovery_service = Arc::new(DiscoveryService::new(Arc::clone(&peer_registry)));
            let screenshot_guard = Arc::new(ScreenshotGuard::new());
            let local_name = Arc::new(RwLock::new(String::new()));
            let broadcasting = Arc::new(RwLock::new(false));
            let audit_logger = Arc::new(AuditLogger::new());

            let handle = app.handle().clone();
            let tcp_clone = Arc::clone(&tcp_service);
            let peer_clone = Arc::clone(&peer_registry);
            let name_clone = Arc::clone(&local_name);

            tokio::spawn(async move {
                tcp_clone.start_listener(handle, peer_clone, name_clone).await;
            });

            app.manage(AppState {
                peer_registry,
                group_manager,
                tcp_service,
                discovery_service,
                screenshot_guard,
                local_name,
                broadcasting,
                audit_logger,
                session_registry,
                session_start: std::time::Instant::now(),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::set_local_name,
            commands::get_local_name,
            commands::start_broadcast,
            commands::stop_broadcast,
            commands::get_active_peers,
            commands::send_message,
            commands::send_file_chunk,
            commands::create_group,
            commands::join_group,
            commands::leave_group,
            commands::send_group_message,
            commands::invite_peer_to_group,
            commands::respond_to_invite,
            commands::get_groups,
            commands::get_public_groups,
            commands::protect_window,
            commands::unprotect_window,
            commands::execute_kill,
            commands::get_audit_events,
            commands::log_audit_event,
            commands::emit_typing,
        ])
        .run(tauri::generate_context!())
        .expect("LANCAST failed to start");
}
