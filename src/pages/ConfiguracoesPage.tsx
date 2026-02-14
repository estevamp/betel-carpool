import { useState, useEffect } from "react";
import { Settings, Wallet, Bell, Shield, Database, Building2, Calendar, Clock, MessageSquare } from "lucide-react";
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
export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const {
    isAdmin
  } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { congregations } = useCongregations();
  
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
  
  const [congregationName, setCongregationName] = useState("");
  const [defaultCongregationId, setDefaultCongregationId] = useState("");
  
  // Notification Settings
  const [notifMessage, setNotifMessage] = useState("");
  const [notifDays, setNotifDays] = useState<string[]>([]);
  const [notifTime, setNotifTime] = useState("08:00");
  const [notifEnabled, setNotifEnabled] = useState(false);

  const { profile } = useAuth();
  const effectiveCongregationId = isSuperAdmin ? defaultCongregationId : profile?.congregation_id;

  const {
    data: settings,
    isLoading
  } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("settings").select("*");
      if (error) throw error;
      return data;
    }
  });
  useEffect(() => {
    if (settings) {
      const congregation = settings.find(s => s.key === "congregation_name");
      if (congregation) {
        setCongregationName(congregation.value);
      }
      const defaultCong = settings.find(s => s.key === "default_congregation_id");
      if (defaultCong) {
        setDefaultCongregationId(defaultCong.value);
      }
    }
  }, [settings]);

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
      setNotifMessage(notificationSettings.message);
      setNotifDays(notificationSettings.scheduled_days?.map(String) || []);
      setNotifTime(notificationSettings.scheduled_time?.substring(0, 5) || "08:00");
      setNotifEnabled(notificationSettings.is_enabled);
    }
  }, [notificationSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save congregation name
      const {
        data: existing
      } = await supabase.from("settings").select("id").eq("key", "congregation_name").maybeSingle();
      if (existing) {
        const {
          error
        } = await supabase.from("settings").update({
          value: congregationName
        }).eq("key", "congregation_name");
        if (error) throw error;
      } else {
        const {
          error
        } = await supabase.from("settings").insert({
          key: "congregation_name",
          value: congregationName,
          type: "string"
        });
        if (error) throw error;
      }

      // Save default congregation ID
      const {
        data: existingDefault
      } = await supabase.from("settings").select("id").eq("key", "default_congregation_id").maybeSingle();
      if (existingDefault) {
        const {
          error
        } = await supabase.from("settings").update({
          value: defaultCongregationId
        }).eq("key", "default_congregation_id");
        if (error) throw error;
      } else if (defaultCongregationId) {
        const {
          error
        } = await supabase.from("settings").insert({
          key: "default_congregation_id",
          value: defaultCongregationId,
          type: "string"
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settings"]
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
        message: notifMessage,
        scheduled_days: notifDays.map(Number),
        scheduled_time: notifTime + (notifTime.length === 5 ? ":00" : ""),
        is_enabled: notifEnabled,
      };

      console.log("Saving notification settings:", payload);

      const { error } = await supabase
        .from("notification_settings")
        .upsert(payload, { onConflict: 'congregation_id' });

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
            <div>
              <h2 className="font-semibold text-foreground">Notificações Automáticas</h2>
              <p className="text-sm text-muted-foreground">Lembrete semanal para a congregação</p>
            </div>
          </div>
          <div className="p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Ativar envio automático</Label>
                <p className="text-sm text-muted-foreground">Enviar mensagem nos dias e horários definidos</p>
              </div>
              <Switch
                checked={notifEnabled}
                onCheckedChange={setNotifEnabled}
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagem Padrão
              </Label>
              <Textarea
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="Digite a mensagem que será enviada..."
                className="min-h-[100px]"
              />
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
              >
                <ToggleGroupItem value="0" aria-label="Domingo" className="w-10 h-10">D</ToggleGroupItem>
                <ToggleGroupItem value="1" aria-label="Segunda" className="w-10 h-10">S</ToggleGroupItem>
                <ToggleGroupItem value="2" aria-label="Terça" className="w-10 h-10">T</ToggleGroupItem>
                <ToggleGroupItem value="3" aria-label="Quarta" className="w-10 h-10">Q</ToggleGroupItem>
                <ToggleGroupItem value="4" aria-label="Quinta" className="w-10 h-10">Q</ToggleGroupItem>
                <ToggleGroupItem value="5" aria-label="Sexta" className="w-10 h-10">S</ToggleGroupItem>
                <ToggleGroupItem value="6" aria-label="Sábado" className="w-10 h-10">S</ToggleGroupItem>
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
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveNotificationMutation.mutate()}
                disabled={saveNotificationMutation.isPending}
              >
                {saveNotificationMutation.isPending ? "Salvando..." : "Salvar Configurações de Notificação"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Only */}
      {(isAdmin || isSuperAdmin) && <div className="bg-card rounded-xl border border-warning/30 shadow-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-warning/5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Shield className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Área Administrativa</h2>
              <p className="text-sm text-muted-foreground">Apenas administradores</p>
            </div>
          </div>
          <div className="p-5 space-y-6">
            {/* Transport Settings */}
            <div className="space-y-4 pb-6 border-b border-border">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-success" />
                <h3 className="font-semibold text-foreground">Ajuda de Transporte</h3>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tripValue">Valor por viagem (Ida e Volta)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input id="tripValue" type="number" defaultValue="15.00" step="0.50" className="pl-10" />
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
                <Switch defaultChecked />
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
                <Input id="maxPassengers" type="number" defaultValue="4" min="1" max="10" />
              </div>
              {isSuperAdmin && (
                <div className="grid gap-2 pt-4 border-t border-border">
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
              )}
            </div>
          </div>
        </div>}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-primary hover:bg-primary/90" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>;
}