# LANCAST — Engineering Roadmap

<div align="center">

**A privacy-first, zero-infrastructure encrypted communication platform for local area networks.**

*Authored by Sambhav Dwivedi · Last updated July 2026*

</div>

---

## Table of Contents

- [Project Philosophy](#project-philosophy)
- [Architecture Overview](#architecture-overview)
- [Phase 1 — Core Desktop Application](#phase-1--core-desktop-application)
- [Phase 2 — Mobile Companion](#phase-2--mobile-companion)
- [Phase 3 — Cross-Platform Interoperability](#phase-3--cross-platform-interoperability)
- [Phase 4 — Advanced Security Hardening](#phase-4--advanced-security-hardening)
- [Phase 5 — Distribution & Production](#phase-5--distribution--production)
- [Technical Debt & Known Limitations](#technical-debt--known-limitations)
- [Decision Log](#decision-log)

---

## Project Philosophy

LANCAST was conceived around a single, non-negotiable constraint: **no data should ever leave the local network segment, and no data should ever touch a disk.** Every architectural decision flows from this constraint.

The three invariants that govern every line of code written in this project:

1. **Zero persistence** — All state lives exclusively in RAM. Process termination destroys all data permanently and irrecoverably.
2. **Zero infrastructure** — No cloud servers, no relay nodes, no DNS lookups, no third-party APIs. Discovery and messaging happen entirely on the local network segment.
3. **Zero plaintext on wire** — Every byte transmitted between peers is AES-256-GCM encrypted with a per-session key derived via ECDH Curve25519. A full packet capture of the network yields nothing actionable.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    LANCAST Ecosystem                     │
│                                                          │
│   ┌──────────────────────┐   ┌────────────────────────┐ │
│   │   Desktop App        │   │   Mobile App           │ │
│   │   Tauri 2.0 + Rust   │   │   React Native + Go    │ │
│   │   React + Tailwind   │   │   Android / iOS        │ │
│   └──────────┬───────────┘   └───────────┬────────────┘ │
│              │                           │               │
│              └──────────┬────────────────┘               │
│                         │                                │
│              ┌──────────▼──────────┐                     │
│              │   Local Network     │                     │
│              │   UDP mDNS/Multicast│                     │
│              │   TCP AES-256-GCM   │                     │
│              └─────────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

### Desktop Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| UI Framework | React 18 + JSX | Concurrent rendering, mature ecosystem |
| Styling | Tailwind CSS 3 | Utility-first, zero runtime overhead |
| State | Zustand 5 | Minimal boilerplate, selector-based subscriptions |
| Animation | Framer Motion 11 | Spring physics, layout animations |
| Shell | Tauri 2.0 | Native WebView, ~5MB binary, OS API access |
| Backend | Rust (stable 1.80+) | Memory safety, zero GC, async via Tokio |
| Crypto | AES-256-GCM + ECDH Curve25519 | Industry standard, forward secrecy |
| Discovery | UDP Multicast 224.0.0.1:45678 | Zero-config peer discovery on LAN |
| Messaging | TCP with length-prefixed framing | Reliable ordered delivery |
| Build | Vite 5 + GitHub Actions | Sub-second HMR, parallel CI builds |

---

## Phase 1 — Core Desktop Application

**Status: ✅ Complete**
**Timeline: June 2026 – July 2026**

### 1.1 Project Scaffolding & Toolchain

- [x] Tauri 2.0 project initialized with React + TypeScript template
- [x] Vite 5 configured with path aliases (`@`, `@components`, `@pages`, `@hooks`, `@store`)
- [x] Tailwind CSS 3 configured with full custom design system — brand palette, surface palette, animation keyframes, z-index scale, spacing tokens
- [x] Prettier + ESLint configured with strict rules
- [x] `.gitignore` covering Rust target directory, node_modules, env files, release artifacts
- [x] Apache 2.0 license
- [x] GitHub Actions CI/CD pipeline — parallel Windows/macOS/Linux builds on push to main

### 1.2 Cryptographic Layer (`src-tauri/src/crypto/`)

- [x] **ECDH Curve25519** (`ecdh.rs`) — Ephemeral keypair generation using `x25519-dalek`. Per-session shared secret derived via Diffie-Hellman. HKDF-SHA256 expands shared secret into separate AES key (32 bytes) and HMAC key (64 bytes). Keys are `ZeroizeOnDrop` — wiped from memory on drop.
- [x] **AES-256-GCM** (`aes_gcm.rs`) — Authenticated encryption with 96-bit random nonce prepended to ciphertext. Nonce generated per-message via OS CSPRNG. 16-byte GCM authentication tag appended. AAD variant for sequence-number binding.
- [x] **HMAC-SHA512** (`hmac.rs`) — Message authentication and tamper detection. Constant-time comparison via `subtle` crate to prevent timing side-channels.
- [x] **Session Registry** (`session.rs`) — Per-peer session state: AES key, HMAC key, atomic send sequence counter, atomic receive sequence counter, 128-bit sliding anti-replay window. Backed by `DashMap` for lock-free concurrent access across Tokio tasks. Keys zeroed via `zeroize` on session drop.

**Security properties achieved:**
- Perfect forward secrecy — each session derives a unique shared secret
- Replay attack prevention — sequence numbers + 128-bit anti-replay window
- Timing attack resistance — constant-time MAC verification
- Memory safety — all key material wiped on drop

### 1.3 Network Discovery (`src-tauri/src/discovery/`)

- [x] **Magic byte framing** (`magic.rs`) — 8-byte LANCAST identifier (`0x4C414E43415354 00`) prepended to all discovery frames. Non-LANCAST devices on the same network cannot identify or parse the traffic. Version byte for forward compatibility. Frame encode/decode with validation.
- [x] **UDP Multicast discovery** (`multicast.rs`) — Socket bound to `224.0.0.1:45678` with `SO_REUSEADDR`. Three independent Tokio tasks: sender loop (3-second broadcast interval), receiver loop (parses incoming frames, emits `peer_discovered` events), cleanup loop (5-second stale peer removal after 12-second timeout). `set_multicast_loop_v4(false)` prevents self-discovery in production.

### 1.4 Network Messaging (`src-tauri/src/network/`)

- [x] **TCP service** (`tcp.rs`) — Async TCP listener on port 45679. Length-prefixed framing (4-byte big-endian length header). `WireMessage` enum covers: Text, GroupText, FileChunk, SeenReceipt, GroupInvite, Handshake, HandshakeAck. All frames AES-256-GCM encrypted after handshake. Lazy outbound connection — connects on first send, reuses thereafter.
- [x] **Peer registry** (`peer.rs`) — `DashMap`-backed in-memory registry of active peers. Upsert returns `is_new` for deduplication. Stale peer removal. `touch()` for last-seen updates.
- [x] **File chunker** (`chunker.rs`) — 64KB chunk size. 100MB per-file limit. Maximum 4 files per send. `Reassembler` with duplicate chunk detection and progress tracking.
- [x] **Transfer manager** (`transfer.rs`) — In-memory inbound transfer state. Chunk ingestion with progress events. Files held in RAM until explicit user download — never written to disk automatically.

### 1.5 Group System (`src-tauri/src/groups/`)

- [x] **Group manager** (`manager.rs`) — In-memory `HashMap<String, Group>`. Public and private group support. Create, join, leave, wipe operations. Member registry with display names.
- [x] **Invite registry** (`invite.rs`) — 120-second TTL per invite. Token-based invite validation. Expiry enforcement.

### 1.6 Screenshot Protection (`src-tauri/src/screenshot/`)

- [x] **Windows** — `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` via `windows-sys`. Window renders as black in all capture tools including OBS, Snipping Tool, Print Screen.
- [x] **macOS** — `NSWindow.sharingType = .none` via `objc2`. Excluded from all screen capture APIs.
- [x] **Linux** — Best-effort compositor hints. Wayland/X11 support varies by compositor.
- [x] Route-aware activation — protection enabled on `/chat`, `/group`, `/peers`. Disabled on `/` and profile page.
- [x] Screenshot attempt detection — system message posted to active chat with offender's name.

### 1.7 Session Kill Switch

- [x] **`session_kill.rs`** — Single function wipes all in-memory state: session registry cleared, peer registry cleared, group manager wiped, local name zeroed. Emits `kill_executed` event to frontend. Frontend Zustand store resets all slices. App closes after kill.
- [x] Two-click confirmation UI — first click requests kill, second click within 3 seconds executes it.

### 1.8 Automatic Firewall Configuration

- [x] **Windows** — On app start, `netsh` rules silently added for UDP 45678 (in/out) and TCP 45679 (in/out). `CREATE_NO_WINDOW` flag — user sees nothing. Rules added with `profile=any` to cover all network profiles.
- [x] macOS — System prompts user on first run. No programmatic action required.
- [x] Linux — `ufw` disabled by default on most distributions. No action required.

### 1.9 Frontend Application

#### Design System
- [x] Dark-first color palette — `surface-950` base, `brand-500` accent (indigo), danger/success/warning semantic colors
- [x] Custom animations — 15+ keyframe animations: fadeIn, slideUp, bounceIn, pulseDot, shimmer, dangerPulse, successPop
- [x] CSS component classes — `.nav-item`, `.stat-card`, `.message-bubble-out/in`, `.message-bubble-system`, `.modal-overlay`, `.chat-input-area`, `.online-dot`
- [x] Custom Tooltip component — Portal-based, position-aware, renders only when sidebar collapsed

#### Pages & Components
- [x] **ProfilePage** — Animated entry with staggered reveal. Name input with 32-char limit. Feature pills. Creator links (Website, LinkedIn, GitHub) opening in system browser. Apache 2.0 badge.
- [x] **Sidebar** — Framer Motion width animation (240px ↔ 64px). CSS group-hover swap (logo ↔ ChevronRight) in collapsed state. Tooltip on each nav item when collapsed. Broadcast button with red/green dot and ping animation. Kill switch with two-click confirmation and confirmation tooltip.
- [x] **HomePage** — Real-time network stats (peer count, discovery status, network health measured via IPC latency, encryption status). Session stats (timer HH:MM:SS, bytes transferred, message count, file count). "This Network" section (total peers and public groups on WiFi). Live peers list.
- [x] **ChatPage** — Chat list with conversation previews, unread counts, timestamps. Invite Peers modal with per-peer dropdown (Invite / Hide Peer). 1-to-1 chat interface with typing indicator, emoji picker, file attachment (max 4 × 100MB), chunked encrypted file transfer, auto-resize textarea, broadcast guard.
- [x] **GroupPage** — Grid layout group cards (rectangle boxes, auto-fill columns). Public/Private badge. Creator detection (`createdByMe` flag). Context-aware dropdown menu (creator vs joined vs not-joined). Delete confirmation modal. Group chat interface with Invite/Clear/Leave/Delete menu. Broadcast guard on all actions.
- [x] **PeersPage** — Peers/Groups tabs with search. Broadcast-gated — empty state when offline. Creator's own groups shown but non-interactive. Hide peer/group support.
- [x] **NotificationPage** — Two tabs: Notifications (invites, screenshot alerts) and Audit Log (system event timeline with icons, colors, timestamps). Invite accept adds group to store. Decline invalidates notification.
- [x] **MessageBubble** — Tick system (sending → sent → received → seen blue). Show more/less for long messages (300 char threshold). Copy button (side-bottom, hover-revealed). System message pill (centered, minimal). Screenshot blocked pill (red, camera icon, offender name highlighted).
- [x] **EmojiPicker** — 8 categories, 1000+ emojis, search, portal-based positioning, 300×340px floating panel.
- [x] **FilePreview** — Extension-based icon and color mapping (video/image/audio/document/archive/code). Size display. Download to user-chosen path.

#### State Management
- [x] Zustand store with slices: identity, peers, conversations, groups, hiddenGroups, notifications, auditEvents, broadcasting, stats, typingStates, activeTransfers, ui
- [x] Broadcast-gated event listeners — `peer_discovered`, `message_received`, `group_message_received` all check `broadcasting` state before processing
- [x] All Tauri event listeners guarded with `window.__TAURI_INTERNALS__` check for browser safety

---

## Phase 2 — Mobile Companion

**Status: 🔄 In Progress**
**Target: Q3 2026**

### 2.1 Technology Rationale

| Decision | Choice | Alternative Considered | Reason |
|----------|--------|----------------------|--------|
| Mobile framework | React Native 0.86 | Flutter, Capacitor | Shared JS knowledge with desktop, native performance |
| Mobile backend | Go | Rust, Node.js | `gomobile` toolchain, easy Android/iOS `.aar`/`.framework` compilation, goroutines for concurrent networking |
| Discovery protocol | mDNS (DNS-SD) | UDP Multicast | Mobile OS restricts raw multicast; mDNS is the mobile-native equivalent and works on both Android and iOS |
| Encryption | AES-256-GCM + ECDH | Same as desktop | Protocol compatibility — desktop and mobile peers can communicate |

### 2.2 Project Structure

```
LanCastMobile/
├── android/                    ← Android native project
├── ios/                        ← iOS native project
├── src/
│   ├── screens/
│   │   ├── ProfileScreen.tsx   ← Name entry
│   │   ├── HomeScreen.tsx      ← Dashboard
│   │   ├── ChatScreen.tsx      ← 1-to-1 chat
│   │   ├── GroupScreen.tsx     ← Groups
│   │   └── PeersScreen.tsx     ← Peer discovery
│   ├── components/             ← Shared UI components
│   ├── store/                  ← Zustand state (shared logic)
│   └── bridge/                 ← Go ↔ React Native bridge
├── go/
│   ├── discovery/              ← mDNS peer discovery
│   ├── crypto/                 ← AES-256-GCM, ECDH
│   ├── network/                ← TCP messaging
│   └── main.go                 ← gomobile entry point
└── package.json
```

### 2.3 Go Backend Modules

- [ ] **mDNS Discovery** — Register `_lancast._tcp.local` service. Browse for peers. Emit peer events to React Native via bridge. Compatible with desktop UDP multicast on same subnet.
- [ ] **Crypto** — Port of Rust crypto layer: ECDH X25519, AES-256-GCM, HMAC-SHA512, HKDF-SHA256. Using Go standard library + `golang.org/x/crypto`.
- [ ] **TCP Networking** — Same wire protocol as desktop. Length-prefixed frames. Same `WireMessage` JSON schema. Full interoperability with desktop peers.
- [ ] **Session Management** — Per-peer session keys, sequence numbers, anti-replay window.
- [ ] **gomobile Build** — `gomobile bind` generates `.aar` for Android and `.xcframework` for iOS. Integrated into React Native via native modules.

### 2.4 React Native Frontend

- [ ] Navigation — React Navigation v6 with bottom tab navigator
- [ ] Styling — StyleSheet API with design tokens matching desktop palette
- [ ] State — Zustand (same patterns as desktop)
- [ ] Bridge — Native module wrapping Go library for all network operations

### 2.5 USB Debugging Workflow (Android)

```
Developer Options → USB Debugging ON
↓
Cable connect to laptop
↓
adb devices (verify device listed)
↓
npx react-native run-android
↓
App installs and launches on device
Hot reload active — save file → instant update on phone
```

### 2.6 Desktop ↔ Mobile Interoperability

Both desktop (Rust) and mobile (Go) implement the same wire protocol:
- Same magic bytes for discovery frames
- Same JSON `WireMessage` schema
- Same AES-256-GCM framing
- Same TCP port (45679)

A desktop LANCAST peer and a mobile LANCAST peer on the same WiFi will discover and communicate with each other transparently.

---

## Phase 3 — Cross-Platform Interoperability

**Status: 📋 Planned**
**Target: Q4 2026**

- [ ] Protocol versioning — version byte in magic frame for backward compatibility
- [ ] Capability negotiation — peers advertise supported features during handshake
- [ ] Desktop → Mobile file transfer — chunked transfer with mobile download to gallery/files
- [ ] Group membership sync — when a mobile peer joins a group, desktop members see the join event and vice versa
- [ ] Typing presence — mobile typing indicator visible on desktop and vice versa
- [ ] Cross-platform screenshot detection — mobile screenshot event posted to group chat

---

## Phase 4 — Advanced Security Hardening

**Status: 📋 Planned**
**Target: Q4 2026 – Q1 2027**

### 4.1 Key Rotation
- [ ] Automatic session key rotation every N messages (configurable threshold)
- [ ] Re-keying without session interruption

### 4.2 Peer Authentication
- [ ] Optional persistent peer identity via Ed25519 signing keys stored in OS keychain
- [ ] TOFU (Trust On First Use) model — peer fingerprint displayed on first connection
- [ ] Fingerprint verification UI — QR code or verbal comparison

### 4.3 Traffic Analysis Resistance
- [ ] Message padding to fixed-size blocks — prevents length-based content inference
- [ ] Dummy traffic injection during active sessions — prevents timing analysis

### 4.4 Memory Hardening
- [ ] `mlock()` / `VirtualLock()` on key material pages — prevents swap to disk
- [ ] Guard pages around key buffers
- [ ] Compiler-fence barriers around zeroize calls

### 4.5 Ephemeral Voice Channels
- [ ] LAN-only WebRTC without STUN/TURN — direct peer connection, no external infrastructure
- [ ] Same encryption model applied to audio streams

---

## Phase 5 — Distribution & Production

**Status: 📋 Planned**
**Target: Q1 2027**

### 5.1 GitHub Actions CI/CD (Desktop)

Current pipeline (`.github/workflows/build.yml`):

```
push to main
    │
    ├── Lint (ESLint + Clippy)
    ├── Format check (Prettier + rustfmt)
    ├── Rust tests
    │
    └── Build (parallel)
        ├── Windows → .msi (NSIS installer)
        ├── macOS  → .dmg (Apple Silicon)
        └── Linux  → .AppImage + .deb
```

- [ ] Code signing — Windows Authenticode, macOS Developer ID
- [ ] Auto-updater — Tauri updater plugin with signed update manifests
- [ ] Release automation — tag push triggers draft release with all platform artifacts

### 5.2 Mobile Distribution

- [ ] Android — Google Play Store via fastlane
- [ ] iOS — App Store via fastlane + Xcode Cloud
- [ ] F-Droid listing (Android open-source alternative store)

### 5.3 Binary Targets

| Platform | Format | Target Size | RAM Usage |
|----------|--------|-------------|-----------|
| Windows | `.msi` | ~6 MB | ~20 MB |
| macOS | `.dmg` | ~8 MB | ~22 MB |
| Linux | `.AppImage` | ~7 MB | ~18 MB |
| Android | `.apk` | ~15 MB | ~35 MB |
| iOS | `.ipa` | ~12 MB | ~30 MB |

---

## Technical Debt & Known Limitations

| Item | Severity | Notes |
|------|----------|-------|
| HMAC not yet wired into TCP framing | Medium | ECDH + AES-GCM provides authentication; HMAC layer is implemented but not integrated into the send/receive path |
| Group state not synced on join | Medium | A peer joining a group sees only messages after join — no history sync (by design for privacy) |
| mDNS not yet implemented for mobile | High | Current mobile scaffold uses React Native default template only |
| Sequence numbers not sent in AAD | Medium | Anti-replay window implemented but sequence not bound to GCM AAD yet |
| Linux screenshot protection | Low | Best-effort only; compositor-dependent |
| No message delivery guarantee | Low | TCP provides ordering but no application-level ACK for group messages |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Jun 2026 | Tauri 2.0 over Electron | 10-20× smaller binary, native OS APIs, no bundled Chromium |
| Jun 2026 | Rust backend over Node.js | Memory safety, zero GC pauses, `zeroize` for key material |
| Jun 2026 | UDP Multicast over mDNS for desktop | Simpler implementation, no dependency on system mDNS resolver |
| Jun 2026 | AES-256-GCM over ChaCha20-Poly1305 | Hardware acceleration on x86 via AES-NI, same security level |
| Jun 2026 | RAM-only storage over encrypted local DB | Maximum privacy — no forensic recovery possible after app close |
| Jun 2026 | Zustand over Redux | Zero boilerplate, direct mutation model fits event-driven IPC architecture |
| Jul 2026 | Go over Rust for mobile backend | `gomobile` toolchain; Rust mobile cross-compilation significantly more complex |
| Jul 2026 | mDNS over UDP Multicast for mobile | Mobile OS restricts raw multicast sockets; mDNS is the platform-native equivalent |
| Jul 2026 | React Native over Flutter for mobile | Shared JavaScript knowledge, Zustand state patterns reusable |

---

<div align="center">

*LANCAST Roadmap · Sambhav Dwivedi*
[![GitHub](https://img.shields.io/badge/GitHub-sambhavdwivediofficial-27272a?style=flat-square&logo=github)](https://github.com/sambhavdwivediofficial)

</div>
