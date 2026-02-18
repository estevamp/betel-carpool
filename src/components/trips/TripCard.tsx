import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Car, Clock, Users, MapPin, Calendar, MoreVertical, AlertTriangle, Building2, UserPlus, X } from "lucide-react";

// Special UUID for Visitante profile
const VISITANTE_PROFILE_ID = "00000000-0000-0000-0000-000000000001";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import type { Trip, UpdateTripData } from "@/hooks/useTrips";
import type { Database } from "@/integrations/supabase/types";
import type { Profile } from "@/hooks/useProfiles";
import { EditTripDialog } from "./EditTripDialog";

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
  isAdmin?: boolean;
  profiles?: Profile[];
  onReserveSeat: (data: { tripId: string; tripType: TripType; passengerId?: string }) => void;
  onCancelReservation: (tripId: string) => void;
  onRemovePassenger?: (data: { tripId: string; passengerId: string }) => void;
  onDeleteTrip: (tripId: string) => void;
  onUpdateTrip?: (data: UpdateTripData) => void;
  isReserving?: boolean;
  isCanceling?: boolean;
  isUpdating?: boolean;
}

export function TripCard({
  trip,
  currentUserId,
  isAdmin,
  profiles,
  onReserveSeat,
  onCancelReservation,
  onRemovePassenger,
  onDeleteTrip,
  onUpdateTrip,
  isReserving,
  isCanceling,
  isUpdating,
}: TripCardProps) {
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [addPassengerDialogOpen, setAddPassengerDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTripType, setSelectedTripType] = useState<TripType>("Ida e Volta");
  const [selectedPassengerId, setSelectedPassengerId] = useState<string>("");
  const [selectedReservePassengerId, setSelectedReservePassengerId] = useState<string>("");

  const availableSeats = (trip.max_passengers ?? 4) - trip.passengers.length;
  const isFull = availableSeats <= 0;
  const isDriver = trip.driver_id === currentUserId;
  const canManageTrip = isDriver || isAdmin;
  const isPassenger = trip.passengers.some((p) => p.passenger_id === currentUserId);

  const departureDate = new Date(trip.departure_at);
  const formattedDate = format(departureDate, "dd/MM/yyyy", { locale: ptBR });
  const formattedTime = format(departureDate, "HH:mm");
  const returnTime = trip.return_at ? format(new Date(trip.return_at), "HH:mm") : null;

  // Filter out profiles that are already passengers or the driver
  const existingPassengerIds = trip.passengers.map((p) => p.passenger_id);
  const availableProfiles =
    profiles?.filter((p) => p.id !== trip.driver_id && !existingPassengerIds.includes(p.id)) ?? [];

  // For reserve dialog, include all profiles except the driver and existing passengers
  const reserveAvailableProfiles =
    profiles?.filter((p) => p.id !== trip.driver_id && !existingPassengerIds.includes(p.id)) ?? [];

  const handleReserve = () => {
    // If "Visitante" is selected, use the special Visitante profile ID
    const passengerId = selectedReservePassengerId === "visitante" ? VISITANTE_PROFILE_ID : selectedReservePassengerId;
    onReserveSeat({ tripId: trip.id, tripType: selectedTripType, passengerId });
    setReserveDialogOpen(false);
    setSelectedReservePassengerId("");
    setSelectedTripType("Ida e Volta");
  };

  const handleAddPassenger = () => {
    if (!selectedPassengerId) return;
    const passengerId = selectedPassengerId === "visitante" ? VISITANTE_PROFILE_ID : selectedPassengerId;
    onReserveSeat({ tripId: trip.id, tripType: selectedTripType, passengerId });
    setAddPassengerDialogOpen(false);
    setSelectedPassengerId("");
    setSelectedTripType("Ida e Volta");
  };

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "bg-card rounded-xl border shadow-card overflow-hidden transition-all hover:shadow-md",
        trip.is_urgent && "border-warning/50",
      )}
    >
      {/* Status Bar */}
      <div
        className={cn(
          "px-4 py-2 flex items-center justify-between text-sm font-medium",
          isFull ? "bg-muted text-muted-foreground" : "bg-success/10 text-success",
        )}
      >
        <span>
          {isFull
            ? "COMPLETO"
            : `HÁ ${availableSeats} VAGA${availableSeats > 1 ? "S" : ""} DISPONÍVE${availableSeats > 1 ? "IS" : "L"}`}
        </span>
        <div className="flex items-center gap-2">
          {trip.is_urgent && (
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="h-4 w-4" />
              Necessária
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
              <h3 className="font-semibold text-foreground text-lg">{trip.driver?.full_name ?? "Motorista desconhecido"}</h3>
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

          {canManageTrip && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>Editar viagem</DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (window.confirm("Tem certeza que deseja cancelar esta viagem?")) {
                      onDeleteTrip(trip.id);
                    }
                  }}
                >
                  Cancelar viagem
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Edit Dialog */}
          {onUpdateTrip && (
            <EditTripDialog
              trip={trip}
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              onUpdateTrip={onUpdateTrip}
              isUpdating={isUpdating}
            />
          )}
        </div>

        {/* Passengers */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                Passageiros ({trip.passengers.length}/{trip.max_passengers ?? 4})
              </span>
            </div>
            {canManageTrip && !isFull && (
              <Dialog open={addPassengerDialogOpen} onOpenChange={setAddPassengerDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <UserPlus className="h-3 w-3" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Passageiro</DialogTitle>
                    <DialogDescription>Selecione um passageiro para adicionar à viagem.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Passageiro</Label>
                      <Select value={selectedPassengerId} onValueChange={setSelectedPassengerId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um passageiro" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {availableProfiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.full_name}
                            </SelectItem>
                          ))}
                          <SelectItem value="visitante">Visitante</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Tipo de Viagem</Label>
                      <RadioGroup
                        value={selectedTripType}
                        onValueChange={(v) => setSelectedTripType(v as TripType)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Ida e Volta" id="add-ida-volta" />
                          <Label htmlFor="add-ida-volta" className="font-normal">
                            Ida e Volta
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Apenas Ida" id="add-ida" />
                          <Label htmlFor="add-ida" className="font-normal">
                            Ida
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Apenas Volta" id="add-volta" />
                          <Label htmlFor="add-volta" className="font-normal">
                            Volta
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddPassengerDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddPassenger} disabled={isReserving || !selectedPassengerId}>
                      {isReserving ? "Adicionando..." : "Adicionar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {trip.passengers.map((passenger) => (
              <span
                key={passenger.id}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                  "bg-muted text-muted-foreground group",
                )}
              >
                <span className="font-medium">
                  {passenger.passenger_id === VISITANTE_PROFILE_ID
                    ? "Visitante"
                    : passenger.profile?.full_name || "Passageiro"}
                </span>
                {passenger.trip_type !== "Ida e Volta" && (
                  <span className="text-xs opacity-70">({passenger.trip_type === "Apenas Ida" ? "Ida" : "Volta"})</span>
                )}
                {onRemovePassenger && (
                  <button
                    onClick={() => onRemovePassenger({ tripId: trip.id, passengerId: passenger.passenger_id })}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    title="Remover passageiro"
                  >
                    <X className="h-3 w-3" />
                  </button>
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
        {trip.is_betel_car && (
          <div className="mt-4 p-3 rounded-lg bg-info/10">
            <p className="text-sm text-info">
              Passageiros desta viagem são isentos de pagamento.
            </p>
          </div>
        )}

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
                  <DialogDescription>Selecione para quem você está reservando e o tipo de viagem.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Reservar para</Label>
                    <Select value={selectedReservePassengerId} onValueChange={setSelectedReservePassengerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um passageiro" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {reserveAvailableProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name}
                          </SelectItem>
                        ))}
                        <SelectItem value="visitante">Visitante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo de Viagem</Label>
                    <RadioGroup
                      value={selectedTripType}
                      onValueChange={(v) => setSelectedTripType(v as TripType)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Ida e Volta" id="reserve-ida-volta" />
                        <Label htmlFor="reserve-ida-volta" className="font-normal">
                          Ida e Volta
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Apenas Ida" id="reserve-ida" />
                        <Label htmlFor="reserve-ida" className="font-normal">
                          Apenas Ida
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Apenas Volta" id="reserve-volta" />
                        <Label htmlFor="reserve-volta" className="font-normal">
                          Apenas Volta
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReserveDialogOpen(false);
                      setSelectedReservePassengerId("");
                      setSelectedTripType("Ida e Volta");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleReserve}
                    disabled={isReserving || !selectedReservePassengerId}
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
