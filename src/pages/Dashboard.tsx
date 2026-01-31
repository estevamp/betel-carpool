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
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
const quickAccessItems = [
  {
    icon: Car,
    label: "Viagens",
    path: "/viagens",
    color: "bg-primary",
  },
  {
    icon: Search,
    label: "Procura de Vagas",
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
  {
    icon: HelpCircle,
    label: "Perguntas Frequentes",
    path: "/faq",
  },
  {
    icon: Settings,
    label: "Configurações",
    path: "/configuracoes",
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
  const { data: congregationName } = useQuery({
    queryKey: ["settings", "congregation_name"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("value").eq("key", "congregation_name").maybeSingle();
      return data?.value || null;
    },
  });

  // Fetch today's trips
  const { data: todayTrips = [] } = useQuery({
    queryKey: ["trips", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(
          `
          *,
          driver:profiles!trips_driver_id_fkey(id, full_name),
          passengers:trip_passengers(id, passenger_id)
        `,
        )
        .eq("is_active", true)
        .order("departure_at", {
          ascending: true,
        });
      if (error) throw error;

      // Filter trips that depart today
      const today = new Date();
      return (data ?? []).filter((trip) => {
        const departureDate = parseISO(trip.departure_at);
        return isToday(departureDate);
      });
    },
  });
  const subtitle = congregationName
    ? `Sistema de Transporte de Betelitas - ${congregationName}`
    : "Bem-vindo ao sistema de transporte de Betelitas";
  return (
    <motion.div className="space-y-8 max-w-4xl mx-auto" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center pt-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Olá, {firstName}! 👋</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </motion.div>

      {/* Quick Access */}
      <motion.div variants={itemVariants}>
        <h2 className="font-semibold text-foreground mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
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

      {/* Today's Trips */}
      <motion.div variants={itemVariants}>
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Viagens de Hoje</h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "EEEE, d 'de' MMMM", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
            <Link to="/viagens" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Ver todas
            </Link>
          </div>

          <div className="divide-y divide-border">
            {todayTrips.length > 0 ? (
              todayTrips.map((trip) => {
                const passengerCount = trip.passengers?.length || 0;
                const maxPassengers = trip.max_passengers || 4;
                const availableSeats = maxPassengers - passengerCount;
                const departureTime = format(parseISO(trip.departure_at), "HH:mm");
                return (
                  <div key={trip.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Car className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{trip.driver?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {passengerCount}/{maxPassengers} passageiros
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{departureTime}</span>
                    </div>
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium",
                        availableSeats > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {availableSeats > 0 ? `${availableSeats} vaga${availableSeats > 1 ? "s" : ""}` : "Completo"}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">Sem viagens hoje</p>
                <p className="text-sm text-muted-foreground mt-1">Aproveite o dia de descanso!</p>
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
