import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileHeader } from "./MobileHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useSelectedCongregation } from "@/contexts/CongregationContext";
import { CongregationSelector } from "@/components/congregations/CongregationSelector";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId, setSelectedCongregationId } = useSelectedCongregation();
  const location = useLocation();

  // Não mostrar o seletor de congregações na página de Congregações
  const showCongregationSelector = isSuperAdmin && location.pathname !== "/congregacoes";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        <AppSidebar />

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={`
          fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        >
          <AppSidebar mobile onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-screen">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          {showCongregationSelector && (
            <div className="flex items-center gap-2 p-4 lg:p-6 border-b border-border">
              <span className="text-sm text-muted-foreground">Visualizando congregação:</span>
              <CongregationSelector value={selectedCongregationId} onChange={setSelectedCongregationId} />
            </div>
          )}
          <div className="flex-1 p-4 lg:p-6 overflow-auto custom-scrollbar">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
