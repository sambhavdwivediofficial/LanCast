use thiserror::Error;

pub const CHUNK_SIZE: usize = 65_536;
pub const MAX_FILE_SIZE: u64 = 104_857_600;
pub const MAX_FILES_PER_SEND: usize = 4;

#[derive(Debug, Error)]
pub enum ChunkerError {
    #[error("File exceeds maximum size of 100MB: {0} bytes")]
    FileTooLarge(u64),
    #[error("Empty file — nothing to chunk")]
    EmptyFile,
    #[error("Chunk index {0} out of bounds for total {1}")]
    InvalidChunkIndex(u32, u32),
    #[error("Reassembly incomplete: received {0} of {1} chunks")]
    IncompleteTransfer(u32, u32),
    #[error("Duplicate chunk received at index {0}")]
    DuplicateChunk(u32),
}

#[derive(Debug, Clone)]
pub struct Chunk {
    pub index: u32,
    pub total: u32,
    pub data: Vec<u8>,
    pub is_last: bool,
}

pub fn split_into_chunks(data: &[u8]) -> Result<Vec<Chunk>, ChunkerError> {
    if data.is_empty() {
        return Err(ChunkerError::EmptyFile);
    }
    if data.len() as u64 > MAX_FILE_SIZE {
        return Err(ChunkerError::FileTooLarge(data.len() as u64));
    }

    let total = data.len().div_ceil(CHUNK_SIZE);
    let mut chunks = Vec::with_capacity(total);

    for (i, chunk_data) in data.chunks(CHUNK_SIZE).enumerate() {
        chunks.push(Chunk {
            index: i as u32,
            total: total as u32,
            data: chunk_data.to_vec(),
            is_last: i == total - 1,
        });
    }

    Ok(chunks)
}

pub struct Reassembler {
    total_chunks: u32,
    received: Vec<Option<Vec<u8>>>,
    received_count: u32,
}

impl Reassembler {
    pub fn new(total_chunks: u32) -> Self {
        Self {
            total_chunks,
            received: vec![None; total_chunks as usize],
            received_count: 0,
        }
    }

    pub fn ingest(&mut self, chunk: Chunk) -> Result<bool, ChunkerError> {
        if chunk.index >= self.total_chunks {
            return Err(ChunkerError::InvalidChunkIndex(
                chunk.index,
                self.total_chunks,
            ));
        }
        if self.received[chunk.index as usize].is_some() {
            return Err(ChunkerError::DuplicateChunk(chunk.index));
        }
        self.received[chunk.index as usize] = Some(chunk.data);
        self.received_count += 1;
        Ok(self.received_count == self.total_chunks)
    }

    pub fn reassemble(self) -> Result<Vec<u8>, ChunkerError> {
        if self.received_count != self.total_chunks {
            return Err(ChunkerError::IncompleteTransfer(
                self.received_count,
                self.total_chunks,
            ));
        }

        let total_size: usize = self
            .received
            .iter()
            .filter_map(|c| c.as_ref())
            .map(|c| c.len())
            .sum();

        let mut output = Vec::with_capacity(total_size);
        for chunk in self.received.into_iter().flatten() {
            output.extend_from_slice(&chunk);
        }
        Ok(output)
    }

    pub fn progress(&self) -> (u32, u32) {
        (self.received_count, self.total_chunks)
    }
}
