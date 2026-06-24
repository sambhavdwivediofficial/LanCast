use hkdf::Hkdf;
use rand::rngs::OsRng;
use sha2::Sha256;
use x25519_dalek::{EphemeralSecret, PublicKey, SharedSecret};
use zeroize::ZeroizeOnDrop;

#[derive(ZeroizeOnDrop)]
pub struct EcdhSession {
    secret: Option<EphemeralSecret>,
    pub public_key: [u8; 32],
}

#[derive(ZeroizeOnDrop)]
pub struct DerivedKeys {
    pub aes_key: [u8; 32],
    pub hmac_key: [u8; 64],
}

impl EcdhSession {
    pub fn new() -> Self {
        let secret = EphemeralSecret::random_from_rng(OsRng);
        let public = PublicKey::from(&secret);
        let public_key = public.to_bytes();
        Self {
            secret: Some(secret),
            public_key,
        }
    }

    pub fn derive_keys(
        mut self,
        their_public_bytes: &[u8; 32],
    ) -> Result<DerivedKeys, &'static str> {
        let their_public = PublicKey::from(*their_public_bytes);
        let secret = self.secret.take().ok_or("Session already consumed")?;
        let shared: SharedSecret = secret.diffie_hellman(&their_public);
        let shared_bytes = shared.to_bytes();

        let hkdf = Hkdf::<Sha256>::new(None, &shared_bytes);
        let mut aes_key = [0u8; 32];
        let mut hmac_key = [0u8; 64];

        hkdf.expand(b"lancast-aes-key", &mut aes_key)
            .map_err(|_| "HKDF expand failed for AES key")?;
        hkdf.expand(b"lancast-hmac-key", &mut hmac_key)
            .map_err(|_| "HKDF expand failed for HMAC key")?;

        Ok(DerivedKeys { aes_key, hmac_key })
    }

    pub fn public_key_bytes(&self) -> [u8; 32] {
        self.public_key
    }
}

impl Default for EcdhSession {
    fn default() -> Self {
        Self::new()
    }
}
