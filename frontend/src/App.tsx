import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import CampaignListPage from './pages/CampaignListPage';
import CampaignDetailPage from './pages/CampaignDetailPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/campaigns" replace />} />
        <Route path="campaigns" element={<CampaignListPage />} />
        <Route path="campaigns/:id/*" element={<CampaignDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
