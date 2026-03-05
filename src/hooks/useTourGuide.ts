import { useState, useEffect, useCallback } from "react";

export interface TourStep {
  target: string; // CSS selector or data-tour attribute value
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
}

const TOUR_STORAGE_KEY = "fsa_tour_completed";

function getCompletedTours(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useTourGuide(tourId: string, steps: TourStep[]) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const completed = getCompletedTours();
    if (!completed.includes(tourId) && steps.length > 0) {
      const timer = setTimeout(() => setIsActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, [tourId, steps.length]);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      complete();
    }
  }, [currentStep, steps.length]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const skip = useCallback(() => {
    complete();
  }, []);

  const complete = useCallback(() => {
    setIsActive(false);
    const completed = getCompletedTours();
    if (!completed.includes(tourId)) {
      completed.push(tourId);
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
    }
  }, [tourId]);

  const restart = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  return {
    isActive,
    currentStep,
    step: steps[currentStep] || null,
    totalSteps: steps.length,
    next,
    prev,
    skip,
    restart,
  };
}
