import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCallback } from "react";
import type { Database } from "@/integrations/supabase/types";

export interface MonthOption {
  id: string;
  label: string;
  current: boolean;
}

import { useIsSuperAdmin } from "./useIsSuperAdmin";
import { useSelectedCongregation } from "@/contexts/CongregationContext";

export interface ProfileBalance {
  profileId: string;
  name: string;
  toPay: number;
  toReceive: number;
  congregationId: string | null;
}

export interface Transfer {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  isPaid: boolean;
  pixKey: string | null;
  congregationId: string | null;
}

type TripType = Database["public"]["Enums"]["trip_type"];
export const VISITANTE_PROFILE_ID = "00000000-0000-0000-0000-000000000001";

export interface MonthTripPassenger {
  id: string;
  passengerId: string;
  name: string;
  tripType: TripType;
}

export interface MonthTrip {
  id: string;
  driverId: string;
  driverName: string;
  departureAt: string;
  returnAt: string | null;
  maxPassengers: number | null;
  isActive: boolean | null;
  passengerCount: number;
  passengers: MonthTripPassenger[];
  congregationId: string | null;
}

// Generate month options (current + past 5 months)
export function getMonthOptions(): MonthOption[] {
  const now = new Date();
  const options: MonthOption[] = [];

  for (let i = 0; i < 6; i++) {
    const date = subMonths(now, i);
    const monthStr = format(date, "yyyy-MM");
    const label = format(date, "MMMM yyyy", { locale: ptBR });
    // Capitalize first letter
    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

    options.push({
      id: monthStr,
      label: capitalizedLabel,
      current: i === 0,
    });
  }

  return options;
}

export type TransferMode = "direct" | "optimized";

