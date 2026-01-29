import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 bg-card border-b border-border lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="shrink-0"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menu</span>
      </Button>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">B</span>
          </div>
          <span className="font-semibold text-foreground">Betelitas</span>
        </div>
      </div>

      <Button variant="ghost" size="icon" className="shrink-0">
        <Bell className="h-5 w-5" />
        <span className="sr-only">Notificações</span>
      </Button>
    </header>
  );
}
