import { motion } from "framer-motion";
import { Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRideRequests } from "@/hooks/useRideRequests";
import { CreateRideRequestDialog } from "@/components/ride-requests/CreateRideRequestDialog";
import { RideRequestCard } from "@/components/ride-requests/RideRequestCard";
import { RideRequestsSkeleton } from "@/components/ride-requests/RideRequestsSkeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export default function ProcuraVagasPage() {
  const { rideRequests, isLoading, error } = useRideRequests();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive">Erro ao carregar solicitações</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Preciso de Carona</h1>
          <p className="text-muted-foreground">
            {isLoading
              ? "Carregando..."
              : `${rideRequests.length} betelita${rideRequests.length !== 1 ? "s" : ""} precisando de carona`}
          </p>
        </div>
        <CreateRideRequestDialog>
          <Button
            data-tour="procuro-carona"
            className="gap-2 bg-warning hover:bg-warning/90 text-warning-foreground"
          >
            <Plus className="h-4 w-4" />
            Preciso de Carona
          </Button>
        </CreateRideRequestDialog>
      </div>

      {/* Loading State */}
      {isLoading && <RideRequestsSkeleton />}

      {/* Request List */}
      {!isLoading && rideRequests.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4"
        >
          {rideRequests.map((request) => (
            <RideRequestCard key={request.id} request={request} />
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && rideRequests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h3 className="font-semibold text-foreground">Parece que está tudo certo!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ninguém está procurando carona no momento :-)
          </p>
        </div>
      )}
    </div>
  );
}