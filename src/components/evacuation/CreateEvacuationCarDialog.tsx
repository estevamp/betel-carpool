import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEvacuation } from "@/hooks/useEvacuation";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles } from "@/hooks/useProfiles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateEvacuationCarDialogProps {
  children: React.ReactNode;
}

export function CreateEvacuationCarDialog({
  children,
}: CreateEvacuationCarDialogProps) {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [driverId, setDriverId] = useState("");

  const { profile, isAdmin } = useAuth();
  const { data: profiles = [] } = useProfiles();
  const { createCar, isCreatingCar } = useEvacuation();
  const drivers = profiles.filter((p) => p.is_driver);

  useEffect(() => {
    if (!profile?.id) return;

    if (!isAdmin) {
      if (driverId !== profile.id) {
        setDriverId(profile.id);
      }
      return;
    }

    if (drivers.length === 0) {
      if (driverId) setDriverId("");
      return;
    }

    const profileIsDriver = drivers.some((d) => d.id === profile.id);
    const defaultDriverId = profileIsDriver ? profile.id : drivers[0].id;
    const currentDriverIsValid = drivers.some((d) => d.id === driverId);

    if (!currentDriverIsValid) {
      setDriverId(defaultDriverId);
    }
  }, [profile, isAdmin, drivers, driverId]);

  const handleSubmit = () => {
    if (!profile?.id) return;

    if (isAdmin && !driverId) return;

    createCar(
      {
        destination: destination.trim() || undefined,
        notes: notes.trim() || undefined,
        driver_id: isAdmin ? driverId : undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setDestination("");
          setNotes("");
          setDriverId("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Carro de Evacuação</DialogTitle>
          <DialogDescription>
            Cadastre um carro no plano de evacuação de emergência.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {isAdmin && (
            <div className="grid gap-2">
              <Label htmlFor="driver">Motorista</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger id="driver">
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="destination">Destino</Label>
            <Input
              id="destination"
              placeholder="Ex: São Paulo - SP"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Carro com 4 lugares, saída às 6h..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreatingCar || (isAdmin && !driverId)}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isCreatingCar ? "Salvando..." : "Adicionar Carro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
