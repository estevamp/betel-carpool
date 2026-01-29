import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  Car, 
  Clock, 
  Users, 
  MapPin,
  Filter,
  Calendar,
  MoreVertical,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data
const trips = [
  {
    id: 1,
    driver: "Jonatã Bessa",
    departure: "22/01/2026",
    departureTime: "18:30",
    returnTime: "21:30",
    passengers: [
      { name: "Gabi Bessa", type: "Ida e Volta" },
      { name: "Danilo Calori", type: "Ida e Volta" },
    ],
    totalSeats: 4,
    active: true,
    urgent: false,
    isBetelCar: false,
    notes: "Saída pontual da filial",
  },
  {
    id: 2,
    driver: "Rafael Maguetas",
    departure: "22/01/2026",
    departureTime: "21:00",
    returnTime: "23:30",
    passengers: [
      { name: "Adriano Diniz", type: "Apenas Volta" },
    ],
    totalSeats: 4,
    active: true,
    urgent: true,
    isBetelCar: false,
    notes: "Vou levar um casal de viajante",
  },
  {
    id: 3,
    driver: "Estevam Palombi",
    departure: "25/01/2026",
    departureTime: "08:00",
    returnTime: "12:00",
    passengers: [
      { name: "Aline Palombi", type: "Ida e Volta" },
      { name: "Leonardo Silva", type: "Ida e Volta" },
      { name: "Felipe Oliveira", type: "Apenas Ida" },
      { name: "Francis Parenti", type: "Ida e Volta" },
    ],
    totalSeats: 4,
    active: true,
    urgent: false,
    isBetelCar: true,
    notes: "",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export default function ViagensPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTrips = trips.filter(
    (trip) =>
      trip.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.passengers.some((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Viagens</h1>
          <p className="text-muted-foreground">
            Gerencie as viagens e reserve vagas
          </p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Nova Viagem
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar por motorista ou passageiro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          Selecionar Data
        </Button>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Trips List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4"
      >
        {filteredTrips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </motion.div>

      {filteredTrips.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Car className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-foreground">
            Nenhuma viagem encontrada
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Tente ajustar os filtros ou criar uma nova viagem
          </p>
        </div>
      )}
    </div>
  );
}

interface TripCardProps {
  trip: (typeof trips)[0];
}

function TripCard({ trip }: TripCardProps) {
  const availableSeats = trip.totalSeats - trip.passengers.length;
  const isFull = availableSeats === 0;

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "bg-card rounded-xl border shadow-card overflow-hidden transition-all hover:shadow-md",
        trip.urgent && "border-warning/50"
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
          {trip.urgent && (
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="h-4 w-4" />
              Urgente
            </span>
          )}
          {trip.isBetelCar && (
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
                {trip.driver}
              </h3>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {trip.departure}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {trip.departureTime}
                  {trip.returnTime && ` - ${trip.returnTime}`}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
              <DropdownMenuItem>Editar viagem</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Cancelar viagem
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Passengers */}
        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            <span>Passageiros ({trip.passengers.length}/{trip.totalSeats})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trip.passengers.map((passenger, idx) => (
              <span
                key={idx}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                  "bg-muted text-muted-foreground"
                )}
              >
                <span className="font-medium">{passenger.name}</span>
                {passenger.type !== "Ida e Volta" && (
                  <span className="text-xs opacity-70">
                    ({passenger.type === "Apenas Ida" ? "Ida" : "Volta"})
                  </span>
                )}
              </span>
            ))}
            {Array.from({ length: availableSeats }).map((_, idx) => (
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
        {!isFull && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button className="w-full sm:w-auto bg-success hover:bg-success/90 text-success-foreground">
              Reservar Vaga
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
