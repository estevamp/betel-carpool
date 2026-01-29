import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import ViagensPage from "./pages/ViagensPage";
import BetelitasPage from "./pages/BetelitasPage";
import AusenciaPage from "./pages/AusenciaPage";
import ProcuraVagasPage from "./pages/ProcuraVagasPage";
import DesocupacaoPage from "./pages/DesocupacaoPage";
import FinanceiroPage from "./pages/FinanceiroPage";
import FAQPage from "./pages/FAQPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/viagens" element={<ViagensPage />} />
            <Route path="/betelitas" element={<BetelitasPage />} />
            <Route path="/ausencia" element={<AusenciaPage />} />
            <Route path="/procura-vagas" element={<ProcuraVagasPage />} />
            <Route path="/desocupacao" element={<DesocupacaoPage />} />
            <Route path="/financeiro" element={<FinanceiroPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
