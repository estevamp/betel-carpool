import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { CreateTripData } from "@/hooks/useTrips";
interface CreateTripDialogProps {
  onCreateTrip: (data: CreateTripData) => void;
  isCreating?: boolean;
  isDriver?: boolean;
}
export function CreateTripDialog({
  onCreateTrip,
  isCreating,
  isDriver
}: CreateTripDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [departureTime, setDepartureTime] = useState("18:30");
  const [returnTime, setReturnTime] = useState("21:30");
  const [maxPassengers, setMaxPassengers] = useState(4);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isBetelCar, setIsBetelCar] = useState(false);
  const [notes, setNotes] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    const [depHour, depMin] = departureTime.split(":").map(Number);
    const departureAt = new Date(date);
    departureAt.setHours(depHour, depMin, 0, 0);
    let returnAt: string | undefined;
    if (returnTime) {
      const [retHour, retMin] = returnTime.split(":").map(Number);
      const returnDate = new Date(date);
      returnDate.setHours(retHour, retMin, 0, 0);
      returnAt = returnDate.toISOString();
    }
    onCreateTrip({
      departure_at: departureAt.toISOString(),
      return_at: returnAt,
      max_passengers: maxPassengers,
      is_urgent: isUrgent,
      is_betel_car: isBetelCar,
      notes: notes || undefined
    });

    // Reset form
    setDate(undefined);
    setDepartureTime("18:30");
    setReturnTime("21:30");
    setMaxPassengers(4);
    setIsUrgent(false);
    setIsBetelCar(false);
    setNotes("");
    setOpen(false);
  };
  if (!isDriver) {
    return <Alert className="border-muted">
        <Car className="h-4 w-4" />
        <AlertTitle>Você não é motorista</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>Para criar viagens, ative a opção "Sou motorista" no seu perfil.</span>
          <Button variant="outline" size="sm" className="w-fit" onClick={() => navigate("/perfil")}>
            Ir para Perfil
          </Button>
        </AlertDescription>
      </Alert>;
  }
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Nova Viagem
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar Nova Viagem</DialogTitle>
            <DialogDescription>
              Preencha os dados da viagem. Passageiros poderão reservar vagas disponíveis.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Date */}
            <div className="grid gap-2">
              <Label>Data da Viagem</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", {
                    locale: ptBR
                  }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} disabled={date => date < new Date()} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="departure">Horário de Saída</Label>
                <Input id="departure" type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="return">Horário de Volta</Label>
                <Input id="return" type="time" value={returnTime} onChange={e => setReturnTime(e.target.value)} />
              </div>
            </div>

            {/* Max Passengers */}
            <div className="grid gap-2">
              <Label htmlFor="passengers">Vagas Disponíveis</Label>
              <Input id="passengers" type="number" min={1} max={10} value={maxPassengers} onChange={e => setMaxPassengers(Number(e.target.value))} required />
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="urgent">Viagem Necessária</Label>
                  
                </div>
                <Switch id="urgent" checked={isUrgent} onCheckedChange={setIsUrgent} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="betel">Carro de Betel</Label>
                  
                </div>
                <Switch id="betel" checked={isBetelCar} onCheckedChange={setIsBetelCar} />
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" placeholder="Ex: Saída pontual da filial, levo viajante..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || !date}>
              {isCreating ? "Criando..." : "Criar Viagem"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>;
}