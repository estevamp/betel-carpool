import { motion } from "framer-motion";
import { 
  AlertTriangle,
  Car,
  Users,
  MapPin,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mock data
const evacuationCars = [
  { 
    id: 1, 
    driver: "Estevam Palombi", 
    destination: "São Roque - SP", 
    passengers: ["Aline Palombi"],
    totalSeats: 4,
  },
  { 
    id: 2, 
    driver: "Jonatã Bessa", 
    destination: "Socorro, SP", 
    passengers: ["Gabi Bessa"],
    totalSeats: 4,
  },
  { 
    id: 3, 
    driver: "Ruan Oliveira", 
    destination: "Embu-Guaçu SP", 
    passengers: ["Felipe Oliveira", "Leonardo Silva"],
    totalSeats: 4,
  },
  { 
    id: 4, 
    driver: "Rafael Maguetas", 
    destination: "Sorocaba - SP", 
    passengers: [],
    totalSeats: 4,
  },
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

export default function DesocupacaoPage() {
  const totalAllocated = evacuationCars.reduce((sum, car) => sum + car.passengers.length, 0);
  const totalCapacity = evacuationCars.reduce((sum, car) => sum + car.totalSeats, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">Desocupação</h1>
          </div>
          <p className="text-muted-foreground">
            Plano de evacuação de emergência
          </p>
        </div>
        <Button className="gap-2 bg-destructive hover:bg-destructive/90">
          <Plus className="h-4 w-4" />
          Adicionar Carro
        </Button>
      </div>

      {/* Stats */}
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-destructive" />
            <span className="font-medium text-foreground">
              {totalAllocated} pessoas alocadas
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {totalCapacity - totalAllocated} vagas disponíveis
          </span>
        </div>
      </div>

      {/* Cars Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 md:grid-cols-2"
      >
        {evacuationCars.map((car) => (
          <motion.div
            key={car.id}
            variants={itemVariants}
            className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{car.driver}</h3>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4" />
                    {car.destination}
                  </p>
                </div>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium",
                  car.passengers.length < car.totalSeats
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                )}>
                  {car.passengers.length}/{car.totalSeats}
                </span>
              </div>

              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Passageiros:</p>
                <div className="flex flex-wrap gap-2">
                  {car.passengers.map((passenger, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-full text-sm bg-muted text-muted-foreground"
                    >
                      {passenger}
                    </span>
                  ))}
                  {Array.from({ length: car.totalSeats - car.passengers.length }).map((_, idx) => (
                    <button
                      key={`empty-${idx}`}
                      className="px-3 py-1.5 rounded-full text-sm border border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-primary hover:text-primary transition-colors"
                    >
                      + Adicionar
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
