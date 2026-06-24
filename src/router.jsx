// src/router.jsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import ProfilePage from "./pages/ProfilePage";
import AppShell from "./components/layout/AppShell";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import GroupPage from "./pages/GroupPage";
import NotificationPage from "./pages/NotificationPage";
import PeersPage from "./pages/PeersPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <ProfilePage />,
  },
  {
    path: "/app",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: "home", element: <HomePage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "group", element: <GroupPage /> },
      { path: "notification", element: <NotificationPage /> },
      { path: "peers", element: <PeersPage /> },
    ],
  },
]);
