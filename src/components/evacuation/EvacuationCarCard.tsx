import { motion } from "framer-motion";
import { Car, MapPin, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useEvacuation, EvacuationCar } from "@/hooks/useEvacuation";
import { AddPassengerPopover } from "./AddPassengerPopover";

interface EvacuationCarCardProps {
  car: EvacuationCar;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export function EvacuationCarCard({ car }: EvacuationCarCardProps) {
  const { profile, isAdmin } = useAuth();
  const { deleteCar, isDeletingCar, removePassenger, isRemovingPassenger } =
    useEvacuation();

  const canManage = profile?.id === car.driver_id || isAdmin;
  const availableSeats = car.max_seats - car.passengers.length;

  const handleDeleteCar = () => {
    if (confirm("Tem certeza que deseja remover este carro do plano?")) {
      deleteCar(car.id);
    }
  };

  const handleRemovePassenger = (passengerId: string) => {
    removePassenger(passengerId);
  };

  return (
    <motion.div
      variants={itemVariants}
      className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shrink-0">
            <Car className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{car.driver_name}</h3>
            {car.destination && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-4 w-4" />
                {car.destination}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium",
                availableSeats > 0
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {car.passengers.length}/{car.max_seats}
            </span>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDeleteCar}
                disabled={isDeletingCar}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {car.notes && (
          <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted/50 rounded-lg">
            {car.notes}
          </p>
        )}

        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Passageiros:</p>
          <div className="flex flex-wrap gap-2">
            {car.passengers.map((passenger) => (
              <span
                key={passenger.id}
                className="px-3 py-1.5 rounded-full text-sm bg-muted text-muted-foreground flex items-center gap-1"
              >
                {passenger.passenger_name}
                {canManage && (
                  <button
                    onClick={() => handleRemovePassenger(passenger.id)}
                    className="ml-1 hover:text-destructive transition-colors"
                    disabled={isRemovingPassenger}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            {availableSeats > 0 && (
              <AddPassengerPopover carId={car.id}>
                <button className="px-3 py-1.5 rounded-full text-sm border border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-primary hover:text-primary transition-colors">
                  + Adicionar
                </button>
              </AddPassengerPopover>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
