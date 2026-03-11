import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function useTour() {
  const { profile, refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Abre o tour automaticamente na primeira vez (show_tips = true)
  useEffect(() => {
    if (profile && profile.show_tips === true) {
      // Pequeno delay para garantir que o layout já renderizou
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [profile?.id]); // só roda quando o perfil carrega pela primeira vez

  const closeTour = useCallback(async (markAsSeen = true) => {
    setIsOpen(false);
    setCurrentStep(0);

    if (markAsSeen && profile?.id && profile.show_tips !== false) {
      try {
        await supabase
          .from("profiles")
          .update({ show_tips: false })
          .eq("id", profile.id);
        await refreshProfile();
      } catch (err) {
        console.error("[Tour] Erro ao salvar preferência:", err);
      }
    }
  }, [profile, refreshProfile]);

  const openTour = useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const nextStep = useCallback((totalSteps: number) => {
    setCurrentStep((prev) => {
      if (prev + 1 >= totalSteps) {
        closeTour(true);
        return prev;
      }
      return prev + 1;
    });
  }, [closeTour]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  return {
    isOpen,
    currentStep,
    openTour,
    closeTour,
    nextStep,
    prevStep,
    goToStep,
  };
}