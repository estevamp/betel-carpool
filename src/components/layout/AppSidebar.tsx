import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  Car,
  Users,
  Plane,
  Search,
  AlertTriangle,
  Wallet,
  HelpCircle,
  Info,
  Settings,
  LogOut,
  X,
  User,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { APP_INFO } from "@/lib/appInfo";

interface NavItemConfig {
  icon: typeof Home;
  label: string;
  path: string;
  adminOnly: boolean;
  superAdminOnly?: boolean;
}

const mainNavItems: NavItemConfig[] = [
  {
    icon: Home,
    label: "Início",
    path: "/",
    adminOnly: false,
  },
  {
    icon: Car,
    label: "Viagens",
    path: "/viagens",
    adminOnly: false,
  },
  {
    icon: Users,
    label: "Betelitas",
    path: "/betelitas",
    adminOnly: true,
  },
  {
    icon: Plane,
    label: "Ausência",
    path: "/ausencia",
    adminOnly: false,
  },
  {
    icon: Search,
    label: "Preciso de Carona",
    path: "/procura-vagas",
    adminOnly: false,
  },
  {
    icon: AlertTriangle,
    label: "Desocupação",
    path: "/desocupacao",
    adminOnly: false,
  },
  {
    icon: Wallet,
    label: "Ajuda de Transporte",
    path: "/financeiro",
    adminOnly: false,
  },
  {
    icon: Building2,
    label: "Congregações",
    path: "/congregacoes",
    adminOnly: false,
    superAdminOnly: true,
  },
];
const secondaryNavItems: NavItemConfig[] = [
  {
    icon: User,
    label: "Perfil",
    path: "/perfil",
    adminOnly: false,
    superAdminOnly: false,
  },
  {
    icon: HelpCircle,
    label: "Perguntas Frequentes",
    path: "/faq",
    adminOnly: false,
    superAdminOnly: false,
  },
  {
    icon: Settings,
    label: "Configurações",
    path: "/configuracoes",
    adminOnly: true,
    superAdminOnly: false,
  },
  {
    icon: Info,
    label: "Sobre",
    path: "/sobre",
    adminOnly: false,
    superAdminOnly: false,
  },
];
interface AppSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useSelectedCongregation } from "@/contexts/CongregationContext";
import { useCongregations } from "@/hooks/useCongregations";
export function AppSidebar({ mobile, onClose }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isAdmin } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId } = useSelectedCongregation();
  const { congregations } = useCongregations();
  const congregationName =
    congregations?.find((c) => (isSuperAdmin ? c.id === selectedCongregationId : c.id === profile?.congregation_id))
      ?.name || "Carpool";
  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };
  const NavItem = ({ item }: { item: NavItemConfig }) => {
    const isActive = location.pathname === item.path;
    return (
      <NavLink
        to={item.path}
        onClick={onClose}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        )}
      >
        <item.icon
          className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
          )}
        />
        <span className="truncate">{item.label}</span>
        {isActive && (
          <motion.div layoutId="sidebar-indicator" className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
        )}
      </NavLink>
    );
  };
  return (
    <div
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground",
        mobile ? "w-72" : "hidden w-64 border-r border-sidebar-border lg:flex",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-5 border-b border-sidebar-border">
        <NavLink
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary shadow-lg">
            <Car className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">Carpool Betel</span>
            <span className="text-xs text-sidebar-foreground/60 truncate max-w-[120px]">{congregationName}</span>
          </div>
        </NavLink>
        {mobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {mainNavItems
            .filter((item) => {
              if ('superAdminOnly' in item && item.superAdminOnly) return isSuperAdmin;
              return !item.adminOnly || isAdmin || isSuperAdmin;
            })
            .map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
        </div>

        <div className="mt-6 pt-4 border-t border-sidebar-border">
          <p className="px-3 mb-2 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">Suporte</p>
          <div className="space-y-1">
            {secondaryNavItems
              .filter((item) => !item.superAdminOnly || isSuperAdmin)
              .map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
          </div>
        </div>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3">
          <NavLink
            to="/perfil"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary/20 hover:bg-sidebar-primary/30 transition-colors"
          >
            {profile?.full_name ? (
              <span className="text-sm font-medium text-sidebar-primary">{getInitials(profile.full_name)}</span>
            ) : (
              <User className="h-4 w-4 text-sidebar-primary" />
            )}
          </NavLink>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || "Usuário"}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{profile?.email || ""}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-sidebar-foreground/50">
          v{APP_INFO.version} ({APP_INFO.commit})
        </p>
      </div>
    </div>
  );
}
