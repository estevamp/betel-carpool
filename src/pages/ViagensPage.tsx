import { useState } from "react";
import { motion } from "framer-motion";
import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrips } from "@/hooks/useTrips";
import { useProfiles } from "@/hooks/useProfiles";
import { useAuth } from "@/contexts/AuthContext";
import { TripCard } from "@/components/trips/TripCard";
import { CreateTripDialog } from "@/components/trips/CreateTripDialog";
import { Skeleton } from "@/components/ui/skeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export default function ViagensPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { profile } = useAuth();
  const { data: profiles } = useProfiles();
  const {
    trips,
    isLoading,
    createTrip,
    isCreating,
    updateTrip,
    isUpdating,
    reserveSeat,
    isReserving,
    cancelReservation,
    isCanceling,
    deleteTrip,
    removePassenger,
  } = useTrips();

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for comparison

  const filteredTrips = trips.filter((trip) => {
    // Filter out canceled trips
    if (trip.is_active === false) {
      return false;
    }

    // Filter out past trips (only show today and future)
    const tripDate = new Date(trip.departure_at);
    if (tripDate < today) {
      return false;
    }

    // Apply search filter
    const searchLower = searchTerm.toLowerCase();
    const driverName = trip.driver?.full_name || "";
    
    return (
      driverName.toLowerCase().includes(searchLower) ||
      trip.passengers.some((p) => {
        const passengerName = p.profile?.full_name || "";
        return passengerName.toLowerCase().includes(searchLower);
      })
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Viagens</h1>
          <p className="text-muted-foreground">
            Gerencie as viagens e reserve vagas
          </p>
        </div>
        <CreateTripDialog
          onCreateTrip={createTrip}
          isCreating={isCreating}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar por motorista ou passageiro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border p-5">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="flex gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-60" />
                </div>
              </div>
              <Skeleton className="h-8 w-full mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Trips List */}
      {!isLoading && filteredTrips.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4"
        >
          {filteredTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              currentUserId={profile?.id}
              profiles={profiles}
              onReserveSeat={reserveSeat}
              onCancelReservation={cancelReservation}
              onRemovePassenger={removePassenger}
              onDeleteTrip={deleteTrip}
              onUpdateTrip={updateTrip}
              isReserving={isReserving}
              isCanceling={isCanceling}
              isUpdating={isUpdating}
            />
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTrips.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Car className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-foreground">
            Nenhuma viagem encontrada
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm
              ? "Tente ajustar os filtros de busca"
              : profile
              ? "Crie uma nova viagem para começar"
              : "Aguarde betelitas criarem viagens"}
          </p>
        </div>
      )}
    </div>
  );
}
