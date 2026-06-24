use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::AppHandle;

use crate::events::{
    emit_file_transfer_complete, emit_file_transfer_init, emit_file_transfer_progress,
    FileTransferCompletePayload, FileTransferInitPayload, FileTransferProgressPayload,
};
use crate::network::chunker::Reassembler;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChunk {
    pub transfer_id: String,
    pub chunk_index: u32,
    pub total_chunks: u32,
    pub file_name: String,
    pub file_size: u64,
    pub mime_type: String,
    pub data: Vec<u8>,
    pub is_last: bool,
}

struct InboundTransfer {
    peer_id: String,
    file_name: String,
    file_size: u64,
    mime_type: String,
    reassembler: Reassembler,
}

pub struct TransferManager {
    inbound: Arc<DashMap<String, InboundTransfer>>,
    completed: Arc<DashMap<String, Vec<u8>>>,
}

impl TransferManager {
    pub fn new() -> Self {
        Self {
            inbound: Arc::new(DashMap::new()),
            completed: Arc::new(DashMap::new()),
        }
    }

    pub fn init_inbound(&self, app: &AppHandle, peer_id: String, chunk: &FileChunk) {
        if !self.inbound.contains_key(&chunk.transfer_id) {
            self.inbound.insert(
                chunk.transfer_id.clone(),
                InboundTransfer {
                    peer_id: peer_id.clone(),
                    file_name: chunk.file_name.clone(),
                    file_size: chunk.file_size,
                    mime_type: chunk.mime_type.clone(),
                    reassembler: Reassembler::new(chunk.total_chunks),
                },
            );
            emit_file_transfer_init(
                app,
                FileTransferInitPayload {
                    transfer_id: chunk.transfer_id.clone(),
                    peer_id,
                    file_name: chunk.file_name.clone(),
                    file_size: chunk.file_size,
                    mime_type: chunk.mime_type.clone(),
                    chunk_count: chunk.total_chunks,
                },
            );
        }
    }

    pub fn ingest_chunk(&self, app: &AppHandle, chunk: FileChunk) {
        let transfer_id = chunk.transfer_id.clone();

        let complete = {
            let mut entry = match self.inbound.get_mut(&transfer_id) {
                Some(e) => e,
                None => return,
            };

            let ingest_chunk = crate::network::chunker::Chunk {
                index: chunk.chunk_index,
                total: chunk.total_chunks,
                data: chunk.data,
                is_last: chunk.is_last,
            };

            match entry.reassembler.ingest(ingest_chunk) {
                Ok(done) => {
                    let (received, total) = entry.reassembler.progress();
                    emit_file_transfer_progress(
                        app,
                        FileTransferProgressPayload {
                            transfer_id: transfer_id.clone(),
                            received_chunks: received,
                            total_chunks: total,
                        },
                    );
                    done
                }
                Err(_) => false,
            }
        };

        if complete {
            if let Some((_, transfer)) = self.inbound.remove(&transfer_id) {
                let peer_id = transfer.peer_id.clone();
                let file_name = transfer.file_name.clone();
                let file_size = transfer.file_size;
                let mime_type = transfer.mime_type.clone();

                if let Ok(data) = transfer.reassembler.reassemble() {
                    self.completed.insert(transfer_id.clone(), data);
                    emit_file_transfer_complete(
                        app,
                        FileTransferCompletePayload {
                            transfer_id,
                            peer_id,
                            file_name,
                            file_size,
                            mime_type,
                        },
                    );
                }
            }
        }
    }

    pub fn take_completed(&self, transfer_id: &str) -> Option<Vec<u8>> {
        self.completed.remove(transfer_id).map(|(_, data)| data)
    }
}

impl Default for TransferManager {
    fn default() -> Self {
        Self::new()
    }
}
