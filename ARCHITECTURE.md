<div align="center">

# LANCAST — Architecture

*A complete technical reference for the LANCAST system design*

</div>

---

## Table of Contents

- [Overview](#overview)
- [System Boundaries](#system-boundaries)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Security Model](#security-model)
- [Network Protocol](#network-protocol)
- [Data Flow](#data-flow)
- [Screenshot Protection](#screenshot-protection)
- [State Management](#state-management)
- [File Transfer Pipeline](#file-transfer-pipeline)
- [Build and Distribution](#build-and-distribution)
- [Design Decisions](#design-decisions)

---

## Overview

LANCAST is a **Tauri 2.0 desktop application** with a React frontend and a Rust backend. The two halves communicate exclusively through Tauri's IPC bridge — typed commands (frontend → backend) and typed events (backend → frontend). No HTTP server, no WebSocket server, no shared memory. The IPC bridge is the single, auditable integration surface.

The application is designed around three non-negotiable invariants:

1. **No data persists to disk.** All state lives in RAM. Termination destroys it completely.
2. **No network traffic is legible.** Every byte crossing the wire is AES-256-GCM encrypted with a per-session key.
3. **No third-party infrastructure.** Discovery, key exchange, and messaging happen entirely on the local network segment.

---

## System Boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│                         LANCAST Process                          │
│                                                                  │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐ │
│  │     React Frontend      │    │        Rust Backend          │ │
│  │   (WebView / Vite)      │◄──►│      (Tauri Core)            │ │
│  │                         │    │                              │ │
│  │  Pages · Components     │    │  Commands · Events           │ │
│  │  Hooks · Zustand Store  │    │  Discovery · Crypto          │ │
│  │  Tailwind · Framer      │    │  Network · Groups            │ │
│  │                         │    │  Screenshot Guard            │ │
│  └─────────────────────────┘    └──────────────┬───────────────┘ │
│                                                │                 │
└────────────────────────────────────────────────┼─────────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────┐
                    │           LAN              │                │
                    │                            ▼                │
                    │   ┌──────────────────────────────────────┐  │
                    │   │     UDP Multicast (Discovery)        │  │
                    │   │     TCP Streams   (Messaging)        │  │
                    │   │     Magic Bytes   (Handshake)        │  │
                    │   └──────────────────────────────────────┘  │
                    └─────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Technology

| Concern | Choice | Rationale |
|---------|--------|-----------|
| UI Library | React 18 | Concurrent rendering, mature ecosystem |
| Styling | Tailwind CSS | Utility-first, zero runtime, consistent tokens |
| Routing | React Router v6 | Declarative, nested routes for app shell |
| State | Zustand | Minimal, no boilerplate, selector-based subscriptions |
| Animation | Framer Motion | Production-quality spring physics |
| Date/Time | date-fns | Tree-shakeable, pure functions |
| Build | Vite 5 | Sub-second HMR, native ESM |

### Page Graph

```
ProfilePage (entry — blocks until name submitted)
     │
     ▼
AppShell (persistent shell: sidebar + outlet)
     │
     ├── HomePage         (default route "/")
     ├── ChatPage         ("/chat/:peerId")
     ├── GroupPage        ("/group/:groupId")
     ├── PeersPage        ("/peers")
     └── NotificationPage ("/notifications")
```

### Component Hierarchy

```
AppShell
├── Sidebar
│   ├── NavItem (× 5: Home, Chat, Group, Peers, Notifications)
│   ├── Tooltip (custom — renders only when sidebar is collapsed)
│   └── BroadcastButton (manages red ↔ green dot state)
│
└── <Outlet> (current page)
    ├── MessageBubble    (text · file · system variants)
    ├── FilePreview      (type icon · name · size · download)
    ├── GroupCard        (public/private · member count · hover menu)
    ├── PeerCard         (name · status · last seen)
    ├── NotificationItem (invite · system · danger variants)
    └── InviteModal      (peer list · select · invite CTA)
```

### Tauri IPC Pattern

All backend calls go through a thin wrapper that centralises error handling:

```js
invoke("command_name", { payload })
  .then(result => ...)
  .catch(err => ...);
```

All backend-pushed events are consumed via `listen`:

```js
listen("event_name", (event) => {
  useAppStore.getState().handleEvent(event.payload);
});
```

---

## Backend Architecture

### Module Map

```
src-tauri/src/
│
├── main.rs            Entry point — Tauri builder, plugin registration,
│                      screenshot guard initialisation, command registration
│
├── commands.rs        All #[tauri::command] handlers — thin dispatch layer,
│                      no business logic lives here
│
├── events.rs          Typed event payloads emitted to the frontend window
│
├── discovery/
│   ├── multicast.rs   UDP socket management, multicast group join/leave,
│   │                  send/receive loop, peer timeout tracking
│   └── magic.rs       Magic byte sequence definition, packet framing,
│                      validation of incoming discovery frames
│
├── crypto/
│   ├── ecdh.rs        Curve25519 key pair generation, ECDH shared secret
│   │                  derivation, HKDF-SHA256 key expansion
│   ├── aes_gcm.rs     AES-256-GCM encrypt/decrypt with random nonce
│   │                  prepended to ciphertext
│   ├── hmac.rs        HMAC-SHA512 computation and constant-time verification
│   └── session.rs     Per-peer session state: shared key, sequence counter,
│                      anti-replay window, session expiry
│
├── network/
│   ├── tcp.rs         Async TCP listener and outbound connector,
│   │                  length-prefixed framing, backpressure handling
│   ├── peer.rs        Peer registry: active peers, their public keys,
│   │                  display names, last-seen timestamps
│   ├── transfer.rs    File transfer coordinator: chunked send/receive,
│   │                  progress tracking, reassembly
│   └── chunker.rs     Splits arbitrary byte streams into fixed-size
│                      encrypted chunks; reassembles on receipt
│
├── groups/
│   ├── manager.rs     In-memory group registry: create, join, leave,
│   │                  membership list, public/private flag
│   └── invite.rs      Invite token generation, validation, expiry,
│                      real-time member count broadcasting
│
└── screenshot/
    ├── win.rs         SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)
    │                  Windows 10 2004+ API call via windows-sys crate
    ├── mac.rs         NSWindow.sharingType = .none via objc2 crate
    └── linux.rs       Wayland/X11 compositor hints; best-effort DRM
```

### Concurrency Model

The Rust backend runs on Tokio's multi-threaded runtime. Each subsystem owns its async task tree:

- **Discovery loop** — dedicated Tokio task, UDP socket with `SO_REUSEADDR`
- **TCP listener** — one task per accepted connection, bounded channel back to event dispatcher
- **Crypto operations** — synchronous (no I/O), called inline within connection tasks
- **Group manager** — `Arc<RwLock<GroupRegistry>>` shared across tasks
- **Session registry** — `Arc<DashMap<PeerId, Session>>` for lock-free per-peer access

---

## Security Model

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Passive Wi-Fi sniffing | AES-256-GCM — all payloads are indistinguishable from random bytes |
| Active MITM | ECDH key exchange — shared secret is never transmitted |
| Replay attack | Per-session sequence numbers with anti-replay window |
| Peer impersonation | Magic byte handshake + session key binding |
| Screenshot / screen recording | OS-level window protection API (`WDA_EXCLUDEFROMCAPTURE`, `NSWindow.sharingType`) |
| Post-session forensics | RAM-only storage — no disk artefacts to recover |
| Log leakage | Zero logging to disk — all tracing is stderr-only in debug builds |

### Key Lifecycle

```
App Start
   │
   ▼
Generate ephemeral Curve25519 keypair (never persisted)
   │
   ▼
Peer discovered via UDP multicast
   │
   ▼
TCP connection established
   │
   ▼
ECDH exchange (public keys sent in the clear — that is safe by design)
   │
   ▼
HKDF-SHA256 expands shared secret → AES key + HMAC key
   │
   ▼
Session active — all traffic encrypted and authenticated
   │
   ▼
App closes or peer disconnects → keys zeroed in memory, session destroyed
```

### Encryption on the Wire

Every transmitted frame has the following structure:

```
[ 4 bytes: frame length (u32 BE) ]
[ 12 bytes: AES-GCM nonce        ]
[ 8 bytes:  sequence number      ]
[ N bytes:  AES-256-GCM ciphertext + 16-byte auth tag ]
```

The nonce is randomly generated per message (96-bit, cryptographically random). The sequence number is included in the GCM additional data (AAD), preventing reordering and replay without adding overhead.

---

## Network Protocol

### Discovery Phase

```
Sender                              LAN (224.0.0.1:45678)
  │                                         │
  │── UDP multicast ──────────────────────► │
  │   [ MAGIC(8) | VERSION(1) | PUBKEY(32) | NAME_LEN(1) | NAME ]
  │                                         │
  │                        ◄── UDP unicast ─│ (all LANCAST peers respond)
  │   [ MAGIC(8) | VERSION(1) | PUBKEY(32) | NAME_LEN(1) | NAME ]
```

The magic byte sequence (`0x4C 0x41 0x4E 0x43 0x41 0x53 0x54 0x00`) identifies LANCAST frames. Non-LANCAST devices receive the packet but cannot parse or identify it as LANCAST traffic without the magic sequence knowledge.

### Messaging Phase

```
Peer A                              Peer B
  │                                    │
  │── TCP connect (port 45679) ───────►│
  │                                    │
  │── [Encrypted Frame] ──────────────►│  (AES-256-GCM)
  │                                    │
  │◄── [Encrypted Frame] ──────────────│  (AES-256-GCM)
```

Each peer listens on TCP port 45679. Connections are full-duplex. Frame boundaries use a 4-byte length prefix.

---

## Data Flow

### Sending a Message

```
User types + hits send
        │
        ▼
React: invoke("send_message", { peer_id, content })
        │
        ▼
Rust commands.rs: dispatches to network module
        │
        ▼
session.rs: increments sequence number, looks up AES key
        │
        ▼
aes_gcm.rs: encrypt(plaintext, key, nonce) → ciphertext
        │
        ▼
hmac.rs: sign(frame) → append HMAC
        │
        ▼
tcp.rs: write_frame(ciphertext) to peer's TCP stream
        │
        ▼
events.rs: emit("message_sent", { id, status: "sent" }) → frontend
        │
        ▼
Zustand store updates → MessageBubble re-renders with single tick
```

### Receiving a Message

```
tcp.rs: read_frame() from TCP stream
        │
        ▼
hmac.rs: verify(frame) — constant-time comparison
        │
        ▼
session.rs: validate sequence number against anti-replay window
        │
        ▼
aes_gcm.rs: decrypt(ciphertext, key, nonce) → plaintext
        │
        ▼
events.rs: emit("message_received", { peer_id, content, timestamp })
        │
        ▼
Zustand store: appends to conversation → MessageBubble renders
        │
        ▼
events.rs: emit("delivery_receipt", { id }) → sender's frontend
        │
        ▼
Sender's Zustand: updates tick status → double tick renders
```

---

## Screenshot Protection

### Activation Rules

Screenshot protection is **active** on all routes except `ProfilePage` and `HomePage`. This is enforced by the Tauri window management layer, not by the frontend — the frontend cannot be bypassed by browser developer tools.

| Route | Protected |
|-------|-----------|
| `/` (Home) | No |
| `/profile` | No |
| `/chat/:id` | **Yes** |
| `/group/:id` | **Yes** |
| `/peers` | **Yes** |
| `/notifications` | **Yes** |

### Detection and Alerting

When a screenshot attempt is detected:

1. The OS API fires a callback into the Rust layer
2. `events.rs` emits `screenshot_attempt` with the current user's display name and timestamp
3. The active chat or group receives a system-danger message: `⚠ Screenshot blocked — attempted by [Name]`
4. A notification is pushed to the notifications page

---

## State Management

All frontend state lives in a single Zustand store (`appStore.js`) with the following slices:

| Slice | Contents |
|-------|----------|
| `identity` | Local user's display name |
| `peers` | Map of active peers: `{ id, name, status, lastSeen }` |
| `conversations` | Map of peer → message array |
| `groups` | Map of group ID → `{ name, isPrivate, members, messages }` |
| `notifications` | Array of notification objects |
| `broadcast` | Boolean — is the local user currently broadcasting |
| `ui` | Sidebar collapsed state, active route, modal states |

There is no persistence layer. The store is initialised fresh on every app launch. All Tauri event listeners update the store directly via `getState()` calls — no Redux-style action dispatching.

---

## File Transfer Pipeline

```
Sender                                    Receiver
  │                                           │
  │  User selects file(s) (max 4, max 100MB each)
  │                                           │
  │  chunker.rs: split into 64KB chunks       │
  │  Each chunk: AES-256-GCM encrypted        │
  │                                           │
  │── TRANSFER_INIT frame ───────────────────►│
  │   (file name, size, chunk count, hash)    │
  │                                           │
  │── CHUNK frames (0..N) ───────────────────►│
  │   (chunk index, encrypted payload)        │
  │                                           │
  │◄── ACK per chunk ─────────────────────────│
  │                                           │
  │── TRANSFER_COMPLETE frame ───────────────►│
  │                                           │
  │          Receiver: reassemble chunks      │
  │          Verify SHA-256 of full file      │
  │          Hold in RAM — do not write       │
  │                                           │
  │          User clicks Download             │
  │          → write to user's chosen path    │
```

Files are held in the Rust backend's memory as a reassembled byte buffer until the user explicitly triggers a download. If the app is closed before download, the file is gone.

---

## Build and Distribution

### GitHub Actions Pipeline

```
push / PR to main
        │
        ├── Windows runner (windows-latest)
        │       cargo build --release
        │       tauri build → .msi
        │
        ├── macOS runner (macos-latest)
        │       cargo build --release
        │       tauri build → .dmg
        │
        └── Linux runner (ubuntu-22.04)
                cargo build --release
                tauri build → .AppImage + .deb
```

All three builds run in parallel. Release artifacts are attached to GitHub Releases automatically on version tag push (`v*.*.*`).

### Binary Characteristics

| Property | Target |
|----------|--------|
| Installer size | 4–8 MB |
| Runtime RAM | 15–30 MB |
| Startup time | < 300ms |
| No runtime dependencies | ✓ |
| No installer internet access required | ✓ |

---

## Design Decisions

### Why Tauri over Electron?

Tauri uses the OS's native WebView (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux) instead of bundling Chromium. This results in a binary that is 10–20× smaller, uses significantly less RAM, and gives direct access to native OS APIs like `SetWindowDisplayAffinity` without requiring Node.js native modules.

### Why Rust for the backend?

The security-critical path — cryptographic operations, network I/O, memory management — must be memory-safe with zero garbage collection pauses and zero undefined behaviour. Rust provides compile-time memory safety guarantees, a mature async runtime (Tokio), and first-class bindings to OS cryptography primitives. The `zeroize` crate ensures key material is securely wiped from memory on drop.

### Why UDP multicast for discovery?

UDP multicast (address `224.0.0.1`, port `45678`) reaches all devices on the local network segment without requiring a known peer IP address. It is connectionless, stateless, and requires no central registry. The magic byte prefix ensures that only LANCAST-aware code can interpret the payload — all other devices treat it as unrecognised multicast traffic.

### Why not WebRTC?

WebRTC requires STUN/TURN servers for NAT traversal, which introduces external infrastructure. Since LANCAST operates exclusively on a local network segment (same Wi-Fi), all peers are reachable without NAT traversal. Plain TCP provides lower latency, simpler framing, and zero external dependencies.

### Why Zustand over Redux?

LANCAST's state model is a set of mutable maps updated by Tauri events. Zustand's direct mutation model (via Immer under the hood) and zero-boilerplate selector subscriptions fit this pattern exactly. Redux's action-reducer model adds indirection without benefit for an event-driven IPC architecture.

---

<div align="center">

*LANCAST Architecture · Authored by Sambhav Dwivedi*

</div>
