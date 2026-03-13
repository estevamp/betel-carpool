import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet, TrendingUp, TrendingDown, RotateCcw, Calendar, Check, Copy,
  Car, Users, Loader2, Lock, ChevronDown, ChevronUp,
  ArrowRight, ArrowLeft, ArrowLeftRight, Trash2, UserPlus, X, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useFinanceiro, getMonthOptions, VISITANTE_PROFILE_ID,
  type MonthTrip, type TransferMode,
} from "@/hooks/useFinanceiro";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type TripType = Database["public"]["Enums"]["trip_type"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const months = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(months[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<"report" | "transfers" | "trips">("transfers");
  const [transferMode, setTransferMode] = useState<TransferMode>("direct"); // ← aqui, não no TripAccordionItem

  const {
    profiles,
    profileBalances,
    liveProfileBalances,
    transfers,
    monthTrips,
    pendingTransfers,
    isLoading,
    error,
    markAsPaid,
    isMarkingAsPaid,
    markAsUnpaid,
    isMarkingAsUnpaid,
    closeMonth,
    isClosingMonth,
    deleteMonthClosure,
    isDeletingMonthClosure,
    deleteTrip,
    isDeletingTrip,
    addPassenger,
    isAddingPassenger,
    removePassenger,
    isRemovingPassenger,
    isAdmin,
    currentProfileId,
  } = useFinanceiro(selectedMonth);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const copyPixKey = (pixKey: string | null, name: string) => {
    if (!pixKey) { toast.error(`${name} não cadastrou chave PIX`); return; }
    navigator.clipboard.writeText(pixKey);
    toast.success("Chave PIX copiada!");
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive">Erro ao carregar dados financeiros</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ajuda de Transporte</h1>
          <p className="text-muted-foreground">Relatórios e transferências mensais</p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" className="gap-2" disabled={isClosingMonth}>
                  {isClosingMonth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Fechar Mês
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Fechar mês {months.find((m) => m.id === selectedMonth)?.label}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá calcular todas as transações e transferências do mês
                    com base nas viagens registradas. Os dados existentes serão recalculados.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {/* Mode selector */}
                <div className="space-y-3 py-2">
                  <p className="text-sm font-medium text-foreground">Modo de transferência</p>
                  <div className="grid grid-cols-1 gap-2">
                    {(["direct", "optimized"] as TransferMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setTransferMode(mode)}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                          transferMode === mode
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center",
                            transferMode === mode ? "border-primary" : "border-muted-foreground"
                          )}
                        >
                          {transferMode === mode && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {mode === "direct" ? "Direto" : "Otimizado"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {mode === "direct"
                              ? "Cada pessoa paga exatamente quem a levou. Mais transparente e intuitivo, porém com mais transferências."
                              : "Minimiza o número de transferências consolidando dívidas entre grupos conectados. O valor total é o mesmo, mas o destinatário pode ser diferente do motorista."}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => closeMonth(selectedMonth, transferMode)}>
                    Confirmar Fechamento
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2" disabled={isDeletingMonthClosure}>
                  {isDeletingMonthClosure ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Excluir Fechamento
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Excluir fechamento do mês {months.find((m) => m.id === selectedMonth)?.label}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover todas as transações e transferências calculadas para este mês.
                    As viagens não serão afetadas. Você poderá fechar o mês novamente quando desejar.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMonthClosure(selectedMonth)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Confirmar Exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
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

      {/* Summary Card */}
      <div data-tour="fechamento-mes" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </div>
          {isLoading
            ? <Skeleton className="h-8 w-12 mb-1" />
            : <p className="text-2xl font-bold text-foreground">{pendingTransfers}</p>
          }
          <p className="text-sm text-muted-foreground">Transferências Pendentes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-full overflow-x-auto">
        {isAdmin && (
          <button
            onClick={() => setActiveTab("report")}
            className={cn(
              "shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === "report" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Relatório
          </button>
        )}
        <button
          onClick={() => setActiveTab("transfers")}
          className={cn(
            "shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "transfers" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Transferências
        </button>
        <button
          onClick={() => setActiveTab("trips")}
          className={cn(
            "shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "trips" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Viagens do Mês
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

     {/* Report Tab — dados em tempo real, sem precisar de fechamento */}
      {!isLoading && activeTab === "report" && isAdmin && (
        <motion.div
          variants={containerVariants} initial="hidden" animate="visible"
          className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Relatório do Mês</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Calculado em tempo real com base nas viagens registradas
              </p>
            </div>
            {/* Badge indicando que é live */}
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Tempo real
            </span>
          </div>
    
          {liveProfileBalances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground">Nenhuma viagem com custo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Não há viagens pagas registradas para este mês
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Betelita</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">A Pagar</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">A Receber</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Acerto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {liveProfileBalances.map((row) => {
                    const balance = row.toReceive - row.toPay;
                    return (
                      <motion.tr key={row.profileId} variants={itemVariants} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-xs font-medium text-foreground">{row.name}</td>
                        <td className="px-3 py-2 text-xs text-right text-destructive">
                          {row.toPay > 0 ? formatCurrency(row.toPay) : "-"}
                        </td>
                        <td className="px-3 py-2 text-xs text-right text-success">
                          {row.toReceive > 0 ? formatCurrency(row.toReceive) : "-"}
                        </td>
                        <td className={cn(
                          "px-3 py-2 text-xs text-right font-medium",
                          balance > 0 ? "text-success" : balance < 0 ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {balance > 0
                            ? `+${formatCurrency(balance)}`
                            : balance < 0
                            ? `-${formatCurrency(Math.abs(balance))}`
                            : formatCurrency(0)}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* Transfers Tab */}
      {!isLoading && activeTab === "transfers" && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
          {transfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-xl border border-border shadow-card">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground">Nenhuma transferência</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedMonth === months[0]?.id && monthTrips.length > 0
                  ? "As transferências ficarão disponíveis quando o mês for finalizado"
                  : "Não há transferências para este mês"}
              </p>
            </div>
          ) : transfers.map((transfer) => {
            const isDebtor = transfer.fromId === currentProfileId;
            const canMarkAsPaid = isDebtor || isAdmin;
            return (
              <motion.div
                key={transfer.id}
                variants={itemVariants}
                className={cn(
                  "bg-card rounded-xl border shadow-card p-4",
                  transfer.isPaid ? "border-success/30 bg-success/5" : "border-border"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {transfer.isPaid ? (
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
                        <span className="font-medium text-foreground">{transfer.fromName}</span>
                        <span className="text-muted-foreground"> deve transferir </span>
                        <span className="font-semibold text-primary">{formatCurrency(transfer.amount)}</span>
                        <span className="text-muted-foreground"> para </span>
                        <span className="font-medium text-foreground">{transfer.toName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => copyPixKey(transfer.pixKey, transfer.toName)}
                      title="Copiar chave PIX"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {!transfer.isPaid && canMarkAsPaid && (
                      <Button
                        size="sm" variant="outline" className="gap-1"
                        onClick={() => markAsPaid(transfer.id)}
                        disabled={isMarkingAsPaid}
                      >
                        {isMarkingAsPaid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Pago
                      </Button>
                    )}
                    {transfer.isPaid && canMarkAsPaid && (
                      <Button
                        size="sm" variant="ghost"
                        className="gap-1 text-muted-foreground hover:text-destructive"
                        onClick={() => markAsUnpaid(transfer.id)}
                        disabled={isMarkingAsUnpaid}
                        title="Desfazer pagamento"
                      >
                        {isMarkingAsUnpaid ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Desfazer
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Trips Tab */}
      {!isLoading && activeTab === "trips" && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
          {isAdmin && selectedMonth !== months[0]?.id && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-900/90">
                Se editar ou excluir uma viagem deste mês, feche o mês novamente para recalcular os valores.
              </p>
            </div>
          )}
          {monthTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-xl border border-border shadow-card">
              <Car className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground">Nenhuma viagem</h3>
              <p className="text-sm text-muted-foreground mt-1">Não há viagens registradas para este mês</p>
            </div>
          ) : monthTrips.map((trip) => (
            <TripAccordionItem
              key={trip.id}
              trip={trip}
              profiles={profiles}
              isAdmin={isAdmin}
              onDeleteTrip={deleteTrip}
              onAddPassenger={addPassenger}
              onRemovePassenger={removePassenger}
              isDeletingTrip={isDeletingTrip}
              isAddingPassenger={isAddingPassenger}
              isRemovingPassenger={isRemovingPassenger}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function TripAccordionItem({
  trip,
  profiles,
  isAdmin,
  onDeleteTrip,
  onAddPassenger,
  onRemovePassenger,
  isDeletingTrip,
  isAddingPassenger,
  isRemovingPassenger,
}: {
  trip: MonthTrip;
  profiles: Array<{ id: string; full_name: string }>;
  isAdmin: boolean;
  onDeleteTrip: (tripId: string) => void;
  onAddPassenger: (data: { tripId: string; passengerId: string; tripType: TripType }) => void;
  onRemovePassenger: (data: { tripId: string; passengerId: string }) => void;
  isDeletingTrip: boolean;
  isAddingPassenger: boolean;
  isRemovingPassenger: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [addPassengerDialogOpen, setAddPassengerDialogOpen] = useState(false);
  const [selectedPassengerId, setSelectedPassengerId] = useState("");
  const [selectedTripType, setSelectedTripType] = useState<TripType>("Ida e Volta");

  const availableSeats = (trip.maxPassengers ?? 4) - trip.passengerCount;
  const isFull = availableSeats <= 0;

  const existingPassengerIds = new Set(trip.passengers.map((p) => p.passengerId));
  const availableProfiles = profiles
    .filter((p) => p.id !== trip.driverId && !existingPassengerIds.has(p.id))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));

  const getTripTypeIcon = (type: string) => {
    switch (type) {
      case "Apenas Ida":    return <ArrowRight className="h-3 w-3" />;
      case "Apenas Volta":  return <ArrowLeft className="h-3 w-3" />;
      default:              return <ArrowLeftRight className="h-3 w-3" />;
    }
  };

  const getTripTypeColor = (type: string) => {
    switch (type) {
      case "Apenas Ida":    return "text-blue-500 bg-blue-500/10";
      case "Apenas Volta":  return "text-orange-500 bg-orange-500/10";
      default:              return "text-success bg-success/10";
    }
  };

  const handleAddPassenger = () => {
    if (!selectedPassengerId) return;
    onAddPassenger({
      tripId: trip.id,
      passengerId: selectedPassengerId === "visitante" ? VISITANTE_PROFILE_ID : selectedPassengerId,
      tripType: selectedTripType,
    });
    setAddPassengerDialogOpen(false);
    setSelectedPassengerId("");
    setSelectedTripType("Ida e Volta");
  };

  return (
    <motion.div variants={itemVariants} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-3 sm:p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground break-words">{trip.driverName}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(trip.departureAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                {trip.returnAt && ` - ${format(new Date(trip.returnAt), "HH:mm")}`}
              </p>
            </div>
          </div>

          <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2 sm:gap-3">
            {isAdmin && (
              <div className="ml-auto sm:ml-0 flex flex-wrap items-center justify-end gap-2">
                {!isFull && (
                  <Dialog open={addPassengerDialogOpen} onOpenChange={setAddPassengerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline" size="sm" className="gap-1 w-full sm:w-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <UserPlus className="h-3 w-3" />
                        Adicionar
                      </Button>
                    </DialogTrigger>
                    <DialogContent onClick={(e) => e.stopPropagation()}>
                      <DialogHeader>
                        <DialogTitle>Adicionar Passageiro</DialogTitle>
                        <DialogDescription>Selecione um passageiro para adicionar à viagem.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label>Passageiro</Label>
                          <Select value={selectedPassengerId} onValueChange={setSelectedPassengerId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um passageiro" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              {availableProfiles.map((profile) => (
                                <SelectItem key={profile.id} value={profile.id}>
                                  {profile.full_name}
                                </SelectItem>
                              ))}
                              <SelectItem value="visitante">Visitante</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Tipo de Viagem</Label>
                          <RadioGroup
                            value={selectedTripType}
                            onValueChange={(v) => setSelectedTripType(v as TripType)}
                            className="flex gap-4"
                          >
                            {(["Ida e Volta", "Apenas Ida", "Apenas Volta"] as TripType[]).map((t) => (
                              <div key={t} className="flex items-center space-x-2">
                                <RadioGroupItem value={t} id={`financeiro-${t}-${trip.id}`} />
                                <Label htmlFor={`financeiro-${t}-${trip.id}`} className="font-normal">{t}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAddPassengerDialogOpen(false);
                            setSelectedPassengerId("");
                            setSelectedTripType("Ida e Volta");
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button onClick={handleAddPassenger} disabled={isAddingPassenger || !selectedPassengerId}>
                          {isAddingPassenger ? "Adicionando..." : "Adicionar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                <Button
                  variant="destructive" size="sm" className="gap-1 w-full sm:w-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Tem certeza que deseja excluir esta viagem?")) onDeleteTrip(trip.id);
                  }}
                  disabled={isDeletingTrip}
                >
                  {isDeletingTrip ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Excluir
                </Button>
              </div>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{trip.passengerCount}/{trip.maxPassengers ?? 4}</span>
            </div>
            {isExpanded
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            }
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border/50 bg-muted/10">
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passageiros</p>
            {trip.passengers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum passageiro registrado</p>
            ) : (
              <div className="grid gap-2">
                {trip.passengers.map((passenger) => (
                  <div
                    key={passenger.id}
                    className="flex items-center justify-between bg-background/50 p-2 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{passenger.name}</span>
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        getTripTypeColor(passenger.tripType)
                      )}>
                        {getTripTypeIcon(passenger.tripType)}
                        {passenger.tripType}
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemovePassenger({ tripId: trip.id, passengerId: passenger.passengerId })}
                        disabled={isRemovingPassenger}
                        title="Remover passageiro"
                      >
                        {isRemovingPassenger ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}