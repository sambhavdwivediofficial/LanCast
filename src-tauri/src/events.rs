use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeerDiscoveredPayload {
    pub peer_id: String,
    pub name: String,
    pub discovered_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeerLeftPayload {
    pub peer_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageReceivedPayload {
    pub message_id: String,
    pub peer_id: String,
    pub content: String,
    pub timestamp: u64,
    pub is_system: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageSentPayload {
    pub message_id: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageSeenPayload {
    pub message_id: String,
    pub peer_id: String,
    pub seen_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTransferInitPayload {
    pub transfer_id: String,
    pub peer_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub mime_type: String,
    pub chunk_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTransferProgressPayload {
    pub transfer_id: String,
    pub received_chunks: u32,
    pub total_chunks: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTransferCompletePayload {
    pub transfer_id: String,
    pub peer_id: String,
    pub file_name: String,
    pub file_size: u64,
    pub mime_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupMessagePayload {
    pub message_id: String,
    pub group_id: String,
    pub sender_id: String,
    pub sender_name: String,
    pub content: String,
    pub timestamp: u64,
    pub is_system: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupInvitePayload {
    pub invite_id: String,
    pub group_id: String,
    pub group_name: String,
    pub inviter_id: String,
    pub inviter_name: String,
    pub member_count: u32,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupMemberCountPayload {
    pub group_id: String,
    pub invite_id: String,
    pub member_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupMemberJoinedPayload {
    pub group_id: String,
    pub peer_id: String,
    pub peer_name: String,
    pub inviter_name: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenshotAttemptPayload {
    pub peer_name: String,
    pub timestamp: u64,
    pub context: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BroadcastStatusPayload {
    pub active: bool,
}

pub fn emit_peer_discovered(handle: &AppHandle, payload: PeerDiscoveredPayload) {
    let _ = handle.emit("peer_discovered", payload);
}

pub fn emit_peer_left(handle: &AppHandle, payload: PeerLeftPayload) {
    let _ = handle.emit("peer_left", payload);
}

pub fn emit_message_received(handle: &AppHandle, payload: MessageReceivedPayload) {
    let _ = handle.emit("message_received", payload);
}

pub fn emit_message_sent(handle: &AppHandle, payload: MessageSentPayload) {
    let _ = handle.emit("message_sent", payload);
}

pub fn emit_message_seen(handle: &AppHandle, payload: MessageSeenPayload) {
    let _ = handle.emit("message_seen", payload);
}

pub fn emit_file_transfer_init(handle: &AppHandle, payload: FileTransferInitPayload) {
    let _ = handle.emit("file_transfer_init", payload);
}

pub fn emit_file_transfer_progress(handle: &AppHandle, payload: FileTransferProgressPayload) {
    let _ = handle.emit("file_transfer_progress", payload);
}

pub fn emit_file_transfer_complete(handle: &AppHandle, payload: FileTransferCompletePayload) {
    let _ = handle.emit("file_transfer_complete", payload);
}

pub fn emit_group_message(handle: &AppHandle, payload: GroupMessagePayload) {
    let _ = handle.emit("group_message_received", payload);
}

pub fn emit_group_invite(handle: &AppHandle, payload: GroupInvitePayload) {
    let _ = handle.emit("group_invite_received", payload);
}

pub fn emit_group_member_count(handle: &AppHandle, payload: GroupMemberCountPayload) {
    let _ = handle.emit("group_member_count_updated", payload);
}

pub fn emit_group_member_joined(handle: &AppHandle, payload: GroupMemberJoinedPayload) {
    let _ = handle.emit("group_member_joined", payload);
}

pub fn emit_screenshot_attempt(handle: &AppHandle, payload: ScreenshotAttemptPayload) {
    let _ = handle.emit("screenshot_attempt", payload);
}

pub fn emit_broadcast_status(handle: &AppHandle, payload: BroadcastStatusPayload) {
    let _ = handle.emit("broadcast_status", payload);
}