export function useFinanceiro(selectedMonth: string) {
  const { profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId } = useSelectedCongregation();

  // Parse month string to get date range
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));

  // Determine the effective congregation ID for filtering
  const effectiveCongregationId = isSuperAdmin ? selectedCongregationId : profile?.congregation_id;

  // Fetch all profiles for name mapping
  const profilesQuery = useQuery({
    queryKey: ["profiles", effectiveCongregationId],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, pix_key, congregation_id")
        .order("full_name", { ascending: true });

      if (effectiveCongregationId) {
        query = query.eq("congregation_id", effectiveCongregationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch transactions for the month
  const transactionsQuery = useQuery({
    queryKey: ["transactions", selectedMonth, effectiveCongregationId],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*")
        .eq("month", selectedMonth);

      if (effectiveCongregationId) {
        query = query.eq("congregation_id", effectiveCongregationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch transfers for the month
  const transfersQuery = useQuery({
    queryKey: ["transfers", selectedMonth, effectiveCongregationId],
    queryFn: async () => {
      let query = supabase
        .from("transfers")
        .select("*")
        .eq("month", selectedMonth);

      if (effectiveCongregationId) {
        query = query.eq("congregation_id", effectiveCongregationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch trips for the month
  const tripsQuery = useQuery({
    queryKey: ["trips-month", selectedMonth, effectiveCongregationId],
    queryFn: async () => {
      let query = supabase
        .from("trips")
        .select(`
          id,
          driver_id,
          departure_at,
          return_at,
          max_passengers,
          is_active,
          trip_passengers (
            id,
            passenger_id,
            trip_type,
            profiles (full_name)
          ),
          congregation_id
        `)
        .eq("is_active", true)
        .gte("departure_at", monthStart.toISOString())
        .lte("departure_at", monthEnd.toISOString())
        .order("departure_at", { ascending: true });

      if (effectiveCongregationId) {
        query = query.eq("congregation_id", effectiveCongregationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Calculate balances per profile from transactions
  const profileBalances: ProfileBalance[] = (() => {
    if (!transactionsQuery.data || !profilesQuery.data) return [];

    const balanceMap = new Map<string, { toPay: number; toReceive: number; congregationId: string | null }>();

    // Initialize all profiles
    profilesQuery.data.forEach((p) => {
      balanceMap.set(p.id, { toPay: 0, toReceive: 0, congregationId: p.congregation_id });
    });

    // Calculate from transactions
    transactionsQuery.data.forEach((t) => {
      const debtor = balanceMap.get(t.debtor_id);
      if (debtor) {
        debtor.toPay += Number(t.amount);
      }

      const creditor = balanceMap.get(t.creditor_id);
      if (creditor) {
        creditor.toReceive += Number(t.amount);
      }
    });

    // Convert to array with names
    const profileNameMap = new Map(
      profilesQuery.data.map((p) => [p.id, p.full_name])
    );

    return Array.from(balanceMap.entries())
      .map(([id, balance]) => ({
        profileId: id,
        name: profileNameMap.get(id) ?? "Desconhecido",
        toPay: balance.toPay,
        toReceive: balance.toReceive,
        congregationId: balance.congregationId,
      }))
      .filter((b) => b.toPay > 0 || b.toReceive > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  // Map transfers with names
  const transfers: Transfer[] = (() => {
    if (!transfersQuery.data || !profilesQuery.data) return [];

    const profileMap = new Map(
      profilesQuery.data.map((p) => [p.id, { name: p.full_name, pixKey: p.pix_key, congregationId: p.congregation_id }])
    );

    return transfersQuery.data.map((t) => ({
      id: t.id,
      fromId: t.debtor_id,
      fromName: profileMap.get(t.debtor_id)?.name ?? "Desconhecido",
      toId: t.creditor_id,
      toName: profileMap.get(t.creditor_id)?.name ?? "Desconhecido",
      amount: Number(t.amount),
      isPaid: t.is_paid ?? false,
      pixKey: profileMap.get(t.creditor_id)?.pixKey ?? null,
      congregationId: t.congregation_id,
    }));
  })();

  // Map trips with names
  const monthTrips: MonthTrip[] = (() => {
    if (!tripsQuery.data || !profilesQuery.data) return [];

    const profileNameMap = new Map(
      profilesQuery.data.map((p) => [p.id, p.full_name])
    );

    return tripsQuery.data.map((t) => ({
      id: t.id,
      driverId: t.driver_id,
      driverName: profileNameMap.get(t.driver_id) ?? "Desconhecido",
      departureAt: t.departure_at,
      returnAt: t.return_at,
      maxPassengers: t.max_passengers,
      isActive: t.is_active,
      passengerCount: t.trip_passengers?.length ?? 0,
      passengers: ((t.trip_passengers as any[])?.map((tp) => ({
        id: tp.id,
        passengerId: tp.passenger_id,
        name: tp.passenger_id === "00000000-0000-0000-0000-000000000001"
          ? "Visitante"
          : tp.profiles?.full_name ?? "Passageiro",
        tripType: (tp.trip_type ?? "Ida e Volta") as TripType
      })) ?? []).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      congregationId: t.congregation_id,
    }));
  })();

  // Calculate totals
  const totalToPay = profileBalances.reduce((sum, b) => sum + b.toPay, 0);
  const totalToReceive = profileBalances.reduce((sum, b) => sum + b.toReceive, 0);
  const pendingTransfers = transfers.filter((t) => !t.isPaid).length;

  const deleteTripMutation = useMutation({
    mutationFn: async (tripId: string) => {
      if (!isAdmin) throw new Error("Apenas administradores podem excluir viagens");
      const { error } = await supabase
        .from("trips")
        .update({ is_active: false })
        .eq("id", tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips-month", selectedMonth, effectiveCongregationId] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Viagem excluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir viagem: " + error.message);
    },
  });

  const addPassengerMutation = useMutation({
    mutationFn: async ({
      tripId,
      passengerId,
      tripType,
    }: {
      tripId: string;
      passengerId: string;
      tripType: TripType;
    }) => {
      if (!isAdmin) throw new Error("Apenas administradores podem editar passageiros");
      const { error } = await supabase.from("trip_passengers").insert({
        trip_id: tripId,
        passenger_id: passengerId,
        trip_type: tripType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips-month", selectedMonth, effectiveCongregationId] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Passageiro adicionado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar passageiro: " + error.message);
    },
  });

  const removePassengerMutation = useMutation({
    mutationFn: async ({ tripId, passengerId }: { tripId: string; passengerId: string }) => {
      if (!isAdmin) throw new Error("Apenas administradores podem editar passageiros");
      const { error } = await supabase
        .from("trip_passengers")
        .delete()
        .eq("trip_id", tripId)
        .eq("passenger_id", passengerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips-month", selectedMonth, effectiveCongregationId] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Passageiro removido com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover passageiro: " + error.message);
    },
  });

  // Mark transfer as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase
        .from("transfers")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("id", transferId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers", selectedMonth, effectiveCongregationId] });
      toast.success("Transferência marcada como paga!");
    },
    onError: (error: Error) => {
      console.error("Error marking transfer as paid:", error);
      toast.error("Erro ao marcar como paga: " + error.message);
    },
  });

  // Mark transfer as unpaid mutation
  const markAsUnpaidMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase
        .from("transfers")
        .update({ is_paid: false, paid_at: null })
        .eq("id", transferId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers", selectedMonth, effectiveCongregationId] });
      toast.success("Transferência marcada como pendente!");
    },
    onError: (error: Error) => {
      console.error("Error marking transfer as unpaid:", error);
      toast.error("Erro ao desfazer pagamento: " + error.message);
    },
  });

  // Close month mutation
const closeMonthMutation = useMutation({
    mutationFn: async ({
      month: monthToClose,
      transferMode,
    }: {
      month: string;
      transferMode: TransferMode;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) throw new Error("Não autenticado");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/close-month`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            month: monthToClose,
            congregation_id: effectiveCongregationId,
            transfer_mode: transferMode,        // ← novo campo
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao fechar mês");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions", selectedMonth, effectiveCongregationId] });
      queryClient.invalidateQueries({ queryKey: ["transfers", selectedMonth, effectiveCongregationId] });
      toast.success(data.message || "Mês fechado com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Error closing month:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao fechar mês");
    },
  });

  const closeMonth = useCallback(
    (monthToClose: string, transferMode: TransferMode) =>
      closeMonthMutation.mutate({ month: monthToClose, transferMode }),
    [closeMonthMutation]
  );

  // Delete month closure mutation
  const deleteMonthClosureMutation = useMutation({
    mutationFn: async (monthToDelete: string) => {
      if (!isAdmin) throw new Error("Apenas administradores podem excluir fechamento");

      console.log("Deleting month closure for:", monthToDelete, "congregation:", effectiveCongregationId);

      // First, check how many transfers exist
      let transfersCheckQuery = supabase
        .from("transfers")
        .select("id", { count: "exact", head: false })
        .eq("month", monthToDelete);

      if (effectiveCongregationId) {
        transfersCheckQuery = transfersCheckQuery.eq("congregation_id", effectiveCongregationId);
      }

      const { data: transfersCheck, count: transfersCountBefore } = await transfersCheckQuery;
      console.log("Transfers found before delete:", transfersCountBefore, transfersCheck);

      // Delete transfers for the month
      let transfersDeleteQuery = supabase
        .from("transfers")
        .delete()
        .eq("month", monthToDelete);

      if (effectiveCongregationId) {
        transfersDeleteQuery = transfersDeleteQuery.eq("congregation_id", effectiveCongregationId);
      }

      const { error: transfersError } = await transfersDeleteQuery;
      console.log("Transfers delete error:", transfersError);
      if (transfersError) throw transfersError;

      // Check how many transactions exist
      let transactionsCheckQuery = supabase
        .from("transactions")
        .select("id", { count: "exact", head: false })
        .eq("month", monthToDelete);

      if (effectiveCongregationId) {
        transactionsCheckQuery = transactionsCheckQuery.eq("congregation_id", effectiveCongregationId);
      }

      const { data: transactionsCheck, count: transactionsCountBefore } = await transactionsCheckQuery;
      console.log("Transactions found before delete:", transactionsCountBefore, transactionsCheck);

      // Delete transactions for the month
      let transactionsDeleteQuery = supabase
        .from("transactions")
        .delete()
        .eq("month", monthToDelete);

      if (effectiveCongregationId) {
        transactionsDeleteQuery = transactionsDeleteQuery.eq("congregation_id", effectiveCongregationId);
      }

      const { error: transactionsError } = await transactionsDeleteQuery;
      console.log("Transactions delete error:", transactionsError);
      if (transactionsError) throw transactionsError;

      return {
        transfersCount: transfersCountBefore || 0,
        transactionsCount: transactionsCountBefore || 0
      };
    },
    onSuccess: async (data) => {
      console.log("Delete success, invalidating queries...");
      
      // Invalidate queries to mark them as stale
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      
      console.log("Queries invalidated");
      
      toast.success(
        `Fechamento excluído: ${data.transfersCount} transferências e ${data.transactionsCount} transações removidas. Recarregue a página para ver as alterações.`,
        { duration: 5000 }
      );
      
      // Reload page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (error: Error) => {
      console.error("Error deleting month closure:", error);
      toast.error("Erro ao excluir fechamento: " + error.message);
    },
  });

  const deleteMonthClosure = useCallback(
    (monthToDelete: string) => deleteMonthClosureMutation.mutate(monthToDelete),
    [deleteMonthClosureMutation]
  );

  return {
    profiles: profilesQuery.data ?? [],
    profileBalances,
    transfers: transfers,
    monthTrips,
    totalToPay,
    totalToReceive,
    pendingTransfers,
    isLoading:
      profilesQuery.isLoading ||
      transactionsQuery.isLoading ||
      transfersQuery.isLoading ||
      tripsQuery.isLoading,
    error:
      profilesQuery.error ||
      transactionsQuery.error ||
      transfersQuery.error ||
      tripsQuery.error,
    markAsPaid: markAsPaidMutation.mutate,
    isMarkingAsPaid: markAsPaidMutation.isPending,
    markAsUnpaid: markAsUnpaidMutation.mutate,
    isMarkingAsUnpaid: markAsUnpaidMutation.isPending,
    closeMonth,
    isClosingMonth: closeMonthMutation.isPending,
    deleteMonthClosure,
    isDeletingMonthClosure: deleteMonthClosureMutation.isPending,
    deleteTrip: deleteTripMutation.mutate,
    isDeletingTrip: deleteTripMutation.isPending,
    addPassenger: addPassengerMutation.mutate,
    isAddingPassenger: addPassengerMutation.isPending,
    removePassenger: removePassengerMutation.mutate,
    isRemovingPassenger: removePassengerMutation.isPending,
    isAdmin,
    isSuperAdmin,
    currentProfileId: profile?.id,
  };
}
