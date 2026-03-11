import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TourStep, TargetRect } from "@/hooks/useTour";

const PADDING = 8;
const CARD_MARGIN = 14;
const CARD_MAX_WIDTH = 320;
const CARD_SIDE_MARGIN = 12;

function getCardWidth() {
  return Math.min(CARD_MAX_WIDTH, window.innerWidth - CARD_SIDE_MARGIN * 2);
}

interface TooltipPos {
  top: number;
  left: number;
  arrowSide: "top" | "bottom" | "left" | "right" | null;
}

function computeTooltipPos(
  rect: TargetRect,
  preferred: TourStep["position"],
  cardHeight: number,
): TooltipPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = getCardWidth();

  const spotTop    = rect.top  - PADDING;
  const spotLeft   = rect.left - PADDING;
  const spotRight  = rect.left + rect.width  + PADDING;
  const spotBottom = rect.top  + rect.height + PADDING;

  const spaceBelow = vh - spotBottom;
  const spaceAbove = spotTop;
  const spaceRight = vw - spotRight;
  const spaceLeft  = spotLeft;

  const clampedLeft = (raw: number) =>
    Math.max(CARD_SIDE_MARGIN, Math.min(vw - cardWidth - CARD_SIDE_MARGIN, raw));

  const centeredLeft = rect.left + rect.width / 2 - cardWidth / 2;

  const order: TourStep["position"][] = preferred
    ? [preferred, "bottom", "top", "right", "left"]
    : ["bottom", "top", "right", "left"];

  for (const side of [...new Set(order)]) {
    if (side === "bottom" && spaceBelow >= cardHeight + CARD_MARGIN) {
      return { top: spotBottom + CARD_MARGIN, left: clampedLeft(centeredLeft), arrowSide: "top" };
    }
    if (side === "top" && spaceAbove >= cardHeight + CARD_MARGIN) {
      return { top: spotTop - cardHeight - CARD_MARGIN, left: clampedLeft(centeredLeft), arrowSide: "bottom" };
    }
    if (side === "right" && spaceRight >= cardWidth + CARD_MARGIN) {
      return {
        top: Math.max(CARD_SIDE_MARGIN, Math.min(vh - cardHeight - CARD_SIDE_MARGIN, rect.top + rect.height / 2 - cardHeight / 2)),
        left: spotRight + CARD_MARGIN,
        arrowSide: "left",
      };
    }
    if (side === "left" && spaceLeft >= cardWidth + CARD_MARGIN) {
      return {
        top: Math.max(CARD_SIDE_MARGIN, Math.min(vh - cardHeight - CARD_SIDE_MARGIN, rect.top + rect.height / 2 - cardHeight / 2)),
        left: spotLeft - cardWidth - CARD_MARGIN,
        arrowSide: "right",
      };
    }
  }

  return {
    top:  Math.max(CARD_SIDE_MARGIN, vh / 2 - cardHeight / 2),
    left: Math.max(CARD_SIDE_MARGIN, vw / 2 - cardWidth / 2),
    arrowSide: null,
  };
}

// Animated SVG path for the spotlight hole — morphs smoothly between positions
function buildSpotlightPath(vw: number, vh: number, sr: { x: number; y: number; w: number; h: number; r: number } | null) {
  const base = `M0 0 H${vw} V${vh} H0 Z`;
  if (!sr) return base;
  return (
    base +
    ` M${sr.x + sr.r} ${sr.y}` +
    ` H${sr.x + sr.w - sr.r}` +
    ` Q${sr.x + sr.w} ${sr.y} ${sr.x + sr.w} ${sr.y + sr.r}` +
    ` V${sr.y + sr.h - sr.r}` +
    ` Q${sr.x + sr.w} ${sr.y + sr.h} ${sr.x + sr.w - sr.r} ${sr.y + sr.h}` +
    ` H${sr.x + sr.r}` +
    ` Q${sr.x} ${sr.y + sr.h} ${sr.x} ${sr.y + sr.h - sr.r}` +
    ` V${sr.y + sr.r}` +
    ` Q${sr.x} ${sr.y} ${sr.x + sr.r} ${sr.y} Z`
  );
}

interface TourSpotlightProps {
  isOpen: boolean;
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: TargetRect | null;
  isNavigating: boolean;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onGoToStep: (i: number) => void;
}

