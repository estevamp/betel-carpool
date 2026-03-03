import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CreateTripData } from "@/hooks/useTrips";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedCongregation } from "@/contexts/CongregationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBetelitas } from "@/hooks/useBetelitas";
import { useIsCongregationAdmin } from "@/hooks/useIsCongregationAdmin";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateTripDialogProps {
  onCreateTrip: (data: CreateTripData) => void;
  isCreating?: boolean;
}
export function CreateTripDialog({ onCreateTrip, isCreating }: CreateTripDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [hasReturnTrip, setHasReturnTrip] = useState(true);
  const [returnDate, setReturnDate] = useState<Date>();
  const [departureTime, setDepartureTime] = useState("18:30");
  const [returnTime, setReturnTime] = useState("21:30");
  const [maxPassengers, setMaxPassengers] = useState(4);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isBetelCar, setIsBetelCar] = useState(false);
  const [notes, setNotes] = useState("");
  const [driverId, setDriverId] = useState<string>("");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { profile, isSuperAdmin } = useAuth();
  const { isCongregationAdmin } = useIsCongregationAdmin();
  const { selectedCongregationId } = useSelectedCongregation();
  
  // Determine the effective congregation ID
  const effectiveCongregationId = isSuperAdmin ? selectedCongregationId : profile?.congregation_id;

  const { data: betelitas } = useBetelitas({ congregationId: effectiveCongregationId || undefined });
  const drivers = betelitas?.filter(b => b.is_driver) || [];

  // Set default driver when profile is loaded or when it's an admin
  useEffect(() => {
    if (profile && !driverId) {
      setDriverId(profile.id);
    }
  }, [profile]);

  // Fetch congregation settings to get default max_passengers
  const { data: settings } = useQuery({
    queryKey: ["settings", effectiveCongregationId],
    queryFn: async () => {
      if (!effectiveCongregationId) return null;
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("congregation_id", effectiveCongregationId);
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCongregationId,
  });

  // Update maxPassengers when settings are loaded
  useEffect(() => {
    if (settings) {
      const maxPassSetting = settings.find(s => s.key === "max_passengers");
      if (maxPassSetting) {
        setMaxPassengers(Number(maxPassSetting.value));
      }
    }
  }, [settings]);

  useEffect(() => {
    if (!date || returnDate) return;
    setReturnDate(date);
  }, [date, returnDate]);

  useEffect(() => {
    if (hasReturnTrip && date && !returnDate) {
      setReturnDate(date);
    }
  }, [hasReturnTrip, date, returnDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    const [depHour, depMin] = departureTime.split(":").map(Number);
    const departureAt = new Date(date);
    departureAt.setHours(depHour, depMin, 0, 0);

    let returnAt: string | undefined;
    if (hasReturnTrip && returnDate && returnTime) {
      const [retHour, retMin] = returnTime.split(":").map(Number);
      const returnAtDate = new Date(returnDate);
      returnAtDate.setHours(retHour, retMin, 0, 0);
      if (returnAtDate < departureAt) {
        toast.error("A data/hora de volta não pode ser anterior à ida.");
        return;
      }
      returnAt = returnAtDate.toISOString();
    }
    onCreateTrip({
      departure_at: departureAt.toISOString(),
      return_at: returnAt,
      max_passengers: maxPassengers,
      is_urgent: isUrgent,
      is_betel_car: isBetelCar,
      notes: notes || undefined,
      driver_id: driverId !== profile?.id ? driverId : undefined,
    });

    // Reset form - use default from settings
    const defaultMaxPassengers = settings?.find(s => s.key === "max_passengers")?.value || "4";
    setDate(undefined);
    setHasReturnTrip(true);
    setReturnDate(undefined);
    setDepartureTime("18:30");
    setReturnTime("21:30");
    setMaxPassengers(Number(defaultMaxPassengers));
    setIsUrgent(false);
    setIsBetelCar(false);
    setNotes("");
    setDriverId(profile?.id || "");
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              Preencha os dados da viagem. Em carro de Betel, passageiros ficam isentos de pagamento.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Driver Selection (Admins only) */}
            {(isSuperAdmin || isCongregationAdmin) && (
              <div className="grid gap-2">
                <Label htmlFor="driver">Motorista</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger>
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

            {/* Date */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Data de Ida</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date
                        ? format(date, "PPP", {
                            locale: ptBR,
                          })
                        : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(selectedDate) => selectedDate < today}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="has-return-trip">Incluir volta</Label>
                <Switch
                  id="has-return-trip"
                  checked={hasReturnTrip}
                  onCheckedChange={setHasReturnTrip}
                />
              </div>

              {hasReturnTrip && (
                <div className="grid gap-2">
                  <Label>Data de Volta</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !returnDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {returnDate
                          ? format(returnDate, "PPP", {
                              locale: ptBR,
                            })
                          : "Selecione a data de volta"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={returnDate}
                        onSelect={setReturnDate}
                        disabled={(selectedDate) => {
                          if (!date) return selectedDate < today;
                          return selectedDate < date;
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="departure">Horário de Saída</Label>
                <Input
                  id="departure"
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="return">Horário de Volta</Label>
                <Input
                  id="return"
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  disabled={!hasReturnTrip}
                />
              </div>
            </div>

            {/* Max Passengers */}
            <div className="grid gap-2">
              <Label htmlFor="passengers">Vagas Disponíveis</Label>
              <Input
                id="passengers"
                type="number"
                min={1}
                max={10}
                value={maxPassengers}
                onChange={(e) => setMaxPassengers(Number(e.target.value))}
                required
              />
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
              <Textarea
                id="notes"
                placeholder="Ex: Saída da doca do bloco 16..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
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
    </Dialog>
  );
}
