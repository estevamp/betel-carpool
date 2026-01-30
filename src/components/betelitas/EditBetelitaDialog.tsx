import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Betelita } from "@/hooks/useBetelitas";

interface EditBetelitaDialogProps {
  person: Betelita | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBetelitaDialog({
  person,
  open,
  onOpenChange,
}: EditBetelitaDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    sex: "" as "Homem" | "Mulher" | "",
    is_driver: false,
    is_exempt: false,
    pix_key: "",
  });

  useEffect(() => {
    if (person) {
      setFormData({
        full_name: person.full_name,
        email: person.email ?? "",
        sex: person.sex ?? "",
        is_driver: person.is_driver ?? false,
        is_exempt: person.is_exempt ?? false,
        pix_key: person.pix_key ?? "",
      });
    }
  }, [person]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!person) throw new Error("No person to update");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          email: data.email || null,
          sex: data.sex || null,
          is_driver: data.is_driver,
          is_exempt: data.is_exempt,
          pix_key: data.pix_key || null,
        })
        .eq("id", person.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["betelitas"] });
      toast({
        title: "Betelita atualizado",
        description: "Os dados foram salvos com sucesso.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!person) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Betelita</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sex">Sexo</Label>
            <Select
              value={formData.sex}
              onValueChange={(value: "Homem" | "Mulher") =>
                setFormData({ ...formData, sex: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o sexo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Homem">Homem</SelectItem>
                <SelectItem value="Mulher">Mulher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pix_key">Chave PIX</Label>
            <Input
              id="pix_key"
              value={formData.pix_key}
              onChange={(e) =>
                setFormData({ ...formData, pix_key: e.target.value })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_driver">Motorista</Label>
            <Switch
              id="is_driver"
              checked={formData.is_driver}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_driver: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_exempt">Isento de pagamento</Label>
            <Switch
              id="is_exempt"
              checked={formData.is_exempt}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_exempt: checked })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
