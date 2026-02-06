import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Car, Users, Plane, Search, AlertTriangle, Wallet, HelpCircle, Settings, LogOut, X, User, Building2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useOneSignal } from "@/hooks/useOneSignal";
import { toast } from "sonner";
const mainNavItems = [{
  icon: Home,
  label: "Início",
  path: "/",
  adminOnly: false
}, {
  icon: Car,
  label: "Viagens",
  path: "/viagens",
  adminOnly: false
}, {
  icon: Users,
  label: "Betelitas",
  path: "/betelitas",
  adminOnly: true
}, {
  icon: Plane,
  label: "Ausência",
  path: "/ausencia",
  adminOnly: false
}, {
  icon: Search,
  label: "Procura de Vagas",
  path: "/procura-vagas",
  adminOnly: false
}, {
  icon: AlertTriangle,
  label: "Desocupação",
  path: "/desocupacao",
  adminOnly: false
}, {
  icon: Wallet,
  label: "Ajuda de Transporte",
  path: "/financeiro",
  adminOnly: false
}, {
  icon: Building2,
  label: "Congregações",
  path: "/congregacoes",
  adminOnly: true // Only super-admins can see this
}];
const secondaryNavItems = [{
  icon: User,
  label: "Perfil",
  path: "/perfil",
  adminOnly: false,
  superAdminOnly: false
}, {
  icon: HelpCircle,
  label: "Perguntas Frequentes",
  path: "/faq",
  adminOnly: false,
  superAdminOnly: false
}, {
  icon: Settings,
  label: "Configurações",
  path: "/configuracoes",
  adminOnly: false,
  superAdminOnly: true
}];
interface AppSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
export function AppSidebar({
  mobile,
  onClose
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    profile,
    signOut,
    isAdmin
  } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();
  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };
  const {
    requestPermission,
    isSubscribed
  } = useOneSignal();
  const handleNotificationClick = async () => {
    const subscribed = await isSubscribed();
    if (subscribed) {
      toast.info("Você já está inscrito para receber notificações.");
      return;
    }
    const permissionGranted = await requestPermission();
    if (permissionGranted) {
      toast.success("Inscrição para notificações realizada com sucesso!");
    } else {
      toast.warning("Você precisa permitir as notificações nas configurações do seu navegador.");
    }
  };
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };
  const NavItem = ({
    item
  }: {
    item: typeof mainNavItems[0];
  }) => {
    const isActive = location.pathname === item.path;
    return <NavLink to={item.path} onClick={onClose} className={cn("group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200", isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground")}>
        <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")} />
        <span className="truncate">{item.label}</span>
        {isActive && <motion.div layoutId="sidebar-indicator" className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
      </NavLink>;
  };
  return <div className={cn("flex h-full flex-col bg-sidebar text-sidebar-foreground", mobile ? "w-72" : "hidden w-64 border-r border-sidebar-border lg:flex")}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary shadow-lg">
            <span className="text-lg font-bold text-sidebar-primary-foreground">C</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">Carpool</span>
            <span className="text-xs text-sidebar-foreground/60">Betel</span>
          </div>
        </div>
        {mobile && <Button variant="ghost" size="icon" onClick={onClose} className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent">
            <X className="h-5 w-5" />
          </Button>}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {mainNavItems
            .filter(item => !item.adminOnly || isAdmin || isSuperAdmin)
            .map(item => <NavItem key={item.path} item={item} />)}
        </div>

        <div className="mt-6 pt-4 border-t border-sidebar-border">
          <p className="px-3 mb-2 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            Suporte
          </p>
          <div className="space-y-1">
            {secondaryNavItems
              .filter(item => !item.superAdminOnly || isSuperAdmin)
              .map(item => <NavItem key={item.path} item={item} />)}
          </div>
        </div>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3">
          <NavLink to="/perfil" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary/20 hover:bg-sidebar-primary/30 transition-colors">
            {profile?.full_name ? <span className="text-sm font-medium text-sidebar-primary">
                {getInitials(profile.full_name)}
              </span> : <User className="h-4 w-4 text-sidebar-primary" />}
          </NavLink>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || "Usuário"}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {profile?.email || ""}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNotificationClick} className="shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNotificationClick} className="shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent" aria-label="Notificações">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent" aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>;
}