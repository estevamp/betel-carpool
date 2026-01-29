import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HelpCircle,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// FAQ data based on the CSV
const faqs = [
  {
    id: 1,
    question: "Como as transferências são calculadas?",
    answer: "O sistema calcula automaticamente os débitos e créditos com base nas viagens realizadas. Cada viagem de ida e volta custa R$ 15,00 (valor configurável). Se você fizer apenas ida ou apenas volta, paga R$ 7,50. No final do mês, o sistema otimiza as transferências para minimizar a quantidade de transações necessárias entre os betelitas.",
  },
  {
    id: 2,
    question: "Como o aplicativo considera as esposas nos cálculos?",
    answer: "Para casais, os débitos e créditos da esposa são automaticamente vinculados ao marido. Isso significa que se a esposa viaja como passageira, o débito aparece no relatório do marido. Da mesma forma, se o casal dá carona juntos, o crédito é contabilizado apenas uma vez para o marido, já que a viagem da esposa é contabilizada como débito (que se anula com o crédito).",
  },
  {
    id: 3,
    question: "Por que preciso fazer login no aplicativo?",
    answer: "O login permite que o sistema identifique você e mostre suas informações personalizadas: suas viagens, seu relatório financeiro, suas reservas, etc. Também permite que você reserve vagas em viagens e registre ausências. Suas credenciais são seguras e protegidas.",
  },
  {
    id: 4,
    question: "Como preencho meu perfil após fazer login?",
    answer: "Após o primeiro login, você será direcionado para a página de perfil onde pode adicionar suas informações: nome completo, email, sexo, se é motorista (possui veículo), chave PIX para receber pagamentos, e se é casada/casado (para vincular ao cônjuge). Apenas administradores podem marcar usuários como isentos ou administradores.",
  },
  {
    id: 5,
    question: "O que faço se eu mudar de motorista ou passageiro na última hora?",
    answer: "Se precisar cancelar sua reserva ou mudar de viagem, acesse 'Minhas Viagens' e cancele a reserva atual. Depois, procure a nova viagem desejada e faça uma nova reserva. O motorista receberá uma notificação sobre a mudança. Se for motorista e precisar cancelar a viagem, avise os passageiros com antecedência.",
  },
  {
    id: 6,
    question: "Como vejo as viagens disponíveis?",
    answer: "Acesse a seção 'Viagens' no menu lateral. Lá você verá todas as viagens programadas com vagas disponíveis. Você pode filtrar por data e buscar por motorista ou passageiro. Viagens com vagas aparecem destacadas em verde, e você pode reservar sua vaga clicando no botão 'Reservar Vaga'.",
  },
];

export default function FAQPage() {
  const [openId, setOpenId] = useState<number | null>(1);

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

      {/* FAQ List */}
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
    </div>
  );
}
