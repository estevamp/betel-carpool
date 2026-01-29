import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Trip } from "@/hooks/useTrips";

interface EditTripDialogProps {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTrip: (data: {
    tripId: string;
    departure_at: string;
    return_at?: string;
    max_passengers: number;
    is_urgent: boolean;
    is_betel_car: boolean;
    notes?: string;
  }) => void;
  isUpdating?: boolean;
}

export function EditTripDialog({
  trip,
  open,
  onOpenChange,
  onUpdateTrip,
  isUpdating,
}: EditTripDialogProps) {
  const departureDate = new Date(trip.departure_at);
  const returnDate = trip.return_at ? new Date(trip.return_at) : null;

  const [date, setDate] = useState<Date | undefined>(departureDate);
  const [departureTime, setDepartureTime] = useState(format(departureDate, "HH:mm"));
  const [returnTime, setReturnTime] = useState(returnDate ? format(returnDate, "HH:mm") : "");
  const [maxPassengers, setMaxPassengers] = useState(String(trip.max_passengers ?? 4));
  const [isUrgent, setIsUrgent] = useState(trip.is_urgent ?? false);
  const [isBetelCar, setIsBetelCar] = useState(trip.is_betel_car ?? false);
  const [notes, setNotes] = useState(trip.notes ?? "");

  // Reset form when trip changes
  useEffect(() => {
    const depDate = new Date(trip.departure_at);
    const retDate = trip.return_at ? new Date(trip.return_at) : null;
    
    setDate(depDate);
    setDepartureTime(format(depDate, "HH:mm"));
    setReturnTime(retDate ? format(retDate, "HH:mm") : "");
    setMaxPassengers(String(trip.max_passengers ?? 4));
    setIsUrgent(trip.is_urgent ?? false);
    setIsBetelCar(trip.is_betel_car ?? false);
    setNotes(trip.notes ?? "");
  }, [trip]);

  const handleSubmit = () => {
    if (!date) return;

    const [depHours, depMinutes] = departureTime.split(":").map(Number);
    const departureAt = new Date(date);
    departureAt.setHours(depHours, depMinutes, 0, 0);

    let returnAt: Date | undefined;
    if (returnTime) {
      const [retHours, retMinutes] = returnTime.split(":").map(Number);
      returnAt = new Date(date);
      returnAt.setHours(retHours, retMinutes, 0, 0);
    }

    onUpdateTrip({
      tripId: trip.id,
      departure_at: departureAt.toISOString(),
      return_at: returnAt?.toISOString(),
      max_passengers: parseInt(maxPassengers) || 4,
      is_urgent: isUrgent,
      is_betel_car: isBetelCar,
      notes: notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Viagem</DialogTitle>
          <DialogDescription>
            Atualize os detalhes da viagem.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Date */}
          <div className="grid gap-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-departure">Horário de Ida</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-departure"
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-return">Horário de Volta</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edit-return"
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Max Passengers */}
          <div className="grid gap-2">
            <Label htmlFor="edit-max-passengers">Número Máximo de Passageiros</Label>
            <Input
              id="edit-max-passengers"
              type="number"
              min="1"
              max="10"
              value={maxPassengers}
              onChange={(e) => setMaxPassengers(e.target.value)}
            />
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-urgent"
                checked={isUrgent}
                onCheckedChange={(checked) => setIsUrgent(checked === true)}
              />
              <Label htmlFor="edit-urgent" className="font-normal">
                Viagem necessária (preciso de passageiros)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-betel"
                checked={isBetelCar}
                onCheckedChange={(checked) => setIsBetelCar(checked === true)}
              />
              <Label htmlFor="edit-betel" className="font-normal">
                Carro de Betel
              </Label>
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="edit-notes">Observações</Label>
            <Textarea
              id="edit-notes"
              placeholder="Ex: Saindo do portão principal..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdating || !date}>
            {isUpdating ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
