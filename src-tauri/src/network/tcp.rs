use bytes::{Buf, BytesMut};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{Mutex, RwLock};
use tracing::{debug, error, info, warn};

use crate::crypto::aes_gcm;
use crate::crypto::session::SessionRegistry;
use crate::events::{
    self, GroupInvitePayload, GroupMessagePayload, MessageReceivedPayload, MessageSeenPayload,
};
use crate::network::peer::PeerRegistry;
use crate::network::transfer::{FileChunk, TransferManager};

const TCP_PORT: u16 = 45679;
const FRAME_HEADER_LEN: usize = 4;
const MAX_FRAME_SIZE: usize = 10 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum WireMessage {
    Text {
        message_id: String,
        content: String,
        timestamp: u64,
        is_system: bool,
    },
    GroupText {
        message_id: String,
        group_id: String,
        sender_name: String,
        content: String,
        timestamp: u64,
        is_system: bool,
    },
    FileChunk(FileChunk),
    SeenReceipt {
        message_id: String,
        seen_at: u64,
    },
    GroupInvite(GroupInvitePayload),
    Handshake {
        public_key: [u8; 32],
        name: String,
    },
    HandshakeAck {
        public_key: [u8; 32],
    },
}

type ConnectionMap = Arc<Mutex<HashMap<String, Arc<Mutex<tokio::net::tcp::OwnedWriteHalf>>>>>;

pub struct TcpService {
    peer_registry: Arc<PeerRegistry>,
    session_registry: Arc<SessionRegistry>,
    connections: ConnectionMap,
    transfer_manager: Arc<TransferManager>,
}

impl TcpService {
    pub fn new(peer_registry: Arc<PeerRegistry>) -> Self {
        Self {
            peer_registry,
            session_registry: Arc::new(SessionRegistry::new()),
            connections: Arc::new(Mutex::new(HashMap::new())),
            transfer_manager: Arc::new(TransferManager::new()),
        }
    }

