import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Check,
  Copy,
  ChevronRight,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mock data
const months = [
  { id: "jan2026", label: "Janeiro 2026", current: true },
  { id: "dec2025", label: "Dezembro 2025", current: false },
  { id: "nov2025", label: "Novembro 2025", current: false },
];

const report = [
  { name: "Adriano Diniz", toPay: 75, toReceive: 0 },
  { name: "Emerson Nogueira", toPay: 90, toReceive: 0 },
  { name: "Estevam Palombi", toPay: 75, toReceive: 172.5 },
  { name: "Felipe Oliveira", toPay: 120, toReceive: 0 },
  { name: "Francis Parenti", toPay: 165, toReceive: 0 },
  { name: "Jonatã Bessa", toPay: 135, toReceive: 217.5 },
  { name: "João Paulo", toPay: 240, toReceive: 157.5 },
  { name: "Leonardo Silva", toPay: 90, toReceive: 0 },
  { name: "Lucas Pivatto", toPay: 0, toReceive: 90 },
  { name: "Rafael Maguetas", toPay: 0, toReceive: 142.5 },
  { name: "Ruan Oliveira", toPay: 0, toReceive: 142.5 },
];

const transfers = [
  { from: "Emerson Nogueira", to: "Lucas Pivatto", amount: 90, paid: false },
  { from: "João Paulo", to: "Jonatã Bessa", amount: 82.5, paid: false },
  { from: "Adriano Diniz", to: "Estevam Palombi", amount: 75, paid: true },
  { from: "Leonardo Silva", to: "Rafael Maguetas", amount: 90, paid: false },
  { from: "Felipe Oliveira", to: "Ruan Oliveira", amount: 120, paid: false },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function FinanceiroPage() {
  const [selectedMonth, setSelectedMonth] = useState("jan2026");
  const [activeTab, setActiveTab] = useState<"report" | "transfers" | "trips">("report");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajuda de Transporte</h1>
        <p className="text-muted-foreground">
          Relatórios e transferências mensais
        </p>
      </div>

      {/* Month Selector */}
      <div className="flex flex-wrap gap-2">
        {months.map((month) => (
          <Button
            key={month.id}
            variant={selectedMonth === month.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMonth(month.id)}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            {month.label}
            {month.current && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-accent text-accent-foreground">
                Atual
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(990)}</p>
          <p className="text-sm text-muted-foreground">Total a Pagar</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(922.5)}</p>
          <p className="text-sm text-muted-foreground">Total a Receber</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{transfers.filter(t => !t.paid).length}</p>
          <p className="text-sm text-muted-foreground">Transferências Pendentes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("report")}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "report"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Relatório
        </button>
        <button
          onClick={() => setActiveTab("transfers")}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "transfers"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Transferências
        </button>
        <button
          onClick={() => setActiveTab("trips")}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "trips"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Viagens do Mês
        </button>
      </div>

      {/* Content */}
      {activeTab === "report" && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Relatório do Mês</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Betelita</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">A Pagar</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">A Receber</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Acerto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.map((row, idx) => {
                  const balance = row.toReceive - row.toPay;
                  return (
                    <motion.tr key={idx} variants={itemVariants} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                      <td className="px-4 py-3 text-right text-destructive">
                        {row.toPay > 0 ? formatCurrency(row.toPay) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-success">
                        {row.toReceive > 0 ? formatCurrency(row.toReceive) : "-"}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-right font-medium",
                        balance > 0 ? "text-success" : balance < 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {balance > 0 ? `+${formatCurrency(balance)}` : balance < 0 ? `-${formatCurrency(Math.abs(balance))}` : formatCurrency(0)}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === "transfers" && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {transfers.map((transfer, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className={cn(
                "bg-card rounded-xl border shadow-card p-4",
                transfer.paid ? "border-success/30 bg-success/5" : "border-border"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {transfer.paid ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20 shrink-0">
                      <Check className="h-4 w-4 text-success" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium text-foreground">{transfer.from}</span>
                      <span className="text-muted-foreground"> deve transferir </span>
                      <span className="font-semibold text-primary">{formatCurrency(transfer.amount)}</span>
                      <span className="text-muted-foreground"> para </span>
                      <span className="font-medium text-foreground">{transfer.to}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                  {!transfer.paid && (
                    <Button size="sm" variant="outline" className="gap-1">
                      <Check className="h-4 w-4" />
                      Pago
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {activeTab === "trips" && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-xl border border-border shadow-card">
          <Car className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-foreground">Lista de Viagens</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize todas as viagens realizadas no mês
          </p>
          <Button variant="outline" className="mt-4 gap-2">
            Ver viagens
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
