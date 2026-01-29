import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Plane, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Absence } from "@/hooks/useAbsences";
import { useAuth } from "@/contexts/AuthContext";

interface AbsenceCardProps {
  absence: Absence;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export function AbsenceCard({ absence, onDelete, isDeleting }: AbsenceCardProps) {
  const { profile, isAdmin } = useAuth();
  const canDelete = isAdmin || profile?.id === absence.profile_id;

  const startDate = format(new Date(absence.start_date), "dd/MM/yyyy", { locale: ptBR });
  const endDate = format(new Date(absence.end_date), "dd/MM/yyyy", { locale: ptBR });

  return (
    <motion.div
      variants={itemVariants}
      className="bg-card rounded-xl border border-border shadow-card p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10 shrink-0">
            <Plane className="h-6 w-6 text-info" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">
              {absence.profile_name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{startDate} até {endDate}</span>
            </div>
            {absence.notes && (
              <p className="text-sm text-muted-foreground mt-2">
                {absence.notes}
              </p>
            )}
          </div>
        </div>
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover ausência?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover este registro de ausência? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(absence.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </motion.div>
  );
}
