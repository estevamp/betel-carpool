import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface BroadcastNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  congregationId?: string;
  defaultMessage?: string;
}

const NOTIFICATION_MESSAGE_MAX_LENGTH = 150;

export function BroadcastNotificationDialog({
  open,
  onOpenChange,
  congregationId,
  defaultMessage = "Não se esqueça de informar seus arranjos de transporte para a congregação.",
}: BroadcastNotificationDialogProps) {
  const [message, setMessage] = useState(defaultMessage.slice(0, NOTIFICATION_MESSAGE_MAX_LENGTH));
  const [isSending, setIsSending] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    setMessage((defaultMessage || "").slice(0, NOTIFICATION_MESSAGE_MAX_LENGTH));
  }, [defaultMessage, open]);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("A mensagem não pode estar vazia");
      return;
    }

    const targetCongregationId = congregationId || profile?.congregation_id;
    if (!targetCongregationId) {
      toast.error("Congregação não identificada");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-broadcast-notification", {
        body: {
          message: message.slice(0, NOTIFICATION_MESSAGE_MAX_LENGTH),
          congregationId: targetCongregationId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Notificação enviada com sucesso!");
        onOpenChange(false);
      } else {
        throw new Error(data?.error || "Erro ao enviar notificação");
      }
    } catch (error: any) {
      console.error("Error sending broadcast:", error);
      toast.error(error.message || "Erro ao enviar notificação");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Enviar Notificação Geral
          </DialogTitle>
          <DialogDescription>
            Esta mensagem será enviada para todos os betelitas da sua congregação via notificação push.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, NOTIFICATION_MESSAGE_MAX_LENGTH))}
              placeholder="Digite sua mensagem aqui..."
              className="min-h-[120px]"
              maxLength={NOTIFICATION_MESSAGE_MAX_LENGTH}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/{NOTIFICATION_MESSAGE_MAX_LENGTH} caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="gap-2">
            <Send className="h-4 w-4" />
            {isSending ? "Enviando..." : "Enviar Agora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
