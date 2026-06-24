use thiserror::Error;

pub const MAGIC: [u8; 8] = [0x4C, 0x41, 0x4E, 0x43, 0x41, 0x53, 0x54, 0x00];
pub const PROTOCOL_VERSION: u8 = 1;
pub const MAX_NAME_LEN: usize = 32;
pub const MIN_FRAME_LEN: usize = MAGIC.len() + 1 + 32 + 1;

#[derive(Debug, Error)]
pub enum MagicError {
    #[error("Invalid magic bytes — not a LANCAST frame")]
    InvalidMagic,
    #[error("Unsupported protocol version: {0}")]
    UnsupportedVersion(u8),
    #[error("Frame too short: {0} bytes")]
    FrameTooShort(usize),
    #[error("Name too long: {0} bytes")]
    NameTooLong(usize),
    #[error("Invalid UTF-8 in name field")]
    InvalidName,
}

#[derive(Debug, Clone)]
pub struct DiscoveryFrame {
    pub public_key: [u8; 32],
    pub name: String,
    pub version: u8,
}

pub fn encode_frame(public_key: &[u8; 32], name: &str) -> Vec<u8> {
    let name_bytes = name.as_bytes();
    let name_len = name_bytes.len().min(MAX_NAME_LEN) as u8;
    let mut frame = Vec::with_capacity(MIN_FRAME_LEN + name_len as usize);

    frame.extend_from_slice(&MAGIC);
    frame.push(PROTOCOL_VERSION);
    frame.extend_from_slice(public_key);
    frame.push(name_len);
    frame.extend_from_slice(&name_bytes[..name_len as usize]);
    frame
}

pub fn decode_frame(data: &[u8]) -> Result<DiscoveryFrame, MagicError> {
    if data.len() < MIN_FRAME_LEN {
        return Err(MagicError::FrameTooShort(data.len()));
    }

    if &data[..MAGIC.len()] != &MAGIC {
        return Err(MagicError::InvalidMagic);
    }

    let version = data[MAGIC.len()];
    if version != PROTOCOL_VERSION {
        return Err(MagicError::UnsupportedVersion(version));
    }

    let offset = MAGIC.len() + 1;
    let public_key_bytes = &data[offset..offset + 32];
    let mut public_key = [0u8; 32];
    public_key.copy_from_slice(public_key_bytes);

    let name_len_offset = offset + 32;
    let name_len = data[name_len_offset] as usize;

    if name_len > MAX_NAME_LEN {
        return Err(MagicError::NameTooLong(name_len));
    }

    let name_start = name_len_offset + 1;
    if data.len() < name_start + name_len {
        return Err(MagicError::FrameTooShort(data.len()));
    }

    let name = std::str::from_utf8(&data[name_start..name_start + name_len])
        .map_err(|_| MagicError::InvalidName)?
        .to_string();

    Ok(DiscoveryFrame {
        public_key,
        name,
        version,
    })
}

pub fn is_lancast_frame(data: &[u8]) -> bool {
    data.len() >= MAGIC.len() && &data[..MAGIC.len()] == &MAGIC
}
