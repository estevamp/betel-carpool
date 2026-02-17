import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useRideRequests } from "@/hooks/useRideRequests";
import { useAuth } from "@/contexts/AuthContext";
import { useBetelitas } from "@/hooks/useBetelitas";
import { useSelectedCongregation } from "@/contexts/CongregationContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateRideRequestDialogProps {
  children: React.ReactNode;
}

export function CreateRideRequestDialog({ children }: CreateRideRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [profileId, setProfileId] = useState<string>("");

  const { profile, isSuperAdmin } = useAuth();
  const { selectedCongregationId } = useSelectedCongregation();
  const effectiveCongregationId = isSuperAdmin ? selectedCongregationId : profile?.congregation_id;
  const { data: betelitas } = useBetelitas({ congregationId: effectiveCongregationId || undefined });

  useEffect(() => {
    if (profile && !profileId) {
      setProfileId(profile.id);
    }
  }, [profile]);

  const { createRideRequest, isCreating } = useRideRequests();

  const handleSubmit = () => {
    if (!date) return;

    createRideRequest(
      {
        requested_date: date.toISOString(),
        notes: notes.trim() || undefined,
        profile_id: profileId !== profile?.id ? profileId : undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setDate(undefined);
          setNotes("");
          setProfileId(profile?.id || "");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Preciso de Carona</DialogTitle>
          <DialogDescription>
            Informe a data que você precisa de carona. Outros betelitas poderão
            ver sua solicitação e criar uma viagem para você.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* User Selection (Admins only) */}
          {(isSuperAdmin || profile?.is_admin) && (
            <div className="grid gap-2">
              <Label htmlFor="profile">Betelita</Label>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o betelita" />
                </SelectTrigger>
                <SelectContent>
                  {betelitas?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Data da Carona *</Label>
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
                  {date ? (
                    format(date, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione a data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Preciso ir ao aeroporto às 8h..."
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
            disabled={!date || isCreating}
            className="bg-warning hover:bg-warning/90 text-warning-foreground"
          >
            {isCreating ? "Salvando..." : "Solicitar Carona"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
