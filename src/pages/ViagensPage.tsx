import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, ChevronDown, ChevronUp, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrips } from "@/hooks/useTrips";
import { useProfiles } from "@/hooks/useProfiles";
import { useAuth } from "@/contexts/AuthContext";
import { TripCard } from "@/components/trips/TripCard";
import { CreateTripDialog } from "@/components/trips/CreateTripDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useSelectedCongregation } from "@/contexts/CongregationContext";

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
  const [showPast, setShowPast] = useState(false);
  const { profile, isAdmin } = useAuth();
  const { data: profiles } = useProfiles();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId } = useSelectedCongregation();

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

  const effectiveCongregationId = isSuperAdmin
    ? selectedCongregationId
    : profile?.congregation_id;

  const congregationProfiles = profiles?.filter(
    (p) => p.congregation_id === effectiveCongregationId,
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Viagens futuras / hoje ──────────────────────────────────────────────
  const filteredTrips = trips.filter((trip) => {
    if (trip.is_active === false) return false;

    const tripDate = new Date(trip.departure_at);
    if (tripDate < today) return false;

    const searchLower = searchTerm.toLowerCase();
    const driverName = trip.driver?.full_name || "";
    return (
      driverName.toLowerCase().includes(searchLower) ||
      trip.passengers.some((p) =>
        (p.profile?.full_name || "").toLowerCase().includes(searchLower),
      )
    );
  });

  // ── Viagens anteriores (últimos 30 dias) ───────────────────────────────
  const { data: pastTrips = [], isLoading: isLoadingPast } = useQuery({
    queryKey: ["trips", "past30", effectiveCongregationId],
    enabled: showPast && !!effectiveCongregationId,
    queryFn: async () => {
      const thirtyDaysAgo = subDays(startOfDay(new Date()), 30).toISOString();
      const todayStart = startOfDay(new Date()).toISOString();

      const { data, error } = await supabase
        .from("trips")
        .select(
          `
          *,
          driver:profiles!trips_driver_id_fkey(id, full_name),
          passengers:trip_passengers(
            id,
            passenger_id,
            trip_type,
            profile:profiles!trip_passengers_passenger_id_fkey(id, full_name)
          )
        `,
        )
        .eq("is_active", true)
        .eq("congregation_id", effectiveCongregationId!)
        .gte("departure_at", thirtyDaysAgo)
        .lt("departure_at", todayStart)
        .order("departure_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredPastTrips = pastTrips.filter((trip) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const driverName = (trip.driver as any)?.full_name || "";
    return (
      driverName.toLowerCase().includes(searchLower) ||
      (trip.passengers as any[]).some((p) =>
        (p.profile?.full_name || "").toLowerCase().includes(searchLower),
      )
    );
  });

  // Agrupar viagens passadas por data
  const pastGroups: Record<string, typeof filteredPastTrips> = {};
  filteredPastTrips.forEach((trip) => {
    const key = format(parseISO(trip.departure_at), "yyyy-MM-dd");
    if (!pastGroups[key]) pastGroups[key] = [];
    pastGroups[key].push(trip);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Viagens</h1>
          <p className="text-muted-foreground">
            Coloque seu carro à disposição ou reserve uma vaga pra você em um dos carros.
          </p>
        </div>
        <CreateTripDialog onCreateTrip={createTrip} isCreating={isCreating} />
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
              isAdmin={isAdmin}
              profiles={congregationProfiles}
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
            Não há viagens no momento.
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

      {/* ── Seção: Viagens Anteriores ────────────────────────────────────── */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setShowPast((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Viagens anteriores
            <span className="text-xs font-normal opacity-70">(últimos 30 dias)</span>
          </span>
          {showPast ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
        </button>

        <AnimatePresence>
          {showPast && (
            <motion.div
              key="past-section"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-4">
                {/* Loading */}
                {isLoadingPast && (
                  <div className="grid gap-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-card rounded-xl border p-5">
                        <Skeleton className="h-5 w-28 mb-4" />
                        <div className="flex gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-4 w-52" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty */}
                {!isLoadingPast && filteredPastTrips.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <History className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground">
                      Nenhuma viagem nos últimos 30 dias.
                    </p>
                  </div>
                )}

                {/* Grouped by date */}
                {!isLoadingPast &&
                  filteredPastTrips.length > 0 &&
                  Object.entries(pastGroups).map(([dateKey, dayTrips]) => {
                    const dateObj = new Date(dateKey + "T00:00:00");
                    const dateLabel = format(
                      dateObj,
                      "EEEE, d 'de' MMMM",
                      { locale: ptBR },
                    );

                    return (
                      <div key={dateKey}>
                        {/* Date divider */}
                        <div className="flex items-center gap-3 px-1 py-2 mb-3">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {dateLabel}
                          </span>
                          <span className="flex-1 h-px bg-border" />
                        </div>

                        <motion.div
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          className={cn("grid gap-4 opacity-70")}
                        >
                          {dayTrips.map((trip) => (
                            <TripCard
                              key={trip.id}
                              trip={trip as any}
                              currentUserId={profile?.id}
                              isAdmin={isAdmin}
                              profiles={congregationProfiles}
                              onReserveSeat={reserveSeat}
                              onCancelReservation={cancelReservation}
                              onRemovePassenger={removePassenger}
                              onDeleteTrip={deleteTrip}
                              onUpdateTrip={updateTrip}
                              isReserving={isReserving}
                              isCanceling={isCanceling}
                              isUpdating={isUpdating}
                              readOnly
                            />
                          ))}
                        </motion.div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
