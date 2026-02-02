import { useState } from "react";
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
import { useBetelitas } from "@/hooks/useBetelitas";

const formSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  email: z.string().email("Email inválido").or(z.literal("")),
  sex: z.enum(["Homem", "Mulher"]).optional(),
  isDriver: z.boolean().default(false),
  isExempt: z.boolean().default(false),
  pixKey: z.string().optional(),
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      isDriver: false,
      isExempt: false,
      pixKey: "",
      isMarried: false,
      spouseId: "",
    },
  });

  const handleSaveOnly = async (data: FormData) => {
    setSubmitAction("save");
    setIsSubmitting(true);
    try {
      // Create a placeholder user_id (this betelita won't be able to login until invited)
      const placeholderUserId = crypto.randomUUID();

      const { error } = await supabase.from("profiles").insert({
        user_id: placeholderUserId,
        full_name: data.fullName,
        email: data.email || null,
        sex: data.sex || null,
        is_driver: data.isDriver,
        is_exempt: data.isExempt,
        pix_key: data.pixKey || null,
        is_married: data.isMarried,
        spouse_id: data.isMarried && data.spouseId ? data.spouseId : null,
        congregation_id: selectedCongregationId,
      });

      if (error) throw error;

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
      // Generate the invitation link using Supabase's magic link format
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/auth?email=${encodeURIComponent(data.email)}&type=invite`;

      // Copy to clipboard
      await navigator.clipboard.writeText(inviteUrl);

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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Novo Betelita
          </DialogTitle>
          <DialogDescription>Adicione um novo membro à lista ou envie um convite por email.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="João da Silva" {...field} className="text-sm h-8" />
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
                  <FormLabel className="text-xs">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="joao@email.com" {...field} className="text-sm h-8" />
                  </FormControl>
                  <FormDescription className="text-xs">Obrigatório apenas para enviar convite</FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Sexo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm h-8">
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

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="isDriver"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2">
                    <div className="space-y-0">
                      <FormLabel className="text-xs">Motorista</FormLabel>
                      <FormDescription className="text-xs">Pode criar viagens</FormDescription>
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2">
                    <div className="space-y-0">
                      <FormLabel className="text-xs">Isento</FormLabel>
                      <FormDescription className="text-xs">Não paga transporte</FormDescription>
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
              name="pixKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Chave PIX</FormLabel>
                  <FormControl>
                    <Input placeholder="Chave PIX (opcional)" {...field} className="text-sm h-8" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between py-1">
              <FormField
                control={form.control}
                name="isMarried"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-0">
                      <FormLabel className="text-xs">Casado(a)</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {form.watch("isMarried") && (
              <FormField
                control={form.control}
                name="spouseId"
                render={({ field }) => {
                  const availableSpouses = allBetelitas.filter((b) => {
                    const selectedSex = form.watch("sex");
                    if (!selectedSex) return false;
                    const oppositeSex = selectedSex === "Homem" ? "Mulher" : "Homem";
                    if (b.sex !== oppositeSex) return false;
                    if (b.is_married && b.spouse_id !== field.value) return false;
                    return true;
                  });

                  return (
                    <FormItem>
                      <FormLabel className="text-xs">Cônjuge</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="text-sm h-8">
                            <SelectValue placeholder="Selecione o cônjuge" />
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
                      <FormMessage className="text-xs" />
                    </FormItem>
                  );
                }}
              />
            )}

            <DialogFooter className="flex-col sm:flex-row gap-1 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting} size="sm">
                Cancelar
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={form.handleSubmit(handleSaveOnly)}
                size="sm"
              >
                {isSubmitting && submitAction === "save" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Salvar
              </Button>
              <Button
                type="button"
                disabled={isSubmitting || !email}
                onClick={form.handleSubmit(handleSendInvite)}
                size="sm"
              >
                {(isSubmitting && submitAction === "invite") || isInviting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Mail className="h-3 w-3" />
                )}
                Enviar Convite
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={false}
                onClick={handleCopyLinkClick}
                size="sm"
                title="Copiar link do convite"
              >
                <Copy className="h-3 w-3" />
                Copiar link
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
