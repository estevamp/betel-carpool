import { motion } from "framer-motion";
import {
  Car,
  Plane,
  Search,
  AlertTriangle,
  Wallet,
  Users,
  HelpCircle,
  Settings,
  Calendar,
  CheckCircle2,
  List,
  Hexagon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, parseISO, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSelectedCongregation } from "@/contexts/CongregationContext";
import { useCongregations } from "@/hooks/useCongregations";
const quickAccessItems = [
  {
    icon: Car,
    label: "Viagens",
    path: "/viagens",
    color: "bg-primary",
  },
  {
    icon: Search,
    label: "Preciso de Carona",
    path: "/procura-vagas",
    color: "bg-warning",
  },
];
const secondaryItems = [
  {
    icon: Plane,
    label: "Ausência",
    path: "/ausencia",
  },
  {
    icon: AlertTriangle,
    label: "Desocupação",
    path: "/desocupacao",
  },
  {
    icon: Wallet,
    label: "Financeiro",
    path: "/financeiro",
  },
];
const containerVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};
const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  }, 
};
export default function Dashboard() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";
  const { isSuperAdmin } = useAuth();
  const { selectedCongregationId } = useSelectedCongregation();
  const { congregations } = useCongregations();

  const currentCongregation = isSuperAdmin
    ? congregations?.find((c) => c.id === selectedCongregationId)
    : congregations?.find((c) => c.id === profile?.congregation_id);

  const congregationName = currentCongregation?.name;
  const [viewMode, setViewMode] = useState<"agenda" | "timeline">("agenda");

  // Fetch today's trips and future trips
  const { data: todayTrips = [] } = useQuery({
    queryKey: ["trips", "from_today", selectedCongregationId], // Add selectedCongregationId to queryKey
    queryFn: async () => {
      if (!selectedCongregationId) return []; // Don't fetch if no congregation is selected

      const todayStart = startOfDay(new Date()).toISOString();
      const threeDaysEnd = addDays(startOfDay(new Date()), 3).toISOString();

      const { data, error } = await supabase
        .from("trips")
        .select(
          `
          *,
          driver:profiles!trips_driver_id_fkey(id, full_name),
          passengers:trip_passengers(
            id,
            passenger_id,
            profile:profiles(full_name)
          )
        `,
        )
      .eq("is_active", true)
      .eq("congregation_id", selectedCongregationId)
      .gte("departure_at", todayStart)
      .lt("departure_at", threeDaysEnd)
      .order("departure_at", { ascending: true });
          if (error) throw error;

          return data ?? [];
        },
      });

  const todayDateString = format(new Date(), "yyyy-MM-dd");

  const { data: upcomingRideRequests = [] } = useQuery({
    queryKey: ["ride_requests", "from_today", selectedCongregationId],
    queryFn: async () => {
      if (!selectedCongregationId) return [];

      const { data, error } = await supabase
        .from("ride_requests")
        .select("id, requested_date, profile:profiles(full_name)")
        .eq("is_fulfilled", false)
        .eq("congregation_id", selectedCongregationId)
        .gte("requested_date", todayDateString)
        .order("requested_date", { ascending: true });

      if (error) throw error;

      return data ?? [];
    },
  });

  const { data: activeAbsences = [] } = useQuery({
    queryKey: ["absences", "ending_from_today", selectedCongregationId],
    queryFn: async () => {
      if (!selectedCongregationId) return [];

      const { data, error } = await supabase
        .from("absences")
        .select("id, start_date, end_date, profile:profiles(full_name)")
        .eq("congregation_id", selectedCongregationId)
        .gte("end_date", todayDateString)
        .order("end_date", { ascending: true });

      if (error) throw error;

      return data ?? [];
    },
  });

  const subtitle = "Sistema de transporte de betelitas | " + firstName;
  return (
    <motion.div className="space-y-8 max-w-4xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center pt-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{congregationName}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </motion.div>

      {/* Quick Access */}
      <motion.div variants={itemVariants}>
        <h2 className="font-semibold text-foreground mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {quickAccessItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="group flex flex-col items-center gap-3 p-5 bg-card border border-border hover:-translate-y-1 transition-all duration-300 text-right rounded-xl shadow-lg"
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl text-white transition-transform group-hover:scale-110",
                  item.color,
                )}
              >
                <item.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-foreground text-center">{item.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Today's Trips and Future Trips */}
      <motion.div variants={itemVariants}>
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border space-y-3">
            {/* Linha 1: ícone + título + subtítulo inline */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground whitespace-nowrap">Viagens nos próximos 3 dias</h2>
            </div>
            {/* Linha 2: botões de view à esquerda, "Ver todas" à direita */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center rounded-full border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("agenda")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "agenda"
                      ? "bg-primary text-white"
                      : "bg-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  Agenda
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("timeline")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "timeline"
                      ? "bg-primary text-white"
                      : "bg-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Hexagon className="h-3.5 w-3.5" />
                  Timeline
                </button>
              </div>
              <Link to="/viagens" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                Ver todas
              </Link>
            </div>
          </div>
          <div>
            {todayTrips.length > 0 ? (() => {
              // Agrupar viagens por data
              const groups: Record<string, typeof todayTrips> = {};
              todayTrips.forEach((trip) => {
                const key = format(parseISO(trip.departure_at), "yyyy-MM-dd");
                if (!groups[key]) groups[key] = [];
                groups[key].push(trip);
              });

              if (viewMode === "agenda") {
                return Object.entries(groups).map(([dateKey, trips]) => {
                  const dateObj = new Date(dateKey + "T00:00:00");
                  const isTodayDate = isToday(dateObj);
                  const isTomorrowDate = isTomorrow(dateObj);
                  const dateLabel = isTodayDate
                    ? "Hoje"
                    : isTomorrowDate
                    ? "Amanhã"
                    : format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR });

                  return (
                    <div key={dateKey}>
                      <div
                        className={cn(
                          "flex items-center gap-3 px-5 py-2 border-y border-border",
                          isTodayDate ? "bg-primary/5" : "bg-muted/40",
                        )}
                      >
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        <span className={cn(
                          "text-xs font-semibold uppercase tracking-wide",
                          isTodayDate ? "text-primary" : "text-muted-foreground",
                        )}>
                          {dateLabel}
                        </span>
                      </div>

                      <div className="divide-y divide-border">
                        {trips.map((trip) => {
                          const departureDate = parseISO(trip.departure_at);
                          const departureTime = format(departureDate, "HH:mm");
                          const returnTime = trip.return_at
                            ? format(parseISO(trip.return_at), "HH:mm")
                            : null;
                          const confirmedPassengers =
                            trip.passengers
                              ?.map((passenger) => passenger.profile?.full_name)
                              .filter((name): name is string => Boolean(name)) ?? [];
                          const passengerCount = trip.passengers?.length || 0;
                          const maxPassengers = trip.max_passengers || 4;
                          const availableSeats = maxPassengers - passengerCount;
                          const isFull = availableSeats <= 0;

                          return (
                            <Link
                              key={trip.id}
                              to={`/viagens/${trip.id}`}
                              className="block px-5 py-4 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="font-bold text-base text-foreground">
                                    {trip.driver?.full_name ?? "Motorista desconhecido"}
                                  </p>

                                  {(trip.is_urgent || trip.is_betel_car) && (
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                      {trip.is_urgent && (
                                        <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                                          {"\u26A0"} NECESSÁRIA
                                        </span>
                                      )}
                                      {trip.is_betel_car && (
                                        <span className="inline-flex items-center rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
                                          {"\ud83c\udfe2"} BETEL
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    {confirmedPassengers.length > 0 ? (
                                      confirmedPassengers.map((name, index) => (
                                        <div key={`${trip.id}-${name}-${index}`} className="flex items-center gap-1.5">
                                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                                            {name}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm italic text-muted-foreground/50">Nenhum passageiro</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex shrink-0 flex-col items-end gap-1">
                                  <p className="font-bold text-base text-foreground text-right">
                                    {departureTime}
                                    {returnTime && (
                                      <span className="font-medium text-muted-foreground"> {"\u2192"} {returnTime}</span>
                                    )}
                                  </p>
                                  <span
                                    className={cn(
                                      "px-2.5 py-1 rounded-full text-xs font-medium",
                                      isFull ? "bg-muted text-muted-foreground" : "bg-success/10 text-success",
                                    )}
                                  >
                                    {isFull ? "Completo" : `${availableSeats} vagas`}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              }

              return (
                <div className="py-2">
                  {Object.entries(groups).map(([dateKey, trips], groupIndex, allGroups) => {
                    const dateObj = new Date(dateKey + "T00:00:00");
                    const isTodayDate = isToday(dateObj);
                    const weekDay = format(dateObj, "EEE", { locale: ptBR });
                    const dayNumber = format(dateObj, "d");

                    return (
                      <div key={dateKey} className="flex gap-4 px-5 py-3">
                        <div className="w-16 shrink-0 flex flex-col items-center">
                          <div
                            className={cn(
                              "h-16 w-16 rounded-xl flex flex-col items-center justify-center",
                              isTodayDate ? "bg-primary text-white" : "bg-muted text-muted-foreground",
                            )}
                          >
                            <span className="text-xs font-semibold uppercase">{weekDay}</span>
                            <span className="text-xl font-bold leading-none">{dayNumber}</span>
                          </div>
                          {groupIndex < allGroups.length - 1 && <div className="mt-2 w-0.5 flex-1 bg-primary/20" />}
                        </div>

                        <div className="flex-1 space-y-3">
                          {trips.map((trip) => {
                            const departureDate = parseISO(trip.departure_at);
                            const departureTime = format(departureDate, "HH:mm");
                            const returnTime = trip.return_at
                              ? format(parseISO(trip.return_at), "HH:mm")
                              : null;
                            const passengerCount = trip.passengers?.length || 0;
                            const maxPassengers = trip.max_passengers || 4;
                            const availableSeats = maxPassengers - passengerCount;
                            const isFull = availableSeats <= 0;
                            const passengerNames = trip.passengers
                              ?.map((passenger) => passenger.profile?.full_name)
                              .filter((name): name is string => Boolean(name))
                              .join(" / ");
                            const leftBorderColor = isFull
                              ? "border-l-muted"
                              : trip.is_urgent
                              ? "border-l-warning"
                              : trip.is_betel_car
                              ? "border-l-info"
                              : "border-l-primary";

                            return (
                              <Link
                                key={trip.id}
                                to={`/viagens/${trip.id}`}
                                className={cn(
                                  "block rounded-xl border border-border border-l-2 bg-card px-4 py-3 hover:bg-muted/30 transition-colors",
                                  leftBorderColor,
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <p className="font-bold text-base text-foreground">
                                    {departureTime}
                                    {returnTime && (
                                      <span className="font-medium text-muted-foreground"> {"\u2192"} {returnTime}</span>
                                    )}
                                  </p>
                                  <span
                                    className={cn(
                                      "px-2.5 py-1 rounded-full text-xs font-medium",
                                      isFull ? "bg-muted text-muted-foreground" : "bg-success/10 text-success",
                                    )}
                                  >
                                    {isFull ? "Completo" : `${availableSeats} vagas`}
                                  </span>
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <p className="text-sm text-muted-foreground">
                                    {trip.driver?.full_name ?? "Motorista desconhecido"}
                                  </p>
                                  {(trip.is_urgent || trip.is_betel_car) && (
                                    <>
                                      {trip.is_urgent && (
                                        <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                                          {"\u26A0"} NECESSÁRIA
                                        </span>
                                      )}
                                      {trip.is_betel_car && (
                                        <span className="inline-flex items-center rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
                                          {"\ud83c\udfe2"} BETEL
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>

                                {passengerNames ? (
                                  <p className="mt-1 text-xs text-muted-foreground/70">{passengerNames}</p>
                                ) : (
                                  <p className="mt-1 text-xs italic text-muted-foreground/70">Nenhum passageiro</p>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">Nenhuma viagem programada :-(</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Ride Requests */}
      <motion.div variants={itemVariants}>
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Search className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Preciso de Carona</h2>
              </div>
            </div>
            <Link to="/procura-vagas" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Ver todas
            </Link>
          </div>

          <div className="divide-y divide-border">
            {upcomingRideRequests.length > 0 ? (
              upcomingRideRequests.map((request) => (
                <Link
                  key={request.id}
                  to="/procura-vagas"
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                    <Search className="h-6 w-6 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base text-foreground">{request.profile?.full_name ?? "Desconhecido"}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(request.requested_date), "dd/MM/yyyy")}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="font-medium text-foreground">Ninguém procurando carona :-)</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Active Absences */}
      <motion.div variants={itemVariants}>
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Plane className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Ausências</h2>
              </div>
            </div>
            <Link to="/ausencia" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Ver todas
            </Link>
          </div>

          <div className="divide-y divide-border">
            {activeAbsences.length > 0 ? (
              activeAbsences.map((absence) => (
                <Link
                  key={absence.id}
                  to="/ausencia"
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Plane className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base text-foreground">{absence.profile?.full_name ?? "Desconhecido"}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(absence.start_date), "dd/MM/yyyy")} - {format(parseISO(absence.end_date), "dd/MM/yyyy")}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="font-medium text-foreground">Ninguém está ausente</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Secondary Links */}
      <motion.div variants={itemVariants}>
        <h2 className="font-semibold text-foreground mb-4">Mais Opções</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {secondaryItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <item.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