    pub async fn start_listener(
        &self,
        app: AppHandle,
        peer_registry: Arc<PeerRegistry>,
        local_name: Arc<RwLock<String>>,
    ) {
        let bind_addr = SocketAddr::from(([0, 0, 0, 0], TCP_PORT));
        let listener = match TcpListener::bind(bind_addr).await {
            Ok(l) => l,
            Err(e) => {
                error!("Failed to bind TCP listener on {bind_addr}: {e}");
                return;
            }
        };

        info!("TCP listener active on {bind_addr}");

        loop {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    let app_clone = app.clone();
                    let registry = Arc::clone(&peer_registry);
                    let session_reg = Arc::clone(&self.session_registry);
                    let connections = Arc::clone(&self.connections);
                    let transfer = Arc::clone(&self.transfer_manager);
                    let name_lock = Arc::clone(&local_name);

                    tokio::spawn(async move {
                        let peer_id = addr.ip().to_string();
                        info!("Inbound TCP connection from {peer_id}");
                        Self::handle_connection(
                            stream,
                            peer_id,
                            app_clone,
                            registry,
                            session_reg,
                            connections,
                            transfer,
                            name_lock,
                        )
                        .await;
                    });
                }
                Err(e) => {
                    warn!("TCP accept error: {e}");
                }
            }
        }
    }

    async fn handle_connection(
        stream: TcpStream,
        peer_id: String,
        app: AppHandle,
        peer_registry: Arc<PeerRegistry>,
        session_registry: Arc<SessionRegistry>,
        connections: ConnectionMap,
        transfer_manager: Arc<TransferManager>,
        local_name: Arc<RwLock<String>>,
    ) {
        let (mut reader, writer) = stream.into_split();
        let writer = Arc::new(Mutex::new(writer));

        {
            let mut map = connections.lock().await;
            map.insert(peer_id.clone(), Arc::clone(&writer));
        }

        let local = local_name.read().await.clone();
        let our_public_key = session_registry.initiate_handshake(peer_id.clone());

        let handshake = WireMessage::Handshake {
            public_key: our_public_key,
            name: local,
        };

        if let Ok(encoded) = serde_json::to_vec(&handshake) {
            let mut w = writer.lock().await;
            let _ = write_frame(&mut *w, &encoded).await;
        }

        let mut buf = BytesMut::with_capacity(8192);

        loop {
            match reader.read_buf(&mut buf).await {
                Ok(0) => {
                    info!("Peer {peer_id} disconnected");
                    break;
                }
                Ok(_) => {}
                Err(e) => {
                    warn!("Read error from {peer_id}: {e}");
                    break;
                }
            }

            while let Some(frame) = try_read_frame(&mut buf) {
                let payload = if session_registry.has_session(&peer_id) {
                    let session = match session_registry.get_session(&peer_id) {
                        Some(s) => s,
                        None => break,
                    };

                    match aes_gcm::decrypt(session.aes_key(), &frame) {
                        Ok(plain) => plain.to_vec(),
                        Err(e) => {
                            warn!("Decryption failed from {peer_id}: {e}");
                            continue;
                        }
                    }
                } else {
                    frame
                };

                let msg: WireMessage = match serde_json::from_slice(&payload) {
                    Ok(m) => m,
                    Err(e) => {
                        debug!("Failed to parse message from {peer_id}: {e}");
                        continue;
                    }
                };

                Self::dispatch_message(
                    msg,
                    peer_id.clone(),
                    &app,
                    &peer_registry,
                    &session_registry,
                    &transfer_manager,
                    &writer,
                )
                .await;
            }
        }

        {
            let mut map = connections.lock().await;
            map.remove(&peer_id);
        }
        session_registry.remove_session(&peer_id);
    }

    async fn dispatch_message(
        msg: WireMessage,
        peer_id: String,
        app: &AppHandle,
        peer_registry: &Arc<PeerRegistry>,
        session_registry: &Arc<SessionRegistry>,
        transfer_manager: &Arc<TransferManager>,
        writer: &Arc<Mutex<tokio::net::tcp::OwnedWriteHalf>>,
    ) {
        match msg {
            WireMessage::Handshake {
                public_key,
                name: _,
            } => {
                if let Err(e) = session_registry.complete_handshake(&peer_id, &public_key) {
                    error!("Handshake failed for {peer_id}: {e}");
                    return;
                }

                let ack_key = session_registry.initiate_handshake(format!("{peer_id}_ack"));
                let ack = WireMessage::HandshakeAck {
                    public_key: ack_key,
                };
                if let Ok(encoded) = serde_json::to_vec(&ack) {
                    let mut w = writer.lock().await;
                    let _ = write_frame(&mut *w, &encoded).await;
                }

                peer_registry.touch(&peer_id).await;
            }

            WireMessage::HandshakeAck { public_key } => {
                let ack_peer = format!("{peer_id}_ack");
                let _ = session_registry.complete_handshake(&ack_peer, &public_key);
            }

            WireMessage::Text {
                message_id,
                content,
                timestamp,
                is_system,
            } => {
                let seen_at = now_millis();

                events::emit_message_received(
                    app,
                    MessageReceivedPayload {
                        message_id: message_id.clone(),
                        peer_id: peer_id.clone(),
                        content,
                        timestamp,
                        is_system,
                    },
                );

                let receipt = WireMessage::SeenReceipt {
                    message_id,
                    seen_at,
                };
                if let Ok(encoded) = serde_json::to_vec(&receipt) {
                    let mut w = writer.lock().await;
                    let _ = write_frame(&mut *w, &encoded).await;
                }
            }

            WireMessage::GroupText {
                message_id,
                group_id,
                sender_name,
                content,
                timestamp,
                is_system,
            } => {
                events::emit_group_message(
                    app,
                    GroupMessagePayload {
                        message_id,
                        group_id,
                        sender_id: peer_id.clone(),
                        sender_name,
                        content,
                        timestamp,
                        is_system,
                    },
                );
            }

            WireMessage::FileChunk(chunk) => {
                transfer_manager.init_inbound(app, peer_id.clone(), &chunk);
                transfer_manager.ingest_chunk(app, chunk);
            }

            WireMessage::SeenReceipt {
                message_id,
                seen_at,
            } => {
                events::emit_message_seen(
                    app,
                    MessageSeenPayload {
                        message_id,
                        peer_id,
                        seen_at,
                    },
                );
            }

            WireMessage::GroupInvite(invite) => {
                events::emit_group_invite(app, invite);
            }
        }
    }

    async fn get_or_connect(
        &self,
        peer_id: &str,
    ) -> Option<Arc<Mutex<tokio::net::tcp::OwnedWriteHalf>>> {
        {
            let map = self.connections.lock().await;
            if let Some(w) = map.get(peer_id) {
                return Some(Arc::clone(w));
            }
        }

        let peer = self.peer_registry.get(peer_id).await?;
        let addr = SocketAddr::new(peer.addr.ip(), TCP_PORT);

        match TcpStream::connect(addr).await {
            Ok(stream) => {
                let (_, writer) = stream.into_split();
                let writer = Arc::new(Mutex::new(writer));
                let mut map = self.connections.lock().await;
                map.insert(peer_id.to_string(), Arc::clone(&writer));
                Some(writer)
            }
            Err(e) => {
                warn!("Failed to connect to {peer_id} @ {addr}: {e}");
                None
            }
        }
    }

    async fn send_encrypted(&self, peer_id: &str, msg: &WireMessage) -> anyhow::Result<()> {
        let encoded = serde_json::to_vec(msg)?;

        let payload = if let Some(session) = self.session_registry.get_session(peer_id) {
            aes_gcm::encrypt(session.aes_key(), &encoded).map_err(|e| anyhow::anyhow!("{e}"))?
        } else {
            encoded
        };

        let writer = self
            .get_or_connect(peer_id)
            .await
            .ok_or_else(|| anyhow::anyhow!("No connection to peer {peer_id}"))?;

        let mut w = writer.lock().await;
        write_frame(&mut *w, &payload).await?;
        Ok(())
    }

    pub async fn send_message(
        &self,
        peer_id: &str,
        content: &str,
        message_id: &str,
        is_system: bool,
    ) -> anyhow::Result<()> {
        let msg = WireMessage::Text {
            message_id: message_id.to_string(),
            content: content.to_string(),
            timestamp: now_millis(),
            is_system,
        };
        self.send_encrypted(peer_id, &msg).await
    }

    pub async fn send_group_message(
        &self,
        peer_id: &str,
        group_id: &str,
        content: &str,
        message_id: &str,
        sender_name: &str,
        timestamp: u64,
    ) -> anyhow::Result<()> {
        let msg = WireMessage::GroupText {
            message_id: message_id.to_string(),
            group_id: group_id.to_string(),
            sender_name: sender_name.to_string(),
            content: content.to_string(),
            timestamp,
            is_system: false,
        };
        self.send_encrypted(peer_id, &msg).await
    }

    pub async fn send_file_chunk(&self, peer_id: &str, chunk: FileChunk) -> anyhow::Result<()> {
        let msg = WireMessage::FileChunk(chunk);
        self.send_encrypted(peer_id, &msg).await
    }

    pub async fn send_invite(
        &self,
        peer_id: &str,
        invite: GroupInvitePayload,
    ) -> anyhow::Result<()> {
        let msg = WireMessage::GroupInvite(invite);
        self.send_encrypted(peer_id, &msg).await
    }
}

async fn write_frame<W: AsyncWriteExt + Unpin>(writer: &mut W, data: &[u8]) -> anyhow::Result<()> {
    if data.len() > MAX_FRAME_SIZE {
        anyhow::bail!("Frame too large: {} bytes", data.len());
    }
    let len = data.len() as u32;
    writer.write_all(&len.to_be_bytes()).await?;
    writer.write_all(data).await?;
    writer.flush().await?;
    Ok(())
}

fn try_read_frame(buf: &mut BytesMut) -> Option<Vec<u8>> {
    if buf.len() < FRAME_HEADER_LEN {
        return None;
    }

    let len = u32::from_be_bytes([buf[0], buf[1], buf[2], buf[3]]) as usize;

    if len > MAX_FRAME_SIZE {
        buf.clear();
        return None;
    }

    if buf.len() < FRAME_HEADER_LEN + len {
        return None;
    }

    buf.advance(FRAME_HEADER_LEN);
    let frame = buf[..len].to_vec();
    buf.advance(len);
    Some(frame)
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
