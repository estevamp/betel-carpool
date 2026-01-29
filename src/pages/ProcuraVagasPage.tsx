import { motion } from "framer-motion";
import { 
  Plus, 
  Search,
  Calendar,
  CheckCircle2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock data
const searchingRides = [
  { id: 1, name: "Leonardo Silva", date: "15/01/2026", time: "18:30", notes: "" },
  { id: 2, name: "Adriano Diniz", date: "18/01/2026", time: "08:00", notes: "Preciso ir ao aeroporto" },
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

export default function ProcuraVagasPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Procura de Vagas</h1>
          <p className="text-muted-foreground">
            Betelitas que precisam de carona
          </p>
        </div>
        <Button className="gap-2 bg-warning hover:bg-warning/90 text-warning-foreground">
          <Plus className="h-4 w-4" />
          Preciso de Carona
        </Button>
      </div>

      {/* Searching List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4"
      >
        {searchingRides.map((request) => (
          <motion.div
            key={request.id}
            variants={itemVariants}
            className="bg-card rounded-xl border border-warning/30 shadow-card p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 shrink-0">
                  <Search className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">
                    {request.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {request.date}
                    </span>
                    {request.time && (
                      <span>às {request.time}</span>
                    )}
                  </div>
                  {request.notes && (
                    <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded-lg">
                      {request.notes}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm">
                Criar Viagem
              </Button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {searchingRides.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h3 className="font-semibold text-foreground">Parece que está tudo certo!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ninguém está procurando carona no momento
          </p>
        </div>
      )}
    </div>
  );
}
