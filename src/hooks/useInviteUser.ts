import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InviteUserParams {
  email: string;
  fullName: string;
  sex?: "Homem" | "Mulher";
  isDriver?: boolean;
  isExempt?: boolean;
  congregationId?: string | null;
}

export function useInviteUser() {
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendInvite = async (params: InviteUserParams) => {
    if (!params.email) {
      toast({
        title: "Email obrigatório",
        description: "Para enviar um convite, é necessário informar o email.",
        variant: "destructive",
      });
      return false;
    }

    setIsInviting(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: params.email,
          fullName: params.fullName,
          sex: params.sex,
          isDriver: params.isDriver,
          isExempt: params.isExempt,
          congregationId: params.congregationId,
        },
      });

      if (error) throw new Error(error.message);
      if (response?.error) throw new Error(response.error);

      toast({
        title: "Convite enviado!",
        description: `Um email foi enviado para ${params.email} com o link de cadastro.`,
      });

      queryClient.invalidateQueries({ queryKey: ["betelitas"] });
      return true;
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast({
        title: "Erro ao enviar convite",
        description: error.message || "Não foi possível enviar o convite. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsInviting(false);
    }
  };

  return {
    sendInvite,
    isInviting,
  };
}
