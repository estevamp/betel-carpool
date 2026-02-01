import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
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
import { useInviteUser } from "@/hooks/useInviteUser";
import type { Betelita } from "@/hooks/useBetelitas";

interface EditBetelitaDialogProps {
  person: Betelita | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allBetelitas: Betelita[];
}

export function EditBetelitaDialog({
  person,
  open,
  onOpenChange,
  allBetelitas,
}: EditBetelitaDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sendInvite, isInviting } = useInviteUser();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    sex: "" as "Homem" | "Mulher" | "",
    is_driver: false,
    is_exempt: false,
    pix_key: "",
    is_married: false,
    spouse_id: "",
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
        is_married: person.is_married ?? false,
        spouse_id: person.spouse_id ?? "",
      });
    }
  }, [person]);

  // Filter available spouses: opposite sex, not married (or current spouse), not self
  const availableSpouses = useMemo(() => {
    if (!person || !formData.sex) return [];
    
    const oppositeSex = formData.sex === "Homem" ? "Mulher" : "Homem";
    
    return allBetelitas.filter((b) => {
      // Exclude self
      if (b.id === person.id) return false;
      // Must be opposite sex
      if (b.sex !== oppositeSex) return false;
      // Must be single OR already this person's spouse
      if (b.is_married && b.spouse_id !== person.id) return false;
      return true;
    });
  }, [allBetelitas, person, formData.sex]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!person) throw new Error("No person to update");

      const previousSpouseId = person.spouse_id;
      const newSpouseId = data.is_married && data.spouse_id ? data.spouse_id : null;

      // Update the current person
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          email: data.email || null,
          sex: data.sex || null,
          is_driver: data.is_driver,
          is_exempt: data.is_exempt,
          pix_key: data.pix_key || null,
          is_married: data.is_married,
          spouse_id: newSpouseId,
        })
        .eq("id", person.id);

      if (error) throw error;

      // Handle bidirectional sync
      // If there was a previous spouse and it changed, clear the old spouse's link
      if (previousSpouseId && previousSpouseId !== newSpouseId) {
        await supabase
          .from("profiles")
          .update({ spouse_id: null, is_married: false })
          .eq("id", previousSpouseId);
      }

      // If there's a new spouse, update their profile to link back
      if (newSpouseId) {
        await supabase
          .from("profiles")
          .update({ spouse_id: person.id, is_married: true })
          .eq("id", newSpouseId);
      }
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

  const handleSendInvite = async () => {
    const success = await sendInvite({
      email: formData.email,
      fullName: formData.full_name,
      sex: formData.sex || undefined,
      isDriver: formData.is_driver,
      isExempt: formData.is_exempt,
    });

    if (success) {
      onOpenChange(false);
    }
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

          <div className="flex items-center justify-between">
            <Label htmlFor="is_married">Casado(a)</Label>
            <Switch
              id="is_married"
              checked={formData.is_married}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  is_married: checked,
                  spouse_id: checked ? formData.spouse_id : "",
                })
              }
            />
          </div>

          {formData.is_married && (
            <div className="space-y-2">
              <Label htmlFor="spouse_id">Cônjuge</Label>
              <Select
                value={formData.spouse_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, spouse_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cônjuge" />
                </SelectTrigger>
                <SelectContent>
                  {availableSpouses.map((spouse) => (
                    <SelectItem key={spouse.id} value={spouse.id}>
                      {spouse.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending || isInviting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={updateMutation.isPending || isInviting || !formData.email}
              onClick={handleSendInvite}
              className="gap-2"
            >
              {isInviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Enviar Convite
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || isInviting}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
