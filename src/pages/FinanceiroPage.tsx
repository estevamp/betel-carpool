import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, Calendar, Check, Copy, Car, Users, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useFinanceiro, getMonthOptions } from "@/hooks/useFinanceiro";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
const containerVariants = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};
const itemVariants = {
  hidden: {
    opacity: 0,
    y: 10
  },
  visible: {
    opacity: 1,
    y: 0
  }
};
export default function FinanceiroPage() {
  const months = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(months[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<"report" | "transfers" | "trips">("report");
  const {
    profileBalances,
    transfers,
    monthTrips,
    totalToPay,
    totalToReceive,
    pendingTransfers,
    isLoading,
    error,
    markAsPaid,
    isMarkingAsPaid,
    closeMonth,
    isClosingMonth,
    isAdmin,
    currentProfileId
  } = useFinanceiro(selectedMonth);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  const copyPixKey = (pixKey: string | null, name: string) => {
    if (!pixKey) {
      toast.error(`${name} não cadastrou chave PIX`);
      return;
    }
    navigator.clipboard.writeText(pixKey);
    toast.success("Chave PIX copiada!");
  };
  if (error) {
    return <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive">Erro ao carregar dados financeiros</p>
      </div>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ajuda de Transporte</h1>
          <p className="text-muted-foreground">
            Relatórios e transferências mensais
          </p>
        </div>
        {isAdmin && <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default" className="gap-2" disabled={isClosingMonth}>
                {isClosingMonth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Fechar Mês
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Fechar mês {months.find(m => m.id === selectedMonth)?.label}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá calcular todas as transações e transferências do mês baseado nas viagens registradas.
                  Os dados existentes para este mês serão recalculados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => closeMonth(selectedMonth)}>
                  Confirmar Fechamento
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>}
      </div>

      {/* Month Selector */}
      <div className="flex flex-wrap gap-2">
        {months.map(month => <Button key={month.id} variant={selectedMonth === month.id ? "default" : "outline"} size="sm" onClick={() => setSelectedMonth(month.id)} className="gap-2">
            <Calendar className="h-4 w-4" />
            {month.label}
            {month.current && <span className="px-1.5 py-0.5 rounded text-xs bg-accent text-accent-foreground">
                Atual
              </span>}
          </Button>)}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </div>
          {isLoading ? <Skeleton className="h-8 w-12 mb-1" /> : <p className="text-2xl font-bold text-foreground">{pendingTransfers}</p>}
          <p className="text-sm text-muted-foreground">Transferências Pendentes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {isAdmin && <button onClick={() => setActiveTab("report")} className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", activeTab === "report" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            Relatório
          </button>}
        <button onClick={() => setActiveTab("transfers")} className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", activeTab === "transfers" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          Transferências
        </button>
        <button onClick={() => setActiveTab("trips")} className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", activeTab === "trips" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          Viagens do Mês
        </button>
      </div>

      {/* Loading State */}
      {isLoading && <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>}

      {/* Report Tab - Admin Only */}
      {!isLoading && activeTab === "report" && isAdmin && <motion.div variants={containerVariants} initial="hidden" animate="visible" className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Relatório do Mês</h2>
          </div>
          {profileBalances.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground">Nenhuma transação</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Não há transações registradas para este mês
              </p>
            </div> : <div className="overflow-x-auto">
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
                  {profileBalances.map(row => {
              const balance = row.toReceive - row.toPay;
              return <motion.tr key={row.profileId} variants={itemVariants} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                        <td className="px-4 py-3 text-right text-destructive">
                          {row.toPay > 0 ? formatCurrency(row.toPay) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-success">
                          {row.toReceive > 0 ? formatCurrency(row.toReceive) : "-"}
                        </td>
                        <td className={cn("px-4 py-3 text-right font-medium", balance > 0 ? "text-success" : balance < 0 ? "text-destructive" : "text-muted-foreground")}>
                          {balance > 0 ? `+${formatCurrency(balance)}` : balance < 0 ? `-${formatCurrency(Math.abs(balance))}` : formatCurrency(0)}
                        </td>
                      </motion.tr>;
            })}
                </tbody>
              </table>
            </div>}
        </motion.div>}

      {/* Transfers Tab */}
      {!isLoading && activeTab === "transfers" && <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
          {transfers.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-xl border border-border shadow-card">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground">Nenhuma transferência</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Não há transferências pendentes para este mês
              </p>
            </div> : transfers.map(transfer => {
        const isDebtor = transfer.fromId === currentProfileId;
        const canMarkAsPaid = isDebtor || isAdmin;
        return <motion.div key={transfer.id} variants={itemVariants} className={cn("bg-card rounded-xl border shadow-card p-4", transfer.isPaid ? "border-success/30 bg-success/5" : "border-border")}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {transfer.isPaid ? <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20 shrink-0">
                          <Check className="h-4 w-4 text-success" />
                        </div> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                        </div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium text-foreground">{transfer.fromName}</span>
                          <span className="text-muted-foreground"> deve transferir </span>
                          <span className="font-semibold text-primary">{formatCurrency(transfer.amount)}</span>
                          <span className="text-muted-foreground"> para </span>
                          <span className="font-medium text-foreground">{transfer.toName}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyPixKey(transfer.pixKey, transfer.toName)} title="Copiar chave PIX">
                        <Copy className="h-4 w-4" />
                      </Button>
                      {!transfer.isPaid && canMarkAsPaid && <Button size="sm" variant="outline" className="gap-1" onClick={() => markAsPaid(transfer.id)} disabled={isMarkingAsPaid}>
                          {isMarkingAsPaid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Pago
                        </Button>}
                    </div>
                  </div>
                </motion.div>;
      })}
        </motion.div>}

      {/* Trips Tab */}
      {!isLoading && activeTab === "trips" && <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
          {monthTrips.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-xl border border-border shadow-card">
              <Car className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground">Nenhuma viagem</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Não há viagens registradas para este mês
              </p>
            </div> : monthTrips.map(trip => <motion.div key={trip.id} variants={itemVariants} className="bg-card rounded-xl border border-border shadow-card p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{trip.driverName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(trip.departureAt), "dd/MM 'às' HH:mm", {
                  locale: ptBR
                })}
                        {trip.returnAt && ` - ${format(new Date(trip.returnAt), "HH:mm")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{trip.passengerCount}</span>
                  </div>
                </div>
              </motion.div>)}
        </motion.div>}
    </div>;
}