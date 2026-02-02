import { useState, useEffect } from "react";
import { Settings, Wallet, Bell, Shield, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const { isSuperAdmin, profile } = useAuth();
  const [congregationName, setCongregationName] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch congregation name from congregations table
  const { data: congregation } = useQuery({
    queryKey: ["congregation", profile?.congregation_id],
    queryFn: async () => {
      if (!profile?.congregation_id) return null;
      const { data, error } = await supabase
        .from("congregations")
        .select("name")
        .eq("id", profile.congregation_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.congregation_id,
  });

  useEffect(() => {
    if (congregation?.name) {
      setCongregationName(congregation.name);
    }
  }, [congregation]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save other settings here if needed
      toast.success("Configurações salvas com sucesso!");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => {
      toast.error("Erro ao salvar configurações");
      console.error(error);
    },
  });
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
            <Bell className="h-5 w-5 text-info" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Notificações</h2>
            <p className="text-sm text-muted-foreground">Preferências de notificação</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Lembrete de viagem</Label>
              <p className="text-sm text-muted-foreground">Receber lembrete 24h antes da viagem</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Novas reservas</Label>
              <p className="text-sm text-muted-foreground">Notificar quando alguém reservar vaga</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Pendências financeiras</Label>
              <p className="text-sm text-muted-foreground">Lembrete de transferências pendentes</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      {/* Display Congregation Name (Read-only) */}
      {congregationName && (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Congregação</h2>
              <p className="text-sm text-muted-foreground">{congregationName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Only */}
      {isSuperAdmin && (
        <div className="bg-card rounded-xl border border-warning/30 shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-warning/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <Shield className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Área Administrativa</h2>
            <p className="text-sm text-muted-foreground">Apenas super administradores</p>
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
              <p className="text-xs text-muted-foreground">Viagens apenas de ida ou volta custam metade deste valor</p>
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
            <div className="grid gap-2">
              <Label htmlFor="closingDay">Dia de fechamento mensal</Label>
              <Input id="closingDay" type="number" defaultValue="31" min="1" max="31" />
              <p className="text-xs text-muted-foreground">Dia do mês em que o relatório é fechado</p>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
