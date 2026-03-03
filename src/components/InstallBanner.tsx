import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, MoreVertical, PlusSquare, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallBanner() {
  const { platform, isInstallable, triggerInstall, dismiss } = useInstallPrompt();
  const [loading, setLoading] = useState(false);

  if (!isInstallable) return null;

  const handleInstall = async () => {
    if (platform === "android") {
      setLoading(true);
      await triggerInstall();
      setLoading(false);
      dismiss();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="install-banner"
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
      >
        <div className="bg-card border border-border rounded-2xl shadow-elevated p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm leading-tight">
                  Adicionar à tela de início
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Acesse o Carpool Betel como um app
                </p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Android: botão direto */}
          {platform === "android" && (
            <Button
              className="w-full"
              size="sm"
              onClick={handleInstall}
              disabled={loading}
            >
              {loading ? "Instalando..." : "Instalar app"}
            </Button>
          )}

          {/* iOS: instruções passo a passo */}
          {platform === "ios" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                No Safari:
              </p>
              <ol className="space-y-2">
                <Step icon={<Share className="h-4 w-4" />} text='Toque em "Compartilhar"' />
                <Step icon={<PlusSquare className="h-4 w-4" />} text='"Adicionar à Tela de Início"' />
                <Step icon={<MoreVertical className="h-4 w-4" />} text='Confirme tocando em "Adicionar"' />
              </ol>
              <Button variant="outline" size="sm" className="w-full mt-1" onClick={dismiss}>
                Entendi
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Step({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-foreground">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
        {icon}
      </span>
      {text}
    </li>
  );
}