export function TourSpotlight({
  isOpen,
  step,
  stepIndex,
  totalSteps,
  targetRect,
  isNavigating,
  onNext,
  onPrev,
  onClose,
  onGoToStep,
}: TourSpotlightProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const [vsize, setVsize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [cardWidth, setCardWidth] = useState(getCardWidth());
  // Track previous stepIndex to determine slide direction
  const prevStepRef = useRef(stepIndex);
  const [slideDir, setSlideDir] = useState<1 | -1>(1); // 1 = forward, -1 = back

  useEffect(() => {
    if (stepIndex !== prevStepRef.current) {
      setSlideDir(stepIndex > prevStepRef.current ? 1 : -1);
      prevStepRef.current = stepIndex;
    }
  }, [stepIndex]);

  useEffect(() => {
    const onResize = () => {
      setVsize({ w: window.innerWidth, h: window.innerHeight });
      setCardWidth(getCardWidth());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    if (!targetRect || !cardRef.current) { setTooltipPos(null); return; }
    const cardHeight = cardRef.current.offsetHeight || 220;
    setTooltipPos(computeTooltipPos(targetRect, step.position, cardHeight));
  }, [targetRect, step, vsize]);

  const sr = targetRect
    ? {
        x: targetRect.left - PADDING,
        y: targetRect.top  - PADDING,
        w: targetRect.width  + PADDING * 2,
        h: targetRect.height + PADDING * 2,
        r: 10,
      }
    : null;

  const isFirst = stepIndex === 0;
  const isLast  = stepIndex === totalSteps - 1;

  const spotlightPath = buildSpotlightPath(vsize.w, vsize.h, sr);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── SVG overlay — stays mounted, path morphs smoothly ── */}
          <motion.svg
            key="tour-svg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{ width: "100vw", height: "100vh" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <clipPath id="spotlight-clip">
                {/* Animate the path so the spotlight hole glides to the next element */}
                <motion.path
                  fillRule="evenodd"
                  animate={{ d: spotlightPath }}
                  transition={{ type: "spring", stiffness: 260, damping: 32 }}
                />
              </clipPath>
            </defs>

            <rect x="0" y="0" width="100%" height="100%"
              fill="rgba(0,0,0,0.55)" clipPath="url(#spotlight-clip)" />

            {/* Spotlight border — also morphs */}
            {sr && (
              <motion.rect
                animate={{ x: sr.x, y: sr.y, width: sr.w, height: sr.h, rx: sr.r }}
                transition={{ type: "spring", stiffness: 260, damping: 32 }}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
            )}
          </motion.svg>

          {/* Clickable backdrop */}
          <div className="fixed inset-0 z-[100] cursor-pointer" onClick={onClose} aria-hidden />

          {/* ── Tooltip card — stays mounted, slides to new position ── */}
          <motion.div
            key="tour-card"
            ref={cardRef}
            // Enter animation (first mount only)
            initial={{ opacity: 0, scale: 0.93, y: 10 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              // Smoothly glide to new position when tooltipPos changes
              top: tooltipPos?.top ?? "50%",
              left: tooltipPos?.left ?? "50%",
            }}
            exit={{ opacity: 0, scale: 0.93, y: 10 }}
            transition={{
              // Position glide: spring
              top:  { type: "spring", stiffness: 260, damping: 32 },
              left: { type: "spring", stiffness: 260, damping: 32 },
              // Enter/exit: quick ease
              opacity: { duration: 0.2 },
              scale:   { type: "spring", stiffness: 340, damping: 28 },
              y:       { type: "spring", stiffness: 340, damping: 28 },
            }}
            className="fixed z-[102] pointer-events-auto"
            style={{
              width: cardWidth,
              // When tooltipPos is null (not yet computed), center on screen
              ...(tooltipPos ? {} : { transform: "translate(-50%, -50%)" }),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Tour guiado
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* ── Step content — crossfades between steps ── */}
              <div className="px-4 pb-2 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={stepIndex}
                    initial={{ opacity: 0, x: slideDir * 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: slideDir * -18 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {isNavigating ? (
                      <div className="flex items-center gap-2 py-4">
                        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span className="text-sm text-muted-foreground">Navegando...</span>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-bold text-foreground text-base leading-snug mb-2">
                          {step.title}
                        </h3>
                        <p
                          className="text-sm text-muted-foreground leading-relaxed mb-3"
                          dangerouslySetInnerHTML={{ __html: step.description }}
                        />
                        {step.tip && (
                          <div className="bg-muted/60 rounded-xl px-3 py-2.5 border border-border/50 mb-1">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              <span className="font-semibold text-foreground">💡 </span>
                              {step.tip}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Step dots */}
              <div className="flex justify-center gap-1.5 py-2">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onGoToStep(i)}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      i === stepIndex
                        ? "w-4 h-1.5 bg-primary"
                        : "w-1.5 h-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/50",
                    )}
                    aria-label={`Ir para passo ${i + 1}`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between px-4 pb-4 gap-2">
                <Button
                  variant="ghost" size="sm"
                  onClick={onPrev}
                  disabled={isFirst || isNavigating}
                  className="gap-1 h-8 text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {stepIndex + 1} / {totalSteps}
                </span>
                <Button
                  size="sm"
                  onClick={onNext}
                  disabled={isNavigating}
                  className="gap-1 h-8 text-xs"
                >
                  {isLast
                    ? <><Sparkles className="h-3.5 w-3.5" /> Concluir</>
                    : <>Próximo <ArrowRight className="h-3.5 w-3.5" /></>
                  }
                </Button>
              </div>
            </div>

            {/* Arrow pointer */}
            {tooltipPos?.arrowSide && (
              <div
                className={cn(
                  "absolute w-0 h-0 border-solid",
                  tooltipPos.arrowSide === "top" &&
                    "top-[-7px] left-1/2 -translate-x-1/2 border-l-[7px] border-r-[7px] border-b-[7px] border-l-transparent border-r-transparent border-b-border",
                  tooltipPos.arrowSide === "bottom" &&
                    "bottom-[-7px] left-1/2 -translate-x-1/2 border-l-[7px] border-r-[7px] border-t-[7px] border-l-transparent border-r-transparent border-t-border",
                  tooltipPos.arrowSide === "left" &&
                    "left-[-7px] top-1/2 -translate-y-1/2 border-t-[7px] border-b-[7px] border-r-[7px] border-t-transparent border-b-transparent border-r-border",
                  tooltipPos.arrowSide === "right" &&
                    "right-[-7px] top-1/2 -translate-y-1/2 border-t-[7px] border-b-[7px] border-l-[7px] border-t-transparent border-b-transparent border-l-border",
                )}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}