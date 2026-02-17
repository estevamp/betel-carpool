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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CreateAbsenceData } from "@/hooks/useAbsences";
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

interface CreateAbsenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateAbsenceData) => void;
  isLoading: boolean;
}

export function CreateAbsenceDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateAbsenceDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) return;

    onSubmit({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      notes: notes.trim() || undefined,
      profile_id: profileId !== profile?.id ? profileId : undefined,
    });

    // Reset form
    setStartDate(undefined);
    setEndDate(undefined);
    setNotes("");
    setProfileId(profile?.id || "");
    onOpenChange(false);
  };

  const isValid = startDate && endDate && startDate <= endDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Ausência</DialogTitle>
          <DialogDescription>
            Informe o período em que você estará ausente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
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

            {/* Start Date */}
            <div className="grid gap-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="grid gap-2">
              <Label>Data de Término</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={ptBR}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Ex: Viagem de férias, visitando família..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
