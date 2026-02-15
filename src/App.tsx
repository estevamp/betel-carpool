import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CongregationProvider } from "@/contexts/CongregationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { useOneSignal } from "@/hooks/useOneSignal";
import Dashboard from "./pages/Dashboard";
import ViagensPage from "./pages/ViagensPage";
import BetelitasPage from "./pages/BetelitasPage";
import AusenciaPage from "./pages/AusenciaPage";
import ProcuraVagasPage from "./pages/ProcuraVagasPage";
import DesocupacaoPage from "./pages/DesocupacaoPage";
import FinanceiroPage from "./pages/FinanceiroPage";
import FAQPage from "./pages/FAQPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import CongregationsPage from "./pages/CongregationsPage";
import DebugProfilesPage from "./pages/DebugProfilesPage";
import TestNotificationsPage from "./pages/TestNotificationsPage";
import AboutPage from "./pages/AboutPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  // Initialize OneSignal for push notifications
  useOneSignal();

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/viagens" element={<ViagensPage />} />
        <Route path="/viagens/:tripId" element={<ViagensPage />} />
        <Route path="/betelitas" element={<BetelitasPage />} />
        <Route path="/ausencia" element={<AusenciaPage />} />
        <Route path="/procura-vagas" element={<ProcuraVagasPage />} />
        <Route path="/desocupacao" element={<DesocupacaoPage />} />
        <Route path="/financeiro" element={<FinanceiroPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/congregacoes" element={<CongregationsPage />} />
        <Route path="/debug-profiles" element={<DebugProfilesPage />} />
        <Route path="/test-notifications" element={<TestNotificationsPage />} />
        <Route path="/sobre" element={<AboutPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <CongregationProvider>
            <AppContent />
          </CongregationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
