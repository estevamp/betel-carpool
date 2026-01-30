import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Car, Mail, MoreVertical, Shield, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Betelita } from "@/hooks/useBetelitas";

interface BetelitaRowProps {
  person: Betelita;
  onViewProfile: (person: Betelita) => void;
  onEdit: (person: Betelita) => void;
  onDelete: (person: Betelita) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

const MotionTr = motion.tr;

export const BetelitaRow = forwardRef<HTMLTableRowElement, BetelitaRowProps>(
  function BetelitaRow({ person, onViewProfile, onEdit, onDelete }, ref) {
    const initials = person.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <MotionTr
        ref={ref}
        variants={itemVariants}
        className="hover:bg-muted/30 transition-colors"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium",
                person.sex === "Homem"
                  ? "bg-primary/10 text-primary"
                  : "bg-accent/10 text-accent"
              )}
            >
              {initials}
            </div>
            <div>
              <p className="font-medium text-foreground">{person.full_name}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          {person.email ? (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {person.email}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/50">-</span>
          )}
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="text-sm text-muted-foreground">
            {person.sex ?? "-"}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {person.is_driver && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                <Car className="h-3 w-3" />
                Motorista
              </span>
            )}
            {person.is_admin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                <Shield className="h-3 w-3" />
                Admin
              </span>
            )}
            {person.is_exempt && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">
                <CreditCard className="h-3 w-3" />
                Isento
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={() => onViewProfile(person)}>
                Ver perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(person)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(person)}
                className="text-destructive focus:text-destructive"
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </MotionTr>
    );
  }
);
