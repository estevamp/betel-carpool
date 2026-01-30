import { motion } from "framer-motion";
import { Car, Plane, Search, AlertTriangle, Wallet, Calendar, Users, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// Mock data for dashboard
const todayTrips = [{
  id: 1,
  driver: "Jonatã Bessa",
  time: "18:30",
  passengers: 3,
  total: 4
}, {
  id: 2,
  driver: "Rafael Maguetas",
  time: "21:00",
  passengers: 2,
  total: 4
}];
const searchingRides = [{
  id: 1,
  name: "Leonardo Silva",
  date: "15/01/2026"
}];
const absences = [{
  id: 1,
  name: "Felipe Oliveira",
  until: "20/01/2026"
}];
const quickAccessItems = [{
  icon: Car,
  label: "Viagens",
  path: "/viagens",
  color: "bg-primary"
}, {
  icon: Plane,
  label: "Ausência",
  path: "/ausencia",
  color: "bg-info"
}, {
  icon: Search,
  label: "Procura de Vagas",
  path: "/procura-vagas",
  color: "bg-warning"
}, {
  icon: AlertTriangle,
  label: "Desocupação",
  path: "/desocupacao",
  color: "bg-destructive"
}, {
  icon: Wallet,
  label: "Financeiro",
  path: "/financeiro",
  color: "bg-success"
}];
const containerVariants = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};
const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  }
};
export default function Dashboard() {
  const {
    profile
  } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";
  return <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Olá, {firstName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo ao sistema de transporte de Betelitas
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Car} label="Viagens Hoje" value={todayTrips.length.toString()} trend="+2 esta semana" color="primary" />
        <StatCard icon={Users} label="Procurando Carona" value={searchingRides.length.toString()} trend="Aguardando" color="warning" />
        <StatCard icon={Plane} label="Ausentes" value={absences.length.toString()} trend="Atualmente" color="info" />
        <StatCard icon={TrendingUp} label="Saldo do Mês" value="R$ 97,50" trend="A receber" color="success" />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Programação de Hoje</h2>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                  </p>
                </div>
              </div>
              <Link to="/viagens" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                Ver todas
              </Link>
            </div>

            <div className="divide-y divide-border">
              {todayTrips.length > 0 ? todayTrips.map(trip => <div key={trip.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Car className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{trip.driver}</p>
                      <p className="text-sm text-muted-foreground">
                        {trip.passengers}/{trip.total} passageiros
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{trip.time}</span>
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", trip.passengers < trip.total ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                      {trip.passengers < trip.total ? `${trip.total - trip.passengers} vagas` : "Completo"}
                    </span>
                  </div>) : <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">Sem viagens hoje</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aproveite o dia de descanso!
                  </p>
                </div>}
            </div>
          </div>
        </motion.div>

        {/* Side Panel */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Searching Rides */}
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                <Search className="h-4 w-4 text-warning" />
              </div>
              <h3 className="font-semibold text-foreground">Procurando Vagas</h3>
            </div>
            <div className="p-5">
              {searchingRides.length > 0 ? <div className="space-y-3">
                  {searchingRides.map(person => <div key={person.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {person.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm font-medium text-foreground">{person.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{person.date}</span>
                    </div>)}
                </div> : <div className="flex items-center gap-3 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Parece que está tudo certo!</span>
                </div>}
            </div>
          </div>

          {/* Absences */}
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                <Plane className="h-4 w-4 text-info" />
              </div>
              <h3 className="font-semibold text-foreground">Ausentes</h3>
            </div>
            <div className="p-5">
              {absences.length > 0 ? <div className="space-y-3">
                  {absences.map(person => <div key={person.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {person.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm font-medium text-foreground">{person.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">até {person.until}</span>
                    </div>)}
                </div> : <p className="text-sm text-muted-foreground">Nenhum ausente no momento</p>}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Access */}
      <motion.div variants={itemVariants}>
        <h2 className="font-semibold text-foreground mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickAccessItems.map(item => <Link key={item.path} to={item.path} className="group flex flex-col items-center gap-3 p-5 bg-card rounded-xl border border-border shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all duration-300">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-white transition-transform group-hover:scale-110", item.color)}>
                <item.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-foreground text-center">
                {item.label}
              </span>
            </Link>)}
        </div>
      </motion.div>
    </motion.div>;
}
interface StatCardProps {
  icon: typeof Car;
  label: string;
  value: string;
  trend: string;
  color: 'primary' | 'success' | 'warning' | 'info';
}
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color
}: StatCardProps) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info"
  };
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">{trend}</p>
    </div>
  );
}