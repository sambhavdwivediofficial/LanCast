use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, State, Window};
use uuid::Uuid;

use crate::events;
use crate::AppState;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeerDto {
    pub peer_id: String,
    pub name: String,
    pub last_seen: u64,
    pub broadcasting: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupDto {
    pub group_id: String,
    pub name: String,
    pub is_private: bool,
    pub member_count: u32,
    pub members: Vec<String>,
    pub created_at: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageDto {
    pub peer_id: String,
    pub content: String,
    pub message_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendGroupMessageDto {
    pub group_id: String,
    pub content: String,
    pub message_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGroupDto {
    pub name: String,
    pub is_private: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvitePeerDto {
    pub group_id: String,
    pub peer_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RespondInviteDto {
    pub invite_id: String,
    pub group_id: String,
    pub accepted: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChunkDto {
    pub transfer_id: String,
    pub peer_id: String,
    pub chunk_index: u32,
    pub total_chunks: u32,
    pub file_name: String,
    pub file_size: u64,
    pub mime_type: String,
    pub data: Vec<u8>,
    pub is_last: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T: Serialize> CommandResult<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(msg: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}

fn now_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[tauri::command]
pub async fn set_local_name(
    name: String,
    state: State<'_, AppState>,
) -> Result<CommandResult<bool>, String> {
    let name = name.trim().to_string();
    if name.is_empty() || name.len() > 32 {
        return Ok(CommandResult::err("Name must be 1–32 characters"));
    }
    let mut local = state.local_name.write().await;
    *local = name;
    Ok(CommandResult::ok(true))
}

#[tauri::command]
pub async fn get_local_name(state: State<'_, AppState>) -> Result<CommandResult<String>, String> {
    let name = state.local_name.read().await.clone();
    Ok(CommandResult::ok(name))
}

#[tauri::command]
pub async fn start_broadcast(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResult<bool>, String> {
    let name = state.local_name.read().await.clone();
    if name.is_empty() {
        return Ok(CommandResult::err("Name not set"));
    }

    let discovery = Arc::clone(&state.discovery_service);
    let broadcasting = Arc::clone(&state.broadcasting);
    let app_clone = app.clone();

    tokio::spawn(async move {
        let mut b = broadcasting.write().await;
        *b = true;
        drop(b);
        discovery.start(app_clone, name).await;
    });

    events::emit_broadcast_status(&app, events::BroadcastStatusPayload { active: true });
    Ok(CommandResult::ok(true))
}

#[tauri::command]
pub async fn stop_broadcast(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResult<bool>, String> {
    state.discovery_service.stop().await;
    let mut b = state.broadcasting.write().await;
    *b = false;
    events::emit_broadcast_status(&app, events::BroadcastStatusPayload { active: false });
    Ok(CommandResult::ok(true))
}

#[tauri::command]
pub async fn get_active_peers(
    state: State<'_, AppState>,
) -> Result<CommandResult<Vec<PeerDto>>, String> {
    let peers = state.peer_registry.get_all().await;
    let dtos = peers
        .into_iter()
        .map(|p| PeerDto {
            peer_id: p.id,
            name: p.name,
            last_seen: p.last_seen,
            broadcasting: p.broadcasting,
        })
        .collect();
    Ok(CommandResult::ok(dtos))
}

#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    payload: SendMessageDto,
    state: State<'_, AppState>,
) -> Result<CommandResult<bool>, String> {
    let result = state
        .tcp_service
        .send_message(
            &payload.peer_id,
            &payload.content,
            &payload.message_id,
            false,
        )
        .await;

    match result {
        Ok(_) => {
            events::emit_message_sent(
                &app,
                events::MessageSentPayload {
                    message_id: payload.message_id,
                    status: "sent".into(),
                },
            );
            Ok(CommandResult::ok(true))
        }
        Err(e) => Ok(CommandResult::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn send_file_chunk(
    _app: AppHandle,
    payload: FileChunkDto,
    state: State<'_, AppState>,
) -> Result<CommandResult<bool>, String> {
    let peer_id = payload.peer_id.clone();
    let result = state
        .tcp_service
        .send_file_chunk(&peer_id, payload.into())
        .await;

    match result {
        Ok(_) => Ok(CommandResult::ok(true)),
        Err(e) => Ok(CommandResult::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn create_group(
    payload: CreateGroupDto,
    state: State<'_, AppState>,
) -> Result<CommandResult<GroupDto>, String> {
    let name = payload.name.trim().to_string();
    if name.is_empty() || name.len() > 64 {
        return Ok(CommandResult::err("Group name must be 1–64 characters"));
    }

    let local_name = state.local_name.read().await.clone();
    let mut manager = state.group_manager.write().await;

    let group = manager.create_group(name, payload.is_private, local_name);

    Ok(CommandResult::ok(GroupDto {
        group_id: group.id.clone(),
        name: group.name.clone(),
        is_private: group.is_private,
        member_count: group.members.len() as u32,
        members: group.members.clone(),
        created_at: group.created_at,
    }))
}

#[tauri::command]
pub async fn join_group(
    group_id: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<CommandResult<bool>, String> {
    let local_name = state.local_name.read().await.clone();
    let peer_id = {
        let peers = state.peer_registry.get_by_name(&local_name).await;
        peers
            .map(|p| p.id)
            .unwrap_or_else(|| Uuid::new_v4().to_string())
    };

    let mut manager = state.group_manager.write().await;
    match manager.join_group(&group_id, peer_id, local_name.clone()) {
        Ok(_) => {
            events::emit_group_member_joined(
                &app,
                events::GroupMemberJoinedPayload {
                    group_id,
                    peer_id: String::new(),
                    peer_name: local_name.clone(),
                    inviter_name: String::new(),
                    timestamp: now_millis(),
                },
            );
            Ok(CommandResult::ok(true))
        }
        Err(e) => Ok(CommandResult::err(e)),
    }
}

#[tauri::command]
pub async fn leave_group(
    group_id: String,
    state: State<'_, AppState>,
) -> Result<CommandResult<bool>, String> {
    let local_name = state.local_name.read().await.clone();
    let mut manager = state.group_manager.write().await;
    manager.leave_group(&group_id, &local_name);
    Ok(CommandResult::ok(true))
}

#[tauri::command]
pub async fn send_group_message(
    app: AppHandle,
    payload: SendGroupMessageDto,
    state: State<'_, AppState>,
) -> Result<CommandResult<bool>, String> {
    let local_name = state.local_name.read().await.clone();
    let manager = state.group_manager.read().await;

    let members = match manager.get_members(&payload.group_id) {
        Some(m) => m,
        None => return Ok(CommandResult::err("Group not found")),
    };

    drop(manager);

    let timestamp = now_millis();

    for member_id in &members {
        let _ = state
            .tcp_service
            .send_group_message(
                member_id,
                &payload.group_id,
                &payload.content,
                &payload.message_id,
                &local_name,
                timestamp,
            )
            .await;
    }

    events::emit_group_message(
        &app,
        events::GroupMessagePayload {
            message_id: payload.message_id,
            group_id: payload.group_id,
            sender_id: String::new(),
            sender_name: local_name,
            content: payload.content,
            timestamp,
            is_system: false,
        },
    );

    Ok(CommandResult::ok(true))
}

#[tauri::command]
pub async fn invite_peer_to_group(
    _app: AppHandle,
    payload: InvitePeerDto,
    state: State<'_, AppState>,
) -> Result<CommandResult<String>, String> {
    let local_name = state.local_name.read().await.clone();
    let manager = state.group_manager.read().await;

    let group = match manager.get_group(&payload.group_id) {
        Some(g) => g.clone(),
        None => return Ok(CommandResult::err("Group not found")),
    };

    drop(manager);

    let invite_id = Uuid::new_v4().to_string();
    let member_count = {
        let manager = state.group_manager.read().await;
        manager.get_member_count(&payload.group_id) as u32
    };

    let invite_payload = events::GroupInvitePayload {
        invite_id: invite_id.clone(),
        group_id: payload.group_id.clone(),
        group_name: group.name.clone(),
        inviter_id: String::new(),
        inviter_name: local_name.clone(),
        member_count,
        timestamp: now_millis(),
    };

    let _ = state
        .tcp_service
        .send_invite(&payload.peer_id, invite_payload.clone())
        .await;

    Ok(CommandResult::ok(invite_id))
}

#[tauri::command]
pub async fn respond_to_invite(
    app: AppHandle,
    payload: RespondInviteDto,
    state: State<'_, AppState>,
) -> Result<CommandResult<bool>, String> {
    if payload.accepted {
        let local_name = state.local_name.read().await.clone();
        let peer_id = Uuid::new_v4().to_string();
        let mut manager = state.group_manager.write().await;

        let _ = manager.join_group(&payload.group_id, peer_id.clone(), local_name.clone());

        events::emit_group_member_joined(
            &app,
            events::GroupMemberJoinedPayload {
                group_id: payload.group_id.clone(),
                peer_id,
                peer_name: local_name,
                inviter_name: String::new(),
                timestamp: now_millis(),
            },
        );
    }

    Ok(CommandResult::ok(true))
}

#[tauri::command]
pub async fn get_groups(
    state: State<'_, AppState>,
) -> Result<CommandResult<Vec<GroupDto>>, String> {
    let manager = state.group_manager.read().await;
    let groups = manager.get_all_groups();
    let dtos = groups
        .into_iter()
        .map(|g| GroupDto {
            group_id: g.id.clone(),
            name: g.name.clone(),
            is_private: g.is_private,
            member_count: g.members.len() as u32,
            members: g.members.clone(),
            created_at: g.created_at,
        })
        .collect();
    Ok(CommandResult::ok(dtos))
}

#[tauri::command]
pub async fn get_public_groups(
    state: State<'_, AppState>,
) -> Result<CommandResult<Vec<GroupDto>>, String> {
    let manager = state.group_manager.read().await;
    let groups = manager.get_public_groups();
    let dtos = groups
        .into_iter()
        .map(|g| GroupDto {
            group_id: g.id.clone(),
            name: g.name.clone(),
            is_private: false,
            member_count: g.members.len() as u32,
            members: g.members.clone(),
            created_at: g.created_at,
        })
        .collect();
    Ok(CommandResult::ok(dtos))
}

#[tauri::command]
pub async fn protect_window(
    app: AppHandle,
    window: Window,
    state: State<'_, AppState>,
) -> Result<CommandResult<bool>, String> {
    match state.screenshot_guard.protect(&window) {
        Ok(_) => {
            let payload = events::ScreenshotAttemptPayload {
                peer_name: state.local_name.read().await.clone(),
                timestamp: now_millis(),
                context: "protection_active".into(),
            };
            events::emit_screenshot_attempt(&app, payload);
            Ok(CommandResult::ok(true))
        }
        Err(e) => Ok(CommandResult::err(e)),
    }
}

#[tauri::command]
pub async fn unprotect_window(
    window: Window,
    state: State<'_, AppState>,
) -> Result<CommandResult<bool>, String> {
    match state.screenshot_guard.unprotect(&window) {
        Ok(_) => Ok(CommandResult::ok(true)),
        Err(e) => Ok(CommandResult::err(e)),
    }
}

impl From<FileChunkDto> for crate::network::transfer::FileChunk {
    fn from(dto: FileChunkDto) -> Self {
        crate::network::transfer::FileChunk {
            transfer_id: dto.transfer_id,
            chunk_index: dto.chunk_index,
            total_chunks: dto.total_chunks,
            file_name: dto.file_name,
            file_size: dto.file_size,
            mime_type: dto.mime_type,
            data: dto.data,
            is_last: dto.is_last,
        }
    }
}
