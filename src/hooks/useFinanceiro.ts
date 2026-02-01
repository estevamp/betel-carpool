import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCallback } from "react";

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

export interface MonthTrip {
  id: string;
  driverName: string;
  departureAt: string;
  returnAt: string | null;
  passengerCount: number;
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

export function useFinanceiro(selectedMonth: string) {
  const { profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId } = useSelectedCongregation();

  // Parse month string to get date range
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));

  // Fetch all profiles for name mapping
  const profilesQuery = useQuery({
    queryKey: ["profiles", selectedCongregationId],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, pix_key, congregation_id");

      if (isSuperAdmin && selectedCongregationId) {
        query = query.eq("congregation_id", selectedCongregationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch transactions for the month
  const transactionsQuery = useQuery({
    queryKey: ["transactions", selectedMonth, selectedCongregationId],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*")
        .eq("month", selectedMonth);

      if (isSuperAdmin && selectedCongregationId) {
        query = query.eq("congregation_id", selectedCongregationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch transfers for the month
  const transfersQuery = useQuery({
    queryKey: ["transfers", selectedMonth, selectedCongregationId],
    queryFn: async () => {
      let query = supabase
        .from("transfers")
        .select("*")
        .eq("month", selectedMonth);

      if (isSuperAdmin && selectedCongregationId) {
        query = query.eq("congregation_id", selectedCongregationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch trips for the month
  const tripsQuery = useQuery({
    queryKey: ["trips-month", selectedMonth, selectedCongregationId],
    queryFn: async () => {
      let query = supabase
        .from("trips")
        .select(`
          id,
          driver_id,
          departure_at,
          return_at,
          trip_passengers (id),
          congregation_id
        `)
        .gte("departure_at", monthStart.toISOString())
        .lte("departure_at", monthEnd.toISOString())
        .order("departure_at", { ascending: true });

      if (isSuperAdmin && selectedCongregationId) {
        query = query.eq("congregation_id", selectedCongregationId);
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
      driverName: profileNameMap.get(t.driver_id) ?? "Desconhecido",
      departureAt: t.departure_at,
      returnAt: t.return_at,
      passengerCount: t.trip_passengers?.length ?? 0,
      congregationId: t.congregation_id,
    }));
  })();

  // Calculate totals
  const totalToPay = profileBalances.reduce((sum, b) => sum + b.toPay, 0);
  const totalToReceive = profileBalances.reduce((sum, b) => sum + b.toReceive, 0);
  const pendingTransfers = transfers.filter((t) => !t.isPaid).length;

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
      queryClient.invalidateQueries({ queryKey: ["transfers", selectedMonth, selectedCongregationId] });
      toast.success("Transferência marcada como paga!");
    },
    onError: (error: Error) => {
      console.error("Error marking transfer as paid:", error);
      toast.error("Erro ao marcar como paga: " + error.message);
    },
  });

  // Close month mutation
  const closeMonthMutation = useMutation({
    mutationFn: async (monthToClose: string) => {
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
          body: JSON.stringify({ month: monthToClose, congregation_id: isSuperAdmin ? selectedCongregationId : profile?.congregation_id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao fechar mês");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions", selectedMonth, selectedCongregationId] });
      queryClient.invalidateQueries({ queryKey: ["transfers", selectedMonth, selectedCongregationId] });
      toast.success(data.message || "Mês fechado com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Error closing month:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao fechar mês");
    },
  });

  const closeMonth = useCallback(
    (monthToClose: string) => closeMonthMutation.mutate(monthToClose),
    [closeMonthMutation]
  );

  return {
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
    closeMonth,
    isClosingMonth: closeMonthMutation.isPending,
    isAdmin,
    isSuperAdmin,
    currentProfileId: profile?.id,
  };
}
