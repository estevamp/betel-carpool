import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Car,
  Clock,
  Users,
  MapPin,
  Calendar,
  MoreVertical,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import type { Trip } from "@/hooks/useTrips";
import type { Database } from "@/integrations/supabase/types";

type TripType = Database["public"]["Enums"]["trip_type"];

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

interface TripCardProps {
  trip: Trip;
  currentUserId?: string;
  onReserveSeat: (data: { tripId: string; tripType: TripType }) => void;
  onCancelReservation: (tripId: string) => void;
  onDeleteTrip: (tripId: string) => void;
  isReserving?: boolean;
  isCanceling?: boolean;
}

export function TripCard({
  trip,
  currentUserId,
  onReserveSeat,
  onCancelReservation,
  onDeleteTrip,
  isReserving,
  isCanceling,
}: TripCardProps) {
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [selectedTripType, setSelectedTripType] = useState<TripType>("Ida e Volta");
  
  const availableSeats = (trip.max_passengers ?? 4) - trip.passengers.length;
  const isFull = availableSeats <= 0;
  const isDriver = trip.driver_id === currentUserId;
  const isPassenger = trip.passengers.some(p => p.passenger_id === currentUserId);
  
  const departureDate = new Date(trip.departure_at);
  const formattedDate = format(departureDate, "dd/MM/yyyy", { locale: ptBR });
  const formattedTime = format(departureDate, "HH:mm");
  const returnTime = trip.return_at ? format(new Date(trip.return_at), "HH:mm") : null;

  const handleReserve = () => {
    onReserveSeat({ tripId: trip.id, tripType: selectedTripType });
    setReserveDialogOpen(false);
  };

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "bg-card rounded-xl border shadow-card overflow-hidden transition-all hover:shadow-md",
        trip.is_urgent && "border-warning/50"
      )}
    >
      {/* Status Bar */}
      <div
        className={cn(
          "px-4 py-2 flex items-center justify-between text-sm font-medium",
          isFull
            ? "bg-muted text-muted-foreground"
            : "bg-success/10 text-success"
        )}
      >
        <span>
          {isFull
            ? "COMPLETO"
            : `HÁ ${availableSeats} VAGA${availableSeats > 1 ? "S" : ""} DISPONÍVEL${availableSeats > 1 ? "IS" : ""}`}
        </span>
        <div className="flex items-center gap-2">
          {trip.is_urgent && (
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="h-4 w-4" />
              Urgente
            </span>
          )}
          {trip.is_betel_car && (
            <span className="flex items-center gap-1 text-info">
              <Building2 className="h-4 w-4" />
              Carro de Betel
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">
                {trip.driver.full_name}
              </h3>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formattedDate}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formattedTime}
                  {returnTime && ` - ${returnTime}`}
                </span>
              </div>
            </div>
          </div>

          {isDriver && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                <DropdownMenuItem>Editar viagem</DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => onDeleteTrip(trip.id)}
                >
                  Cancelar viagem
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Passengers */}
        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            <span>Passageiros ({trip.passengers.length}/{trip.max_passengers ?? 4})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trip.passengers.map((passenger) => (
              <span
                key={passenger.id}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                  "bg-muted text-muted-foreground"
                )}
              >
                <span className="font-medium">{passenger.profile.full_name}</span>
                {passenger.trip_type !== "Ida e Volta" && (
                  <span className="text-xs opacity-70">
                    ({passenger.trip_type === "Apenas Ida" ? "Ida" : "Volta"})
                  </span>
                )}
              </span>
            ))}
            {Array.from({ length: Math.max(0, availableSeats) }).map((_, idx) => (
              <span
                key={`empty-${idx}`}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm border border-dashed border-muted-foreground/30 text-muted-foreground/50"
              >
                Vaga disponível
              </span>
            ))}
          </div>
        </div>

        {/* Notes */}
        {trip.notes && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 inline mr-1" />
              {trip.notes}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-border">
          {isPassenger ? (
            <Button 
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onCancelReservation(trip.id)}
              disabled={isCanceling}
            >
              {isCanceling ? "Cancelando..." : "Cancelar Reserva"}
            </Button>
          ) : !isFull && !isDriver ? (
            <Dialog open={reserveDialogOpen} onOpenChange={setReserveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-success hover:bg-success/90 text-success-foreground">
                  Reservar Vaga
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reservar Vaga</DialogTitle>
                  <DialogDescription>
                    Selecione o tipo de viagem que você precisa.
                  </DialogDescription>
                </DialogHeader>
                <RadioGroup 
                  value={selectedTripType} 
                  onValueChange={(v) => setSelectedTripType(v as TripType)}
                  className="gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Ida e Volta" id="ida-volta" />
                    <Label htmlFor="ida-volta">Ida e Volta</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Apenas Ida" id="ida" />
                    <Label htmlFor="ida">Apenas Ida</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Apenas Volta" id="volta" />
                    <Label htmlFor="volta">Apenas Volta</Label>
                  </div>
                </RadioGroup>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReserveDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleReserve}
                    disabled={isReserving}
                    className="bg-success hover:bg-success/90"
                  >
                    {isReserving ? "Reservando..." : "Confirmar Reserva"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : isDriver ? (
            <span className="text-sm text-muted-foreground">Você é o motorista desta viagem</span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
