import { NavLink, useLocation } from "react-router-dom";
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
  Settings,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const mainNavItems = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Car, label: "Viagens", path: "/viagens" },
  { icon: Users, label: "Betelitas", path: "/betelitas" },
  { icon: Plane, label: "Ausência", path: "/ausencia" },
  { icon: Search, label: "Procura de Vagas", path: "/procura-vagas" },
  { icon: AlertTriangle, label: "Desocupação", path: "/desocupacao" },
  { icon: Wallet, label: "Ajuda de Transporte", path: "/financeiro" },
];

const secondaryNavItems = [
  { icon: HelpCircle, label: "Perguntas Frequentes", path: "/faq" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

interface AppSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ mobile, onClose }: AppSidebarProps) {
  const location = useLocation();

  const NavItem = ({ item }: { item: typeof mainNavItems[0] }) => {
    const isActive = location.pathname === item.path;
    
    return (
      <NavLink
        to={item.path}
        onClick={onClose}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        <item.icon className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
        )} />
        <span className="truncate">{item.label}</span>
        {isActive && (
          <motion.div
            layoutId="sidebar-indicator"
            className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary"
          />
        )}
      </NavLink>
    );
  };

  return (
    <div className={cn(
      "flex h-full flex-col bg-sidebar text-sidebar-foreground",
      mobile ? "w-72" : "hidden w-64 border-r border-sidebar-border lg:flex"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary shadow-lg">
            <span className="text-lg font-bold text-sidebar-primary-foreground">B</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">Betelitas</span>
            <span className="text-xs text-sidebar-foreground/60">Transporte</span>
          </div>
        </div>
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
          {mainNavItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-sidebar-border">
          <p className="px-3 mb-2 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
            Suporte
          </p>
          <div className="space-y-1">
            {secondaryNavItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary/20">
            <span className="text-sm font-medium text-sidebar-primary">EP</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              Estevam Palombi
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              estevamp@gmail.com
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
