use hmac::{Hmac, Mac};
use sha2::Sha512;
use subtle::ConstantTimeEq;
use thiserror::Error;
use zeroize::Zeroizing;

type HmacSha512 = Hmac<Sha512>;

const HMAC_OUTPUT_LEN: usize = 64;

#[derive(Debug, Error)]
pub enum HmacError {
    #[error("HMAC verification failed — message integrity compromised")]
    VerificationFailed,
    #[error("Invalid HMAC tag length: expected {HMAC_OUTPUT_LEN}, got {0}")]
    InvalidTagLength(usize),
    #[error("HMAC computation error")]
    ComputationError,
}

pub fn sign(key: &[u8; 64], message: &[u8]) -> Result<[u8; HMAC_OUTPUT_LEN], HmacError> {
    let mut mac = HmacSha512::new_from_slice(key).map_err(|_| HmacError::ComputationError)?;
    mac.update(message);
    let result = mac.finalize().into_bytes();
    let mut tag = [0u8; HMAC_OUTPUT_LEN];
    tag.copy_from_slice(&result);
    Ok(tag)
}

pub fn verify(key: &[u8; 64], message: &[u8], tag: &[u8]) -> Result<(), HmacError> {
    if tag.len() != HMAC_OUTPUT_LEN {
        return Err(HmacError::InvalidTagLength(tag.len()));
    }

    let expected = sign(key, message)?;
    let tag_array: [u8; HMAC_OUTPUT_LEN] = tag
        .try_into()
        .map_err(|_| HmacError::InvalidTagLength(tag.len()))?;

    if expected.ct_eq(&tag_array).unwrap_u8() == 1 {
        Ok(())
    } else {
        Err(HmacError::VerificationFailed)
    }
}

pub fn sign_and_append(key: &[u8; 64], message: &[u8]) -> Result<Vec<u8>, HmacError> {
    let tag = sign(key, message)?;
    let mut output = Vec::with_capacity(message.len() + HMAC_OUTPUT_LEN);
    output.extend_from_slice(message);
    output.extend_from_slice(&tag);
    Ok(output)
}

pub fn verify_and_strip(
    key: &[u8; 64],
    signed_message: &[u8],
) -> Result<Zeroizing<Vec<u8>>, HmacError> {
    if signed_message.len() < HMAC_OUTPUT_LEN {
        return Err(HmacError::InvalidTagLength(signed_message.len()));
    }

    let (message, tag) = signed_message.split_at(signed_message.len() - HMAC_OUTPUT_LEN);
    verify(key, message, tag)?;
    Ok(Zeroizing::new(message.to_vec()))
}
