import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CasesPage } from "./pages/CasesPage";
import { ComplaintWizardPage } from "./pages/ComplaintWizardPage";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { DetectiveBoardPage } from "./pages/DetectiveBoardPage";
import { InterrogationPage } from "./pages/InterrogationPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminRolesPage } from "./pages/AdminRolesPage";
import { ReportsPage } from "./pages/ReportsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/:caseId" element={<CaseDetailPage />} />
        <Route path="complaint" element={<ComplaintWizardPage />} />
        <Route path="board" element={<DetectiveBoardPage />} />
        <Route path="interrogation" element={<InterrogationPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin/roles" element={<AdminRolesPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
