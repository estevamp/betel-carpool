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

// Custos fixos por viagem — mesma referência da Edge Function close-month
const ROUND_TRIP_COST = 15.0;
const ONE_WAY_COST = 7.5;

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
  isBetelCar: boolean | null;
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

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));

  const effectiveCongregationId = isSuperAdmin ? selectedCongregationId : profile?.congregation_id;

  // Fetch all profiles for name mapping
  // Inclui campos usados no cálculo de débitos (sexo, casamento, isenção)
  const profilesQuery = useQuery({
    queryKey: ["profiles", effectiveCongregationId],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, pix_key, congregation_id, sex, is_married, is_exempt, spouse_id")
        .order("full_name", { ascending: true });

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
          is_betel_car,
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

  // ── Relatório em tempo real (mesma lógica da close-month, sem salvar nada) ──
  const liveProfileBalances: ProfileBalance[] = (() => {
    if (!tripsQuery.data || !profilesQuery.data) return [];

    const profileMap = new Map(profilesQuery.data.map((p) => [p.id, p]));

    // rawDebts: debtorId → driverId → valor total acumulado
    const rawDebts = new Map<string, Map<string, number>>();

    for (const trip of tripsQuery.data) {
      // Skip betel car trips — no cost charged
      if ((trip as any).is_betel_car) continue;

      for (const tp of ((trip.trip_passengers as any[]) ?? [])) {
        // Skip if passenger is the driver themselves
        if (tp.passenger_id === trip.driver_id) continue;

        const passengerProfile = profileMap.get(tp.passenger_id) as any;
        // Skip unknown/visitante passengers (not in congregation profile map)
        if (!passengerProfile) continue;
        // Skip exempt passengers
        if (passengerProfile.is_exempt) continue;

        const cost =
          tp.trip_type === "Ida e Volta" ? ROUND_TRIP_COST : ONE_WAY_COST;

        // Dívidas de mulheres casadas vão para o marido
        let debtorId = tp.passenger_id;
        if (
          passengerProfile.sex === "Mulher" &&
          passengerProfile.is_married &&
          passengerProfile.spouse_id
        ) {
          debtorId = passengerProfile.spouse_id;
        }

        // Após redirecionamento para cônjuge, ignorar se o devedor é o próprio motorista (auto-dívida)
        if (debtorId === trip.driver_id) continue;

        if (!rawDebts.has(debtorId)) rawDebts.set(debtorId, new Map());
        const creditorMap = rawDebts.get(debtorId)!;
        creditorMap.set(
          trip.driver_id,
          (creditorMap.get(trip.driver_id) ?? 0) + cost
        );
      }
    }

    // Converter rawDebts → saldos individuais
    const balanceMap = new Map<string, { toPay: number; toReceive: number }>();

    for (const [debtorId, creditorMap] of rawDebts) {
      for (const [creditorId, amount] of creditorMap) {
        if (!balanceMap.has(debtorId))
          balanceMap.set(debtorId, { toPay: 0, toReceive: 0 });
        balanceMap.get(debtorId)!.toPay += amount;

        if (!balanceMap.has(creditorId))
          balanceMap.set(creditorId, { toPay: 0, toReceive: 0 });
        balanceMap.get(creditorId)!.toReceive += amount;
      }
    }

    return Array.from(balanceMap.entries())
      .map(([id, balance]) => ({
        profileId: id,
        name: profileMap.get(id)?.full_name ?? "Desconhecido",
        toPay: balance.toPay,
        toReceive: balance.toReceive,
        congregationId: profileMap.get(id)?.congregation_id ?? null,
      }))
      .filter((b) => b.toPay > 0 || b.toReceive > 0)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  })();

  // Map transfers with names
  const transfers: Transfer[] = (() => {
    if (!transfersQuery.data || !profilesQuery.data) return [];

    const profileMap = new Map(
      profilesQuery.data.map((p) => [
        p.id,
        {
          name: p.full_name,
          pixKey: p.pix_key,
          congregationId: p.congregation_id,
          spouseId: p.spouse_id ?? null,
        },
      ])
    );

    return transfersQuery.data
      .filter((t) => {
        // Remove transferências intrafamiliares (mesma pessoa ou entre cônjuges)
        if (t.debtor_id === t.creditor_id) return false;
        const debtorSpouse = profileMap.get(t.debtor_id)?.spouseId;
        const creditorSpouse = profileMap.get(t.creditor_id)?.spouseId;
        if (debtorSpouse === t.creditor_id) return false;
        if (creditorSpouse === t.debtor_id) return false;
        return true;
      })
      .map((t) => ({
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

    const profileNameMap = new Map(profilesQuery.data.map((p) => [p.id, p.full_name]));

    return tripsQuery.data.map((t) => ({
      id: t.id,
      driverId: t.driver_id,
      driverName: profileNameMap.get(t.driver_id) ?? "Desconhecido",
      departureAt: t.departure_at,
      returnAt: t.return_at,
      maxPassengers: t.max_passengers,
      isActive: t.is_active,
      isBetelCar: t.is_betel_car,
      passengerCount: t.trip_passengers?.length ?? 0,
      passengers: ((t.trip_passengers as any[])?.map((tp) => ({
        id: tp.id,
        passengerId: tp.passenger_id,
        name: tp.passenger_id === "00000000-0000-0000-0000-000000000001"
          ? "Visitante"
          : tp.profiles?.full_name ?? "Passageiro",
        tripType: (tp.trip_type ?? "Ida e Volta") as TripType,
      })) ?? []).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      congregationId: t.congregation_id,
    }));
  })();

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
            transfer_mode: transferMode,
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

      const { count: transfersCountBefore } = await supabase
        .from("transfers")
        .select("id", { count: "exact", head: false })
        .eq("month", monthToDelete)
        .eq("congregation_id", effectiveCongregationId!);

      const { error: transfersError } = await supabase
        .from("transfers")
        .delete()
        .eq("month", monthToDelete)
        .eq("congregation_id", effectiveCongregationId!);

      if (transfersError) throw transfersError;

      return {
        transfersCount: transfersCountBefore || 0,
      };
    },
    onSuccess: async (data, monthToDelete) => {
      await queryClient.cancelQueries({ queryKey: ["transfers", monthToDelete] });

      queryClient.setQueriesData<unknown[]>({ queryKey: ["transfers", monthToDelete] }, []);

      toast.success(
        `Fechamento excluído: ${data.transfersCount} transferências removidas`
      );

      await queryClient.refetchQueries({ queryKey: ["transfers", monthToDelete] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir fechamento: " + error.message);
    },
  });

  const deleteMonthClosure = useCallback(
    (monthToDelete: string) => deleteMonthClosureMutation.mutate(monthToDelete),
    [deleteMonthClosureMutation]
  );

  return {
    profiles: profilesQuery.data ?? [],
    liveProfileBalances,
    transfers,
    monthTrips,
    pendingTransfers,
    isLoading:
      profilesQuery.isLoading ||
      transfersQuery.isLoading ||
      tripsQuery.isLoading,
    error:
      profilesQuery.error ||
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