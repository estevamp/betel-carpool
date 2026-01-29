import { motion } from "framer-motion";
import { AlertTriangle, Plus, Users, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvacuation } from "@/hooks/useEvacuation";
import { useAuth } from "@/contexts/AuthContext";
import { CreateEvacuationCarDialog } from "@/components/evacuation/CreateEvacuationCarDialog";
import { EvacuationCarCard } from "@/components/evacuation/EvacuationCarCard";
import { EvacuationSkeleton } from "@/components/evacuation/EvacuationSkeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export default function DesocupacaoPage() {
  const { evacuationCars, isLoading, error, allocatedDriverIds } = useEvacuation();
  const { profile } = useAuth();

  const totalAllocated = evacuationCars.reduce(
    (sum, car) => sum + car.passengers.length,
    0
  );
  const totalDrivers = evacuationCars.length;
  const totalCapacity = evacuationCars.reduce(
    (sum, car) => sum + car.max_seats,
    0
  );

  // Check if user is already a driver
  const isAlreadyDriver = profile?.id ? allocatedDriverIds.has(profile.id) : false;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive">Erro ao carregar plano de evacuação</p>
      </div>
    );
  }

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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                {isAlreadyDriver ? (
                  <Button
                    className="gap-2"
                    variant="outline"
                    disabled
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Carro
                  </Button>
                ) : (
                  <CreateEvacuationCarDialog>
                    <Button className="gap-2 bg-destructive hover:bg-destructive/90">
                      <Plus className="h-4 w-4" />
                      Adicionar Carro
                    </Button>
                  </CreateEvacuationCarDialog>
                )}
              </div>
            </TooltipTrigger>
            {isAlreadyDriver && (
              <TooltipContent>
                <p>Você já possui um carro cadastrado</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Stats */}
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-destructive" />
            <span className="font-medium text-foreground">
              {isLoading ? "..." : `${totalAllocated + totalDrivers} pessoas alocadas`}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Car className="h-4 w-4" />
              {isLoading ? "..." : `${evacuationCars.length} carros`}
            </span>
            <span>
              {isLoading
                ? "..."
                : `${totalCapacity - totalAllocated} vagas disponíveis`}
            </span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && <EvacuationSkeleton />}

      {/* Cars Grid */}
      {!isLoading && evacuationCars.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 md:grid-cols-2"
        >
          {evacuationCars.map((car) => (
            <EvacuationCarCard key={car.id} car={car} />
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && evacuationCars.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Car className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">
            Nenhum carro cadastrado
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione seu carro ao plano de evacuação
          </p>
        </div>
      )}
    </div>
  );
}
