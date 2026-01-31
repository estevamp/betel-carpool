import { motion } from "framer-motion";
import { Car, Plane, Search, AlertTriangle, Wallet, Users, HelpCircle, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const quickAccessItems = [
  { icon: Car, label: "Viagens", path: "/viagens", color: "bg-primary" },
  { icon: Plane, label: "Ausência", path: "/ausencia", color: "bg-info" },
  { icon: Search, label: "Procura de Vagas", path: "/procura-vagas", color: "bg-warning" },
  { icon: AlertTriangle, label: "Desocupação", path: "/desocupacao", color: "bg-destructive" },
  { icon: Wallet, label: "Financeiro", path: "/financeiro", color: "bg-success" },
];

const secondaryItems = [
  { icon: Users, label: "Betelitas", path: "/betelitas" },
  { icon: HelpCircle, label: "Perguntas Frequentes", path: "/faq" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export default function Dashboard() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";

  const { data: congregationName } = useQuery({
    queryKey: ["settings", "congregation_name"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "congregation_name")
        .maybeSingle();
      return data?.value || null;
    },
  });

  const subtitle = congregationName
    ? `Sistema de Transporte de Betelitas - ${congregationName}`
    : "Bem-vindo ao sistema de transporte de Betelitas";

  return (
    <motion.div
      className="space-y-8 max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center pt-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Olá, {firstName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </motion.div>

      {/* Quick Access */}
      <motion.div variants={itemVariants}>
        <h2 className="font-semibold text-foreground mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickAccessItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="group flex flex-col items-center gap-3 p-5 bg-card rounded-xl border border-border shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl text-white transition-transform group-hover:scale-110",
                  item.color
                )}
              >
                <item.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-foreground text-center">
                {item.label}
              </span>
            </Link>
          ))}
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
              <span className="text-sm font-medium text-foreground">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
