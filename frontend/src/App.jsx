import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AdminOnlyRoute } from "./components/AdminOnlyRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleHomeRedirect } from "./components/RoleHomeRedirect";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AdminConsolePage } from "./pages/AdminConsolePage";
import { CasesPage } from "./pages/CasesPage";
import { ComplaintWizardPage } from "./pages/ComplaintWizardPage";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { DetectiveBoardPage } from "./pages/DetectiveBoardPage";
import { InterrogationPage } from "./pages/InterrogationPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminRolesPage } from "./pages/AdminRolesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AdminCaseQueuesHomePage } from "./pages/admin/AdminCaseQueuesHomePage";
import { AdminInternQueuePage } from "./pages/admin/AdminInternQueuePage";
import { AdminOfficerQueuePage } from "./pages/admin/AdminOfficerQueuePage";
import { AdminSpecialistsQueuePage } from "./pages/admin/AdminSpecialistsQueuePage";
import { AdminSupervisorQueuePage } from "./pages/admin/AdminSupervisorQueuePage";
import { SuspectReferralPage } from "./pages/SuspectReferralPage";
import { EvidenceReviewPage } from "./pages/EvidenceReviewPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<RoleHomeRedirect />} />
        <Route
          path="/dashboard"
          element={
            <RoleProtectedRoute path="/dashboard">
              <DashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/cases"
          element={
            <RoleProtectedRoute path="/cases">
              <CasesPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/cases/:caseId"
          element={
            <RoleProtectedRoute path="/cases">
              <CaseDetailPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/complaint"
          element={
            <RoleProtectedRoute path="/complaint">
              <ComplaintWizardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/board"
          element={
            <RoleProtectedRoute path="/board">
              <DetectiveBoardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/interrogation"
          element={
            <RoleProtectedRoute path="/interrogation">
              <InterrogationPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/suspect-referrals"
          element={
            <RoleProtectedRoute path="/suspect-referrals">
              <SuspectReferralPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/evidence-review"
          element={
            <RoleProtectedRoute path="/evidence-review">
              <EvidenceReviewPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <RoleProtectedRoute path="/notifications">
              <NotificationsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <RoleProtectedRoute path="/profile">
              <ProfilePage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/console"
          element={
            <AdminOnlyRoute>
              <AdminConsolePage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <AdminOnlyRoute>
              <AdminRolesPage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/admin/case-queues"
          element={
            <AdminOnlyRoute>
              <AdminCaseQueuesHomePage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/admin/case-queues/intern"
          element={
            <AdminOnlyRoute>
              <AdminInternQueuePage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/admin/case-queues/officer"
          element={
            <AdminOnlyRoute>
              <AdminOfficerQueuePage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/admin/case-queues/supervisor"
          element={
            <AdminOnlyRoute>
              <AdminSupervisorQueuePage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/admin/case-queues/specialists"
          element={
            <AdminOnlyRoute>
              <AdminSpecialistsQueuePage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleProtectedRoute path="/reports">
              <ReportsPage />
            </RoleProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/app"
        element={<Navigate to="/home" replace />}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
