import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useSelectedCongregation } from "@/contexts/CongregationContext";

export interface TripLockSettings {
  enabled: boolean;
  lockHours: number;
}

/**
 * Retorna as configurações de bloqueio de viagens da congregação atual.
 *
 * - `isLocked(departureAt)` → true quando a viagem está bloqueada para
 *   usuários comuns (baseado no horário de partida e na janela configurada).
 * - Admins e super-admins nunca são bloqueados — use `isLockedForUser` para
 *   aplicar a distinção automaticamente.
 */
export function useTripLock() {
  const { profile, isAdmin } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { selectedCongregationId } = useSelectedCongregation();

  const congregationId = isSuperAdmin
    ? selectedCongregationId
    : profile?.congregation_id;

  const { data: settings } = useQuery<TripLockSettings>({
    queryKey: ["trip-lock-settings", congregationId],
    queryFn: async () => {
      if (!congregationId) return { enabled: false, lockHours: 2 };

      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .eq("congregation_id", congregationId)
        .in("key", ["trip_lock_enabled", "trip_lock_hours"]);

      if (error) throw error;

      const enabled =
        data?.find((s) => s.key === "trip_lock_enabled")?.value === "true";
      const lockHours = parseInt(
        data?.find((s) => s.key === "trip_lock_hours")?.value ?? "2",
        10,
      );

      return { enabled, lockHours };
    },
    enabled: !!congregationId,
    staleTime: 60_000, // re-fetch a cada 1 min
  });

  const lockSettings: TripLockSettings = settings ?? {
    enabled: false,
    lockHours: 2,
  };

  /**
   * Retorna true se a viagem está dentro da janela de bloqueio
   * (independente do papel do usuário).
   */
  const isTripLocked = (departureAt: string): boolean => {
    if (!lockSettings.enabled) return false;
    const departure = new Date(departureAt);
    const diffMs = departure.getTime() - Date.now();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours <= lockSettings.lockHours;
  };

  /**
   * Retorna true se o usuário ATUAL não pode editar a viagem.
   * Admins e super-admins sempre podem editar.
   */
  const isLockedForUser = (departureAt: string): boolean => {
    if (isAdmin || isSuperAdmin) return false;
    return isTripLocked(departureAt);
  };

  return {
    lockSettings,
    isTripLocked,
    isLockedForUser,
  };
}