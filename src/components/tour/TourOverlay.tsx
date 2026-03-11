import { motion, AnimatePresence } from "framer-motion";
import { Car, UserPlus, Search, Plane, Wallet, X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourStep {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  title: string;
  description: string;
  tip: string;
  route: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: Car,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    title: "Adicionar seu carro a uma viagem",
    description:
      'Acesse a página <strong>Viagens</strong> e clique no botão <strong>"+ Nova Viagem"</strong>. Preencha a data, horário de saída e o número de vagas disponíveis no seu carro.',
    tip: "Você pode editar ou cancelar a viagem até o horário limite configurado pelo administrador.",
    route: "/viagens",
  },
  {
    icon: UserPlus,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    title: "Se incluir como passageiro",
    description:
      'Na página <strong>Viagens</strong>, encontre uma viagem com vagas disponíveis e clique em <strong>"Reservar vaga"</strong>. Escolha o tipo de trajeto (Ida e Volta, Apenas Ida ou Apenas Volta).',
    tip: "O motorista recebe uma notificação quando você reserva uma vaga no carro dele.",
    route: "/viagens",
  },
  {
    icon: Search,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    title: "Informar que preciso de carona",
    description:
      'Acesse <strong>Preciso de Carona</strong> no menu lateral. Registre que você está procurando carona para um dia específico — isso avisa os motoristas que precisam de mais passageiros.',
    tip: "Motoristas conseguem ver quem está precisando de carona e podem entrar em contato diretamente.",
    route: "/procura-vagas",
  },
  {
    icon: Plane,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    title: "Informar que estarei de férias",
    description:
      'Vá até <strong>Ausência</strong> no menu e registre o período em que você estará fora. Assim o sistema não conta as viagens desse período no seu cálculo financeiro.',
    tip: "Ausências registradas também evitam que motoristas reservem vagas para você sem querer.",
    route: "/ausencia",
  },
  {
    icon: Wallet,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    title: "Ver quanto devo pagar no fim do mês",
    description:
      'Acesse <strong>Ajuda de Transporte</strong> no menu. Ao final do mês, o administrador fecha o período e o sistema calcula automaticamente quanto cada betelita deve pagar ou receber.',
    tip: "Você pode marcar as transferências como pagas diretamente nessa tela, facilitando o controle.",
    route: "/financeiro",
  },
];

interface TourOverlayProps {
  isOpen: boolean;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onGoToStep: (step: number) => void;
}

export function TourOverlay({
  isOpen,
  currentStep,
  onNext,
  onPrev,
  onClose,
  onGoToStep,
}: TourOverlayProps) {
  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="tour-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="tour-modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              
              {/* Header bar with step count */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tour rápido
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Step content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="px-5 pb-4"
                >
                  {/* Icon */}
                  <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl mb-4", step.bgColor)}>
                    <step.icon className={cn("h-7 w-7", step.color)} />
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-foreground mb-2 leading-tight">
                    {step.title}
                  </h2>

                  {/* Description */}
                  <p
                    className="text-sm text-muted-foreground leading-relaxed mb-4"
                    dangerouslySetInnerHTML={{ __html: step.description }}
                  />

                  {/* Tip */}
                  <div className="bg-muted/50 rounded-xl px-4 py-3 border border-border/50">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">💡 Dica: </span>
                      {step.tip}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Step dots */}
              <div className="flex items-center justify-center gap-2 py-3">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onGoToStep(i)}
                    className={cn(
                      "rounded-full transition-all duration-200",
                      i === currentStep
                        ? "w-5 h-2 bg-primary"
                        : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
                    )}
                    aria-label={`Ir para passo ${i + 1}`}
                  />
                ))}
              </div>

              {/* Navigation footer */}
              <div className="flex items-center justify-between px-5 pb-5 gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrev}
                  disabled={isFirst}
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <span className="text-xs text-muted-foreground">
                  {currentStep + 1} de {TOUR_STEPS.length}
                </span>

                <Button
                  size="sm"
                  onClick={onNext}
                  className="gap-1.5"
                >
                  {isLast ? (
                    <>
                      Concluir
                      <Sparkles className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Próximo
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { TOUR_STEPS };
