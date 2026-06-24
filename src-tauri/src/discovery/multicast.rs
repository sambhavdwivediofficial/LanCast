use socket2::{Domain, Protocol, Socket, Type};
use std::net::{IpAddr, Ipv4Addr, SocketAddr, SocketAddrV4};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tokio::net::UdpSocket;
use tokio::sync::{broadcast, RwLock};
use tokio::time;
use tracing::{debug, error, info, warn};

use crate::crypto::ecdh::EcdhSession;
use crate::discovery::magic::{decode_frame, encode_frame, is_lancast_frame};
use crate::events::{emit_peer_discovered, emit_peer_left, PeerDiscoveredPayload, PeerLeftPayload};
use crate::network::peer::{Peer, PeerRegistry};

const MULTICAST_ADDR: Ipv4Addr = Ipv4Addr::new(224, 0, 0, 251);
const MULTICAST_PORT: u16 = 45678;
const BROADCAST_INTERVAL: Duration = Duration::from_secs(3);
const PEER_TIMEOUT: Duration = Duration::from_secs(12);
const STALE_CLEANUP_INTERVAL: Duration = Duration::from_secs(5);

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

pub struct DiscoveryService {
    peer_registry: Arc<PeerRegistry>,
    stop_tx: broadcast::Sender<()>,
    ecdh_session: Arc<RwLock<Option<EcdhSession>>>,
}

impl DiscoveryService {
    pub fn new(peer_registry: Arc<PeerRegistry>) -> Self {
        let (stop_tx, _) = broadcast::channel(4);
        Self {
            peer_registry,
            stop_tx,
            ecdh_session: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn start(&self, app: AppHandle, local_name: String) {
        let mut session_write = self.ecdh_session.write().await;
        let ecdh = EcdhSession::new();
        let public_key = ecdh.public_key_bytes();
        *session_write = Some(ecdh);
        drop(session_write);

        let frame = encode_frame(&public_key, &local_name);

        let mut stop_rx_send = self.stop_tx.subscribe();
        let mut stop_rx_recv = self.stop_tx.subscribe();
        let mut stop_rx_cleanup = self.stop_tx.subscribe();

        let frame_arc = Arc::new(frame);
        let _registry_send = Arc::clone(&self.peer_registry);
        let registry_recv = Arc::clone(&self.peer_registry);
        let registry_cleanup = Arc::clone(&self.peer_registry);
        let app_recv = app.clone();
        let app_cleanup = app.clone();

        let frame_send = Arc::clone(&frame_arc);

        tokio::spawn(async move {
            let result = Self::sender_loop(frame_send, &mut stop_rx_send).await;
            if let Err(e) = result {
                error!("Discovery sender error: {e}");
            }
        });

        tokio::spawn(async move {
            let result = Self::receiver_loop(registry_recv, app_recv, &mut stop_rx_recv).await;
            if let Err(e) = result {
                error!("Discovery receiver error: {e}");
            }
        });

        tokio::spawn(async move {
            Self::cleanup_loop(registry_cleanup, app_cleanup, &mut stop_rx_cleanup).await;
        });

        info!("Discovery started for '{local_name}'");
    }

    pub async fn stop(&self) {
        let _ = self.stop_tx.send(());
        let mut session = self.ecdh_session.write().await;
        *session = None;
        info!("Discovery stopped");
    }

    async fn sender_loop(
        frame: Arc<Vec<u8>>,
        stop_rx: &mut broadcast::Receiver<()>,
    ) -> anyhow::Result<()> {
        let socket = Self::create_multicast_socket()?;
        let target = SocketAddr::new(IpAddr::V4(MULTICAST_ADDR), MULTICAST_PORT);
        let mut interval = time::interval(BROADCAST_INTERVAL);

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    if let Err(e) = socket.send_to(&frame, &target).await {
                        warn!("Multicast send error: {e}");
                    } else {
                        debug!("Sent discovery frame ({} bytes)", frame.len());
                    }
                }
                _ = stop_rx.recv() => {
                    break;
                }
            }
        }
        Ok(())
    }

    async fn receiver_loop(
        registry: Arc<PeerRegistry>,
        app: AppHandle,
        stop_rx: &mut broadcast::Receiver<()>,
    ) -> anyhow::Result<()> {
        let socket = Self::create_multicast_socket()?;
        let mut buf = [0u8; 2048];

        loop {
            tokio::select! {
                result = socket.recv_from(&mut buf) => {
                    match result {
                        Ok((len, addr)) => {
                            let data = &buf[..len];
                            if !is_lancast_frame(data) {
                                continue;
                            }
                            match decode_frame(data) {
                                Ok(frame) => {
                                    let peer_id = format!("{}", addr.ip());
                                    let is_new = registry.upsert(Peer {
                                        id: peer_id.clone(),
                                        name: frame.name.clone(),
                                        public_key: frame.public_key,
                                        last_seen: now_millis(),
                                        broadcasting: true,
                                        addr,
                                    }).await;

                                    if is_new {
                                        info!("Discovered peer: {} @ {}", frame.name, addr);
                                        emit_peer_discovered(&app, PeerDiscoveredPayload {
                                            peer_id,
                                            name: frame.name,
                                            discovered_at: now_millis(),
                                        });
                                    }
                                }
                                Err(e) => {
                                    debug!("Failed to decode frame from {addr}: {e}");
                                }
                            }
                        }
                        Err(e) => {
                            warn!("UDP recv error: {e}");
                        }
                    }
                }
                _ = stop_rx.recv() => {
                    break;
                }
            }
        }
        Ok(())
    }

    async fn cleanup_loop(
        registry: Arc<PeerRegistry>,
        app: AppHandle,
        stop_rx: &mut broadcast::Receiver<()>,
    ) {
        let mut interval = time::interval(STALE_CLEANUP_INTERVAL);

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    let stale = registry.remove_stale(PEER_TIMEOUT).await;
                    for peer_id in stale {
                        info!("Peer timed out: {peer_id}");
                        emit_peer_left(&app, PeerLeftPayload { peer_id });
                    }
                }
                _ = stop_rx.recv() => {
                    break;
                }
            }
        }
    }

    fn create_multicast_socket() -> anyhow::Result<UdpSocket> {
        let socket = Socket::new(Domain::IPV4, Type::DGRAM, Some(Protocol::UDP))?;
        socket.set_reuse_address(true)?;
        #[cfg(not(target_os = "windows"))]
        socket.set_reuse_port(true)?;
        socket.set_nonblocking(true)?;
        socket.set_multicast_ttl_v4(1)?;
        socket.set_multicast_loop_v4(false)?;

        let bind_addr = SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, MULTICAST_PORT);
        socket.bind(&bind_addr.into())?;

        socket.join_multicast_v4(&MULTICAST_ADDR, &Ipv4Addr::UNSPECIFIED)?;

        let std_socket: std::net::UdpSocket = socket.into();
        Ok(UdpSocket::from_std(std_socket)?)
    }
}
