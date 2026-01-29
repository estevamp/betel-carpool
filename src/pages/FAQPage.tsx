import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HelpCircle,
  ChevronDown,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFAQ } from "@/hooks/useFAQ";
import { Skeleton } from "@/components/ui/skeleton";

export default function FAQPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: faqs = [], isLoading, error } = useFAQ();

  // Open first FAQ by default when loaded
  if (faqs.length > 0 && openId === null) {
    setOpenId(faqs[0].id);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Perguntas Frequentes</h1>
        <p className="text-muted-foreground mt-2">
          Encontre respostas para as dúvidas mais comuns
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-5 flex-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive">Erro ao carregar perguntas frequentes</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && faqs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <HelpCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">
            Nenhuma pergunta cadastrada
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            As perguntas frequentes aparecerão aqui
          </p>
        </div>
      )}

      {/* FAQ List */}
      {!isLoading && faqs.length > 0 && (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-card rounded-xl border border-border shadow-card overflow-hidden"
            >
              <button
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">{faq.question}</span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200",
                    openId === faq.id && "rotate-180"
                  )}
                />
              </button>
              <AnimatePresence mode="wait">
                {openId === faq.id && (
                  <motion.div
                    key={`answer-${faq.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 pl-16">
                      <p className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
