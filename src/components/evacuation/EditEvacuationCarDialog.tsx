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
import { EvacuationCar, useEvacuation } from "@/hooks/useEvacuation";

interface EditEvacuationCarDialogProps {
  car: EvacuationCar;
  children: React.ReactNode;
}

export function EditEvacuationCarDialog({
  car,
  children,
}: EditEvacuationCarDialogProps) {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState(car.destination ?? "");
  const [notes, setNotes] = useState(car.notes ?? "");
  const { updateCar, isUpdatingCar } = useEvacuation();

  useEffect(() => {
    if (!open) return;
    setDestination(car.destination ?? "");
    setNotes(car.notes ?? "");
  }, [open, car.destination, car.notes]);

  const handleSubmit = () => {
    updateCar(
      {
        id: car.id,
        destination: destination.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Carro de Evacuação</DialogTitle>
          <DialogDescription>
            Atualize as informações deste carro no plano de desocupação.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-destination">Destino</Label>
            <Input
              id="edit-destination"
              placeholder="Ex: São Paulo - SP"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-notes">Observações (opcional)</Label>
            <Textarea
              id="edit-notes"
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
            disabled={isUpdatingCar}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isUpdatingCar ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
