import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface TourStep {
  id: string;
  targetSelector: string;
  route: string;
  title: string;
  description: string;
  tip?: string;
  position?: "top" | "bottom" | "left" | "right";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "nova-viagem",
    targetSelector: '[data-tour="nova-viagem"]',
    route: "/viagens",
    title: "Adicionar seu carro a uma viagem",
    description:
      'Clique em <strong>Nova Viagem</strong> para disponibilizar seu carro. Informe a data, horário de saída e quantas vagas você tem disponíveis.',
    tip: "Você pode editar ou cancelar até o horário limite configurado pelo admin.",
    position: "bottom",
  },
  {
    id: "reservar-vaga",
    targetSelector: '[data-tour="reservar-vaga"]',
    route: "/viagens",
    title: "Se incluir como passageiro",
    description:
      'Em um card de viagem com vagas, clique em <strong>Reservar vaga</strong>. Escolha se vai na Ida e Volta, só na Ida ou só na Volta.',
    tip: "O motorista recebe uma notificação assim que você reserva.",
    position: "top",
  },
  {
    id: "procuro-carona",
    targetSelector: '[data-tour="procuro-carona"]',
    route: "/procura-vagas",
    title: "Informar que preciso de carona",
    description:
      'Clique em <strong>Procuro Carona</strong> para registrar que você precisa de vaga num dia específico. Os motoristas verão seu pedido.',
    tip: "Seu pedido fica visível para todos da congregação até ser atendido.",
    position: "bottom",
  },
  {
    id: "nova-ausencia",
    targetSelector: '[data-tour="nova-ausencia"]',
    route: "/ausencia",
    title: "Informar que estarei de férias",
    description:
      'Clique em <strong>Nova Ausência</strong> e registre o período em que você estará fora. Essas viagens não entram no seu cálculo financeiro.',
    tip: "Ausências registradas também evitam reservas indesejadas no seu nome.",
    position: "bottom",
  },
  {
    id: "fechamento-mes",
    targetSelector: '[data-tour="fechamento-mes"]',
    route: "/financeiro",
    title: "Ver quanto devo pagar no fim do mês",
    description:
      'Aqui você vê o resumo financeiro do mês. Após o fechamento, o sistema calcula quanto cada betelita deve pagar ou receber pelos trajetos compartilhados.',
    tip: "Você pode marcar transferências como pagas diretamente nessa tela.",
    position: "top",
  },
];

export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function useTour() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-open on first visit (show_tips = true)
  useEffect(() => {
    if (profile && profile.show_tips === true) {
      const timer = setTimeout(() => startTour(), 900);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const waitForElement = useCallback((selector: string): Promise<Element | null> => {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) { resolve(el); return; }
      let attempts = 0;
      pollRef.current = setInterval(() => {
        const found = document.querySelector(selector);
        attempts++;
        if (found || attempts > 40) {
          if (pollRef.current) clearInterval(pollRef.current);
          resolve(found ?? null);
        }
      }, 60);
    });
  }, []);

  const measureTarget = useCallback(async (step: TourStep) => {
    const el = await waitForElement(step.targetSelector);
    if (!el) { setTargetRect(null); return; }
    const rect = el.getBoundingClientRect();
    setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [waitForElement]);

  const goToStep = useCallback(async (stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= TOUR_STEPS.length) return;
    const step = TOUR_STEPS[stepIndex];
    setCurrentStep(stepIndex);
    setTargetRect(null);
    setIsNavigating(true);
    navigate(step.route);
    // Wait for route transition
    await new Promise((r) => setTimeout(r, 150));
    setIsNavigating(false);
    await measureTarget(step);
  }, [navigate, measureTarget]);

  // Re-measure on resize
  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => measureTarget(TOUR_STEPS[currentStep]);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isOpen, currentStep, measureTarget]);

  const startTour = useCallback(async () => {
    setCurrentStep(0);
    setIsOpen(true);
    await goToStep(0);
  }, [goToStep]);

  const closeTour = useCallback(async (markAsSeen = true) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setIsOpen(false);
    setTargetRect(null);
    if (markAsSeen && profile?.id && profile.show_tips !== false) {
      try {
        await supabase.from("profiles").update({ show_tips: false }).eq("id", profile.id);
        await refreshProfile();
      } catch (err) {
        console.error("[Tour] Erro ao salvar preferência:", err);
      }
    }
  }, [profile, refreshProfile]);

  const nextStep = useCallback(async () => {
    if (currentStep + 1 >= TOUR_STEPS.length) { await closeTour(true); }
    else { await goToStep(currentStep + 1); }
  }, [currentStep, goToStep, closeTour]);

  const prevStep = useCallback(async () => {
    if (currentStep > 0) await goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  return {
    isOpen,
    currentStep,
    targetRect,
    isNavigating,
    totalSteps: TOUR_STEPS.length,
    currentStepData: TOUR_STEPS[currentStep],
    startTour,
    closeTour,
    nextStep,
    prevStep,
    goToStep,
  };
}