import { Menu, Bell, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOneSignal } from "@/hooks/useOneSignal";
import { toast } from "sonner";
interface MobileHeaderProps {
  onMenuClick: () => void;
}
export function MobileHeader({
  onMenuClick
}: MobileHeaderProps) {
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
  return <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 bg-card border-b border-border lg:hidden">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="shrink-0">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menu</span>
      </Button>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Car className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Carpool Betel</span>
        </div>
      </div>

      <Button variant="ghost" size="icon" className="shrink-0" onClick={handleNotificationClick}>
        <Bell className="h-5 w-5" />
        <span className="sr-only">Notificações</span>
      </Button>
    </header>;
}