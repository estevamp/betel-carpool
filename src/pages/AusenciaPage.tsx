import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  Plane, 
  Calendar,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mock data
const absences = [
  { id: 1, name: "Felipe Oliveira", start: "15/01/2026", end: "20/01/2026", notes: "Viagem de férias" },
  { id: 2, name: "Leonardo Jesus", start: "18/01/2026", end: "25/01/2026", notes: "Visitando família" },
  { id: 3, name: "Francis Parenti", start: "22/01/2026", end: "28/01/2026", notes: "" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function AusenciaPage() {
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
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Registrar Ausência
        </Button>
      </div>

      {/* Active Absences */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4"
      >
        {absences.map((absence) => (
          <motion.div
            key={absence.id}
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
                    {absence.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{absence.start} até {absence.end}</span>
                  </div>
                  {absence.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {absence.notes}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {absences.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Plane className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-foreground">Nenhuma ausência registrada</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Todos os betelitas estão presentes
          </p>
        </div>
      )}
    </div>
  );
}
