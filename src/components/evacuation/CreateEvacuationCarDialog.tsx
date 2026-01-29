import { useState } from "react";
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

interface CreateEvacuationCarDialogProps {
  children: React.ReactNode;
}

export function CreateEvacuationCarDialog({
  children,
}: CreateEvacuationCarDialogProps) {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");

  const { createCar, isCreatingCar } = useEvacuation();

  const handleSubmit = () => {
    createCar(
      {
        destination: destination.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setDestination("");
          setNotes("");
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
            Cadastre seu carro no plano de evacuação de emergência. Você será o
            motorista responsável.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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
            disabled={isCreatingCar}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isCreatingCar ? "Salvando..." : "Adicionar Carro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
