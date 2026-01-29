import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAbsences } from "@/hooks/useAbsences";
import { AbsenceCard } from "@/components/absences/AbsenceCard";
import { AbsencesSkeleton } from "@/components/absences/AbsencesSkeleton";
import { CreateAbsenceDialog } from "@/components/absences/CreateAbsenceDialog";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export default function AusenciaPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const {
    absences,
    isLoading,
    createAbsence,
    isCreating,
    deleteAbsence,
    isDeleting,
  } = useAbsences();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ausência</h1>
          <p className="text-muted-foreground">
            Registre períodos de ausência
          </p>
        </div>
        <Button
          className="gap-2 bg-primary hover:bg-primary/90"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Registrar Ausência
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && <AbsencesSkeleton />}

      {/* Absences List */}
      {!isLoading && absences.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4"
        >
          {absences.map((absence) => (
            <AbsenceCard
              key={absence.id}
              absence={absence}
              onDelete={deleteAbsence}
              isDeleting={isDeleting}
            />
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && absences.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Plane className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-foreground">
            Nenhuma ausência registrada
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Todos os betelitas estão presentes
          </p>
        </div>
      )}

      {/* Create Dialog */}
      <CreateAbsenceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={createAbsence}
        isLoading={isCreating}
      />
    </div>
  );
}
