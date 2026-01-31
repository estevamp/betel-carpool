import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Save, UserPlus } from "lucide-react";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  email: z.string().email("Email inválido").or(z.literal("")),
  sex: z.enum(["Homem", "Mulher"]).optional(),
  isDriver: z.boolean().default(false),
  isExempt: z.boolean().default(false),
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      isDriver: false,
      isExempt: false,
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
    if (!data.email) {
      toast({
        title: "Email obrigatório",
        description: "Para enviar um convite, é necessário informar o email.",
        variant: "destructive",
      });
      return;
    }

    setSubmitAction("invite");
    setIsSubmitting(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: data.email,
          fullName: data.fullName,
          sex: data.sex,
          isDriver: data.isDriver,
          isExempt: data.isExempt,
        },
      });

      if (error) throw new Error(error.message);
      if (response?.error) throw new Error(response.error);

      toast({
        title: "Convite enviado!",
        description: `Um email foi enviado para ${data.email} com o link de cadastro.`,
      });

      form.reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["betelitas"] });
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast({
        title: "Erro ao enviar convite",
        description: error.message || "Não foi possível enviar o convite. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setSubmitAction(null);
    }
  };

  const email = form.watch("email");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Novo Betelita
          </DialogTitle>
          <DialogDescription>
            Adicione um novo membro à lista ou envie um convite por email.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="joao@email.com" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Obrigatório apenas para enviar convite
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Homem">Homem</SelectItem>
                      <SelectItem value="Mulher">Mulher</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isDriver"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Motorista</FormLabel>
                      <FormDescription className="text-xs">
                        Pode criar viagens
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isExempt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Isento</FormLabel>
                      <FormDescription className="text-xs">
                        Não paga transporte
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={form.handleSubmit(handleSaveOnly)}
                className="gap-2"
              >
                {isSubmitting && submitAction === "save" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar
              </Button>
              <Button
                type="button"
                disabled={isSubmitting || !email}
                onClick={form.handleSubmit(handleSendInvite)}
                className="gap-2"
              >
                {isSubmitting && submitAction === "invite" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Enviar Convite
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
