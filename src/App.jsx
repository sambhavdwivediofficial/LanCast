import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAppStore from "@store/appStore";
import AppShell from "@components/layout/AppShell";
import ProfilePage from "@pages/ProfilePage";
import HomePage from "@pages/HomePage";
import ChatPage from "@pages/ChatPage";
import GroupPage from "@pages/GroupPage";
import PeersPage from "@pages/PeersPage";
import NotificationPage from "@pages/NotificationPage";
import AuditPage from "@pages/AuditPage";

export default function App() {
  const { identity, bootstrapListeners } = useAppStore();

  useEffect(() => {
    bootstrapListeners();
  }, []);

  if (!identity.name) {
    return <ProfilePage />;
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat/:peerId" element={<ChatPage />} />
          <Route path="/group/:groupId" element={<GroupPage />} />
          <Route path="/peers" element={<PeersPage />} />
          <Route path="/notifications" element={<NotificationPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
