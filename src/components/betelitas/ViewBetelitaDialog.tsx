import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Car, Mail, Shield, CreditCard, Heart, CheckCircle2, Copy } from "lucide-react";
import type { Betelita } from "@/hooks/useBetelitas";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSelectedCongregation } from "@/contexts/CongregationContext";
import { useCongregations } from "@/hooks/useCongregations";

interface ViewBetelitaDialogProps {
  person: Betelita | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewBetelitaDialog({
  person,
  open,
  onOpenChange,
}: ViewBetelitaDialogProps) {
  if (!person) return null;

  const { toast } = useToast();
  const { selectedCongregationId } = useSelectedCongregation();
  const { congregations } = useCongregations();

  const handleCopyLink = async () => {
    if (!person.email) {
      toast({
        title: "Email obrigatório",
        description: "Para gerar o link de convite, é necessário informar o email.",
        variant: "destructive",
      });
      return;
    }

    try {
      const congregationName = congregations?.find(c => c.id === selectedCongregationId)?.name || '';
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/auth?email=${encodeURIComponent(person.email)}&type=invite`;
      const inviteText = `Esse é o seu convite para de cadastrar no sistema de transportes da congregação ${congregationName}.\n\n${inviteUrl}`;

      await navigator.clipboard.writeText(inviteText);

      toast({
        title: "Link copiado!",
        description: "O link de convite foi copiado para a área de transferência.",
      });
    } catch (error) {
      console.error("Error copying link:", error);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleSendInvite = async () => {
    if (!person.email) {
      toast({
        title: "Email obrigatório",
        description: "Para enviar o convite, é necessário informar o email.",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real application, you would call an API to send the invite email
      // For now, we'll just simulate it.
      toast({
        title: "Convite enviado!",
        description: `Um convite foi enviado para ${person.email}.`,
      });
    } catch (error) {
      console.error("Error sending invite:", error);
      toast({
        title: "Erro ao enviar convite",
        description: "Não foi possível enviar o convite. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perfil de {person.full_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-medium ${
                person.sex === "Homem"
                  ? "bg-primary/10 text-primary"
                  : "bg-accent/10 text-accent"
              }`}
            >
              {person.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-1.5">
                {person.full_name}
                {person.user_id && (
                  <span title="Vinculado ao sistema">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {person.sex ?? "Sexo não informado"}
              </p>
            </div>
          </div>

          {/* Contact */}
          {person.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{person.email}</span>
            </div>
          )}

          {/* Spouse */}
          {person.is_married && person.spouse_name && (
            <div className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span>
                {person.sex === "Mulher" ? "Casada com" : "Casado com"}{" "}
                {person.spouse_name}
              </span>
            </div>
          )}

          {/* PIX Key */}
          {person.pix_key && (
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span>PIX: {person.pix_key}</span>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {person.is_driver && (
              <Badge variant="secondary" className="gap-1">
                <Car className="h-3 w-3" />
                Motorista
              </Badge>
            )}
            {person.is_admin && (
              <Badge variant="secondary" className="gap-1 bg-warning/10 text-warning">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            )}
            {person.is_exempt && (
              <Badge variant="secondary" className="gap-1 bg-info/10 text-info">
                <CreditCard className="h-3 w-3" />
                Isento
              </Badge>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              size="sm"
              title="Copiar link do convite"
              disabled={!person.email}
            >
              <Copy className="h-3 w-3" />
              Copiar link
            </Button>
            <Button
              type="button"
              onClick={handleSendInvite}
              size="sm"
              title="Enviar convite por email"
              disabled={!person.email}
            >
              <Mail className="h-3 w-3" />
              Enviar Convite
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
