export const ROUTES = {
  HOME: "/",
  CHAT: (peerId) => `/chat/${peerId}`,
  GROUP: (groupId) => `/group/${groupId}`,
  PEERS: "/peers",
  NOTIFICATIONS: "/notifications",
  AUDIT: "/audit",
};

export const PROTECTED_ROUTES = [
  "/chat",
  "/group",
  "/peers",
  "/notifications",
  "/audit",
];

export const isProtected = (path) =>
  PROTECTED_ROUTES.some((r) => path.startsWith(r));
