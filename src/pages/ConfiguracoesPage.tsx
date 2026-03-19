import { useState, useEffect } from "react";
import { Settings, Wallet, Bell, Shield, Database, Building2, Calendar, Clock, MessageSquare, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useCongregations } from "@/hooks/useCongregations";
import { useSelectedCongregation } from "@/contexts/CongregationContext";

const NOTIFICATION_MESSAGE_MAX_LENGTH = 150;

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const {
    isAdmin
  } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { congregations } = useCongregations();
  const { selectedCongregationId } = useSelectedCongregation();
  
  // Se não for admin nem super-admin, mostrar mensagem de acesso negado
  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Esta página está disponível apenas para administradores.
        </p>
      </div>
    );
  }
  
  const [defaultCongregationId, setDefaultCongregationId] = useState("");
  
  // Notification Settings
  const [notifMessage, setNotifMessage] = useState("");
  const [notifDays, setNotifDays] = useState<string[]>([]);
  const [notifTime, setNotifTime] = useState("08:00");
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Congregation-specific settings
  const [tripValue, setTripValue] = useState("15.00");
  const [showTransportHelp, setShowTransportHelp] = useState(true);
  const [maxPassengers, setMaxPassengers] = useState("4");
  const [tripLockEnabled, setTripLockEnabled] = useState(false);
  const [tripLockHours, setTripLockHours] = useState("2");

  const { profile } = useAuth();
  // Use selectedCongregationId from context for super-admin, profile congregation for regular admin
  const effectiveCongregationId = isSuperAdmin ? selectedCongregationId : profile?.congregation_id;

  // Load congregation-specific settings
  const {
    data: settings,
    isLoading
  } = useQuery({
    queryKey: ["settings", effectiveCongregationId],
    queryFn: async () => {
      if (!effectiveCongregationId) return null;
      const {
        data,
        error
      } = await supabase
        .from("settings")
        .select("*")
        .eq("congregation_id", effectiveCongregationId);
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCongregationId,
  });

  // Load default congregation for super-admin
  useEffect(() => {
    if (isSuperAdmin) {
      const loadDefaultCong = async () => {
        const { data, error } = await supabase
          .from("settings")
          .select("value, congregation_id, updated_at")
          .eq("key", "default_congregation_id")
          .order("updated_at", { ascending: false });

        if (error) {
          console.error("Erro ao carregar congregação padrão:", error);
          return;
        }

        // Prefer rows in the new format: value === congregation_id
        const defaultRow = (data ?? []).find((row) => row.value === row.congregation_id) ?? data?.[0];
        if (defaultRow?.value) {
          setDefaultCongregationId(defaultRow.value);
        }
      };
      loadDefaultCong();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (settings) {
      const tripVal = settings.find(s => s.key === "trip_value");
      if (tripVal) setTripValue(tripVal.value);
      
      const showTransport = settings.find(s => s.key === "show_transport_help");
      if (showTransport) setShowTransportHelp(showTransport.value === "true");
      
      const maxPass = settings.find(s => s.key === "max_passengers");
      if (maxPass) setMaxPassengers(maxPass.value);

      // ✅ Dentro do if(settings)
      const lockEnabled = settings.find(s => s.key === "trip_lock_enabled");
      if (lockEnabled) setTripLockEnabled(lockEnabled.value === "true");

      const lockHours = settings.find(s => s.key === "trip_lock_hours");
      if (lockHours) setTripLockHours(lockHours.value);

    } else if (effectiveCongregationId) {
      setTripValue("15.00");
      setShowTransportHelp(true);
      setMaxPassengers("4");
      setTripLockEnabled(false);
      setTripLockHours("2");
    }
  }, [settings, effectiveCongregationId]);

  const { data: notificationSettings, isLoading: isLoadingNotif } = useQuery({
    queryKey: ["notification-settings", effectiveCongregationId],
    queryFn: async () => {
      if (!effectiveCongregationId) return null;
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("congregation_id", effectiveCongregationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCongregationId,
  });

  useEffect(() => {
    if (notificationSettings) {
      setNotifMessage((notificationSettings.message || "").slice(0, NOTIFICATION_MESSAGE_MAX_LENGTH));
      setNotifDays(notificationSettings.scheduled_days?.map(String) || []);
      setNotifTime(notificationSettings.scheduled_time?.substring(0, 5) || "08:00");
      setNotifEnabled(notificationSettings.is_enabled);
    } else if (effectiveCongregationId) {
      // Reset to defaults when no settings exist for this congregation
      setNotifMessage("Não se esqueça de informar seus arranjos de transporte para a congregação.");
      setNotifDays([]);
      setNotifTime("08:00");
      setNotifEnabled(false);
    }
  }, [notificationSettings, effectiveCongregationId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveCongregationId) {
        throw new Error("Nenhuma congregação selecionada");
      }

      // Helper function to upsert a setting
      const upsertSetting = async (key: string, value: string, type: string) => {
        const { data: existing } = await supabase
          .from("settings")
          .select("id")
          .eq("key", key)
          .eq("congregation_id", effectiveCongregationId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("settings")
            .update({ value })
            .eq("key", key)
            .eq("congregation_id", effectiveCongregationId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("settings")
            .insert({
              key,
              value,
              type,
              congregation_id: effectiveCongregationId,
            });
          if (error) throw error;
        }
      };

      // Save all congregation-specific settings
      await upsertSetting("trip_value", tripValue, "decimal");
      await upsertSetting("show_transport_help", showTransportHelp.toString(), "boolean");
      await upsertSetting("max_passengers", maxPassengers, "integer");
      await upsertSetting("trip_lock_enabled", tripLockEnabled.toString(), "boolean");
      await upsertSetting("trip_lock_hours", tripLockHours, "integer");

      // Save default congregation ID for super-admin (global setting)
      if (isSuperAdmin && defaultCongregationId) {
        const { error: deleteDefaultError } = await supabase
          .from("settings")
          .delete()
          .eq("key", "default_congregation_id"); // ✅ .delete() antes do .eq()

        if (deleteDefaultError) throw deleteDefaultError;

        const { error: insertDefaultError } = await supabase
          .from("settings")
          .insert({
            key: "default_congregation_id",
            value: defaultCongregationId,
            type: "string",
            congregation_id: defaultCongregationId,
          });

        if (insertDefaultError) throw insertDefaultError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settings", effectiveCongregationId]
      });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: error => {
      toast.error("Erro ao salvar configurações");
      console.error(error);
    }
  });

  const saveNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveCongregationId) {
        toast.error("Selecione uma congregação primeiro");
        return;
      }

      const payload = {
        congregation_id: effectiveCongregationId,
        message: notifMessage.slice(0, NOTIFICATION_MESSAGE_MAX_LENGTH),
        scheduled_days: notifDays.map(Number),
        scheduled_time: notifTime + (notifTime.length === 5 ? ":00" : ""),
        is_enabled: notifEnabled,
      };

      console.log("Saving notification settings:", payload);

      // Check if settings exist for this congregation
      const { data: existing } = await supabase
        .from("notification_settings")
        .select("id")
        .eq("congregation_id", effectiveCongregationId)
        .maybeSingle();

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from("notification_settings")
          .update(payload)
          .eq("congregation_id", effectiveCongregationId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("notification_settings")
          .insert(payload);
        error = insertError;
      }

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notification-settings", effectiveCongregationId]
      });
      toast.success("Configurações de notificação salvas!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar notificações");
      console.error(error);
    }
  });

  return <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      {/* Automatic Notifications (Admin Only) */}
      {(isAdmin || isSuperAdmin) && (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">Notificações Automáticas</h2>
              <p className="text-sm text-muted-foreground">
                {isSuperAdmin && effectiveCongregationId
                  ? `Configurando: ${congregations?.find(c => c.id === effectiveCongregationId)?.name || 'Congregação'}`
                  : 'Lembrete semanal para a congregação'}
              </p>
            </div>
          </div>
          <div className="p-5 space-y-6">
            {!effectiveCongregationId && isSuperAdmin && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning-foreground">
                  Selecione uma congregação no topo da página para configurar as notificações.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <Label>Ativar envio automático</Label>
                <p className="text-sm text-muted-foreground">Enviar mensagem nos dias e horários definidos</p>
              </div>
              <Switch
                checked={notifEnabled}
                onCheckedChange={setNotifEnabled}
                disabled={!effectiveCongregationId}
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagem Padrão
              </Label>
              <Textarea
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value.slice(0, NOTIFICATION_MESSAGE_MAX_LENGTH))}
                placeholder="Digite a mensagem que será enviada..."
                className="min-h-[100px]"
                maxLength={NOTIFICATION_MESSAGE_MAX_LENGTH}
                disabled={!effectiveCongregationId}
              />
              <p className="text-xs text-muted-foreground text-right">
                {notifMessage.length}/{NOTIFICATION_MESSAGE_MAX_LENGTH} caracteres
              </p>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dias da Semana
              </Label>
              <ToggleGroup
                type="multiple"
                value={notifDays}
                onValueChange={setNotifDays}
                className="justify-start flex-wrap"
                disabled={!effectiveCongregationId}
              >
                <ToggleGroupItem value="0" aria-label="Domingo" className="w-10 h-10" disabled={!effectiveCongregationId}>D</ToggleGroupItem>
                <ToggleGroupItem value="1" aria-label="Segunda" className="w-10 h-10" disabled={!effectiveCongregationId}>S</ToggleGroupItem>
                <ToggleGroupItem value="2" aria-label="Terça" className="w-10 h-10" disabled={!effectiveCongregationId}>T</ToggleGroupItem>
                <ToggleGroupItem value="3" aria-label="Quarta" className="w-10 h-10" disabled={!effectiveCongregationId}>Q</ToggleGroupItem>
                <ToggleGroupItem value="4" aria-label="Quinta" className="w-10 h-10" disabled={!effectiveCongregationId}>Q</ToggleGroupItem>
                <ToggleGroupItem value="5" aria-label="Sexta" className="w-10 h-10" disabled={!effectiveCongregationId}>S</ToggleGroupItem>
                <ToggleGroupItem value="6" aria-label="Sábado" className="w-10 h-10" disabled={!effectiveCongregationId}>S</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário de Envio
              </Label>
              <Input
                type="time"
                value={notifTime}
                onChange={(e) => setNotifTime(e.target.value)}
                className="max-w-[150px]"
                disabled={!effectiveCongregationId}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveNotificationMutation.mutate()}
                disabled={saveNotificationMutation.isPending || !effectiveCongregationId}
              >
                {saveNotificationMutation.isPending ? "Salvando..." : "Salvar Configurações de Notificação"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Only */}
      {(isAdmin || isSuperAdmin) && <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-5 space-y-6">
            {!effectiveCongregationId && isSuperAdmin && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg mb-6">
                <p className="text-sm text-warning-foreground">
                  Selecione uma congregação no topo da página para configurar.
                </p>
              </div>
            )}
            
            {/* Transport Settings */}
            <div className="space-y-4 pb-6 border-b border-border">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-success" />
                <h3 className="font-semibold text-foreground">Ajuda de Transporte</h3>
                {isSuperAdmin && effectiveCongregationId && (
                  <span className="text-xs text-muted-foreground">
                    ({congregations?.find(c => c.id === effectiveCongregationId)?.name})
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tripValue">Valor por viagem (Ida e Volta)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="tripValue"
                    type="number"
                    value={tripValue}
                    onChange={(e) => setTripValue(e.target.value)}
                    step="0.50"
                    className="pl-10"
                    disabled={!effectiveCongregationId}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Viagens apenas de ida ou volta custam metade deste valor
                </p>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Exibir módulo de ajuda de transporte</Label>
                  <p className="text-sm text-muted-foreground">Mostrar seção financeira para todos os usuários</p>
                </div>
                <Switch
                  checked={showTransportHelp}
                  onCheckedChange={setShowTransportHelp}
                  disabled={!effectiveCongregationId}
                />
              </div>
            </div>

            {/* System Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-warning" />
                <h3 className="font-semibold text-foreground">Sistema</h3>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxPassengers">Máximo de passageiros por viagem</Label>
                <Input
                  id="maxPassengers"
                  type="number"
                  value={maxPassengers}
                  onChange={(e) => setMaxPassengers(e.target.value)}
                  min="1"
                  max="10"
                  disabled={!effectiveCongregationId}
                />
              </div>

            {/* Trip Lock Settings */}
            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-destructive" />
                <h3 className="font-semibold text-foreground">Bloqueio de Alterações de Viagem</h3>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="tripLockEnabled">Habilitar bloqueio</Label>
                  <p className="text-sm text-muted-foreground">
                    Impede que motoristas editem viagens próximas. Admins sempre podem editar.
                  </p>
                </div>
                <Switch
                  id="tripLockEnabled"
                  checked={tripLockEnabled}
                  onCheckedChange={setTripLockEnabled}
                  disabled={!effectiveCongregationId}
                />
              </div>

              {tripLockEnabled && (
                <div className="grid gap-2">
                  <Label htmlFor="tripLockHours">
                    Bloquear edições a partir de quantas horas antes da viagem?
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="tripLockHours"
                      type="number"
                      min="1"
                      max="72"
                      value={tripLockHours}
                      onChange={(e) => setTripLockHours(e.target.value)}
                      className="max-w-[100px]"
                      disabled={!effectiveCongregationId}
                    />
                    <span className="text-sm text-muted-foreground">horas antes da partida</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Motoristas não poderão editar a viagem dentro desse intervalo.
                    Apenas o admin poderá fazer alterações.
                  </p>
                </div>
              )}
            </div>

              {isSuperAdmin && (
                <div className="mt-6 pt-6 border-t border-border space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                      <Shield className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">Área Administrativa</h2>
                      <p className="text-sm text-muted-foreground">Apenas para super-admins</p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="defaultCongregation">Congregação Padrão para Super-Admin</Label>
                    <Select value={defaultCongregationId} onValueChange={setDefaultCongregationId}>
                      <SelectTrigger id="defaultCongregation">
                        <SelectValue placeholder="Selecione uma congregação..." />
                      </SelectTrigger>
                      <SelectContent>
                        {congregations && congregations.map((cong) => (
                          <SelectItem key={cong.id} value={cong.id}>
                            {cong.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Esta congregação será selecionada automaticamente ao fazer login
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>}
      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !effectiveCongregationId}
        >
          {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>;
}
