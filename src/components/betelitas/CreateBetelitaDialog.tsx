import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Save, UserPlus, Copy } from "lucide-react";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useInviteUser } from "@/hooks/useInviteUser";
import { useSelectedCongregation } from "@/contexts/CongregationContext";
import { useCongregations } from "@/hooks/useCongregations";
import { useBetelitas, type Betelita } from "@/hooks/useBetelitas";

const formSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  email: z.string().email("Email inválido").or(z.literal("")),
  sex: z.enum(["Homem", "Mulher"]).optional(),
  isDriver: z.boolean().default(false),
  isExempt: z.boolean().default(false),
  isMarried: z.boolean().default(false),
  spouseId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateBetelitaDialogProps {
  children: React.ReactNode;
}

export function CreateBetelitaDialog({ children }: CreateBetelitaDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<"save" | "invite" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sendInvite, isInviting } = useInviteUser();
  const { selectedCongregationId } = useSelectedCongregation();
  const { data: allBetelitas = [] } = useBetelitas();
  const { congregations } = useCongregations();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      isDriver: false,
      isExempt: false,
      isMarried: false,
      spouseId: "",
    },
  });

  const watchedSex = form.watch("sex");
  const watchedIsMarried = form.watch("isMarried");

  // Filter available spouses: opposite sex, not married, not self
  const availableSpouses = useMemo(() => {
    if (!watchedSex) return [];

    const oppositeSex = watchedSex === "Homem" ? "Mulher" : "Homem";

    return allBetelitas.filter((b: Betelita) => {
      // Must be opposite sex
      if (b.sex !== oppositeSex) return false;
      // Must be single
      if (b.is_married) return false;
      return true;
    });
  }, [allBetelitas, watchedSex]);

  const handleSaveOnly = async (data: FormData) => {
    setSubmitAction("save");
    setIsSubmitting(true);
    try {
      const newSpouseId = data.isMarried && data.spouseId ? data.spouseId : null;

      const { data: newProfile, error } = await supabase.from("profiles").insert({
        full_name: data.fullName,
        email: data.email ? data.email.toLowerCase().trim() : null,
        sex: data.sex || null,
        is_driver: data.isDriver,
        is_exempt: data.isExempt,
        is_married: data.isMarried,
        spouse_id: newSpouseId,
        congregation_id: selectedCongregationId,
      }).select().single();

      if (error) throw error;

      // If there's a spouse, update their profile to link back (bidirectional)
      if (newSpouseId && newProfile) {
        await supabase.from("profiles").update({ 
          spouse_id: newProfile.id, 
          is_married: true 
        }).eq("id", newSpouseId);
      }

      toast({
        title: "Betelita salvo!",
        description: `${data.fullName} foi adicionado à lista.`,
      });

      form.reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["betelitas"] });
    } catch (error: any) {
      console.error("Error saving betelita:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setSubmitAction(null);
    }
  };

  const handleSendInvite = async (data: FormData) => {
    setSubmitAction("invite");
    setIsSubmitting(true);

    const success = await sendInvite({
      email: data.email,
      fullName: data.fullName,
      sex: data.sex,
      isDriver: data.isDriver,
      isExempt: data.isExempt,
      congregationId: selectedCongregationId,
    });

    if (success) {
      form.reset();
      setOpen(false);
    }

    setIsSubmitting(false);
    setSubmitAction(null);
  };

  const handleCopyLink = async (data: FormData) => {
    if (!data.email) {
      toast({
        title: "Email obrigatório",
        description: "Para gerar o link de convite, é necessário informar o email.",
        variant: "destructive",
      });
      return;
    }

    try {
      const congregationName = congregations?.find(c => c.id === selectedCongregationId)?.name || '';
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/auth?email=${encodeURIComponent(data.email)}&type=invite`;
      const inviteText = `Esse é o seu convite para se cadastrar no sistema de transportes da congregação ${congregationName}.\n\n${inviteUrl}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(inviteText);

      toast({
        title: "Link copiado!",
        description: "O link de convite foi copiado para a área de transferência.",
      });
    } catch (error) {
      console.error("Error copying link:", error);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLinkClick = () => {
    form.handleSubmit(handleCopyLink)();
  };

  const email = form.watch("email");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <UserPlus className="h-5 w-5" />
            Novo Betelita
          </DialogTitle>
          <DialogDescription className="text-sm">Adicione um novo membro à lista ou envie um convite por email.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-3">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="João da Silva" {...field} className="text-base sm:text-sm h-10 sm:h-9" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="joao@email.com" {...field} className="text-base sm:text-sm h-10 sm:h-9" />
                  </FormControl>
                  <FormDescription className="text-[10px] sm:text-xs">Obrigatório apenas para enviar convite</FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Sexo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-base sm:text-sm h-10 sm:h-9">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Homem">Homem</SelectItem>
                      <SelectItem value="Mulher">Mulher</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="isDriver"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 sm:p-3">
                    <div className="space-y-0">
                      <FormLabel className="text-xs sm:text-sm">Motorista</FormLabel>
                      <FormDescription className="text-[10px] sm:text-xs">Pode criar viagens</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isExempt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 sm:p-3">
                    <div className="space-y-0">
                      <FormLabel className="text-xs sm:text-sm">Isento</FormLabel>
                      <FormDescription className="text-[10px] sm:text-xs">Não paga transporte</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isMarried"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 sm:p-3">
                  <div className="space-y-0">
                    <FormLabel className="text-xs sm:text-sm">Casado(a)</FormLabel>
                    <FormDescription className="text-[10px] sm:text-xs">Vincular cônjuge</FormDescription>
                  </div>
                  <FormControl>
                    <Switch 
                      checked={field.value} 
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) {
                          form.setValue("spouseId", "");
                        }
                      }} 
                      disabled={!watchedSex}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {watchedIsMarried && watchedSex && (
              <FormField
                control={form.control}
                name="spouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Cônjuge</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-base sm:text-sm h-10 sm:h-9">
                          <SelectValue placeholder="Selecione o cônjuge..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSpouses.map((spouse) => (
                          <SelectItem key={spouse.id} value={spouse.id}>
                            {spouse.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableSpouses.length === 0 && (
                      <FormDescription className="text-[10px] sm:text-xs text-muted-foreground">
                        Nenhum cônjuge disponível (sexo oposto e solteiro)
                      </FormDescription>
                    )}
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting} className="w-full sm:w-auto order-2 sm:order-1">
                Cancelar
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={form.handleSubmit(handleSaveOnly)}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting && submitAction === "save" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting || !email}
                  onClick={form.handleSubmit(handleSendInvite)}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting && submitAction === "invite" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Convidar
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
