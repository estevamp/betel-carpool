import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Car, Mail, Shield, CreditCard, Heart } from "lucide-react";
import type { Betelita } from "@/hooks/useBetelitas";

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
              <h3 className="text-lg font-semibold">{person.full_name}</h3>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
