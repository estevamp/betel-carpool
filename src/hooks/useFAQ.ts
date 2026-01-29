import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  order_index: number | null;
}

export function useFAQ() {
  return useQuery({
    queryKey: ["faq"],
    queryFn: async (): Promise<FAQ[]> => {
      const { data, error } = await supabase
        .from("faq")
        .select("id, question, answer, order_index")
        .eq("is_active", true)
        .order("order_index", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}
