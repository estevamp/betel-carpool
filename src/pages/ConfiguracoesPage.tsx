import { useState, useEffect } from "react";
import { Settings, Wallet, Bell, Shield, Database, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const [congregationName, setCongregationName] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const congregation = settings.find((s) => s.key === "congregation_name");
      if (congregation) {
        setCongregationName(congregation.value);
      }
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", "congregation_name")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("settings")
          .update({ value: congregationName })
          .eq("key", "congregation_name");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert({ key: "congregation_name", value: congregationName, type: "string" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configurações salvas com sucesso!");
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

      {/* Congregation Settings */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Congregação</h2>
            <p className="text-sm text-muted-foreground">Identificação da congregação</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="congregationName">Nome da Congregação</Label>
            <Input
              id="congregationName"
              type="text"
              placeholder="Ex: Congregação Norte - Boituva"
              value={congregationName}
              onChange={(e) => setCongregationName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Será exibido no subtítulo da página inicial</p>
          </div>
        </div>
      </div>

      {/* Transport Settings */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <Wallet className="h-5 w-5 text-success" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Ajuda de Transporte</h2>
            <p className="text-sm text-muted-foreground">Configurações financeiras</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
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

      {/* Admin Only */}
      <div className="bg-card rounded-xl border border-warning/30 shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-warning/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <Shield className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Área Administrativa</h2>
            <p className="text-sm text-muted-foreground">Apenas administradores</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
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
