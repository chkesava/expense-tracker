import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { StorySlide } from "../../hooks/useStoryGenerator";
import { cn } from "../../lib/utils";

interface StoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
  slides: StorySlide[];
}

function StoryBars({ slide }: { slide: StorySlide }) {
  if (!slide.data?.bars?.length) return null;

  return (
    <div className="mt-6 w-full space-y-3 rounded-[1.75rem] border border-white/15 bg-black/20 p-4 backdrop-blur-sm">
      {slide.data.bars.map((bar) => (
        <div key={bar.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-4 text-xs font-semibold text-white/80">
            <span>{bar.label}</span>
            <span>{bar.formattedValue}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${bar.value}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full bg-white"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StoryViewer({ isOpen, onClose, slides }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const draggedRef = useRef(false);

  useEffect(() => {
    document.body.classList.toggle("story-overlay-open", isOpen);

    return () => {
      document.body.classList.remove("story-overlay-open");
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || slides.length === 0) return;

    const currentSlide = slides[currentIndex];
    const timeout = window.setTimeout(() => {
      if (currentIndex < slides.length - 1) {
        setCurrentIndex((value) => value + 1);
      } else {
        onClose();
      }
    }, currentSlide?.durationMs ?? 6000);

    return () => window.clearTimeout(timeout);
  }, [currentIndex, isOpen, onClose, slides]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setCurrentIndex((value) => Math.min(value + 1, slides.length - 1));
      }
      if (event.key === "ArrowLeft") {
        setCurrentIndex((value) => Math.max(value - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, slides.length]);

  if (!slides.length) return null;

  const safeIndex = Math.min(currentIndex, slides.length - 1);
  const currentSlide = slides[safeIndex];

  const goNext = () => {
    if (safeIndex < slides.length - 1) {
      setCurrentIndex((value) => value + 1);
      return;
    }

    onClose();
  };

  const goPrev = (event?: React.MouseEvent | React.PointerEvent) => {
    event?.stopPropagation();
    setCurrentIndex((value) => Math.max(value - 1, 0));
  };

  const handleStoryTap = (event: React.MouseEvent<HTMLDivElement>) => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const tapX = event.clientX - bounds.left;
    const midpoint = bounds.width / 2;

    if (tapX < midpoint) {
      goPrev();
      return;
    }

    goNext();
  };

  return (
    <AnimatePresence>
      {isOpen && currentSlide && (
        <motion.div
          key="monthly-wrap-story"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black"
        >
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-950">
            <div className={cn("absolute inset-0 bg-gradient-to-br", currentSlide.color)} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_36%),radial-gradient(circle_at_bottom,rgba(15,23,42,0.45),transparent_42%)]" />

            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.03, y: -18 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              drag="y"
              dragDirectionLock
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.y) > 8) {
                  draggedRef.current = true;
                  window.setTimeout(() => {
                    draggedRef.current = false;
                  }, 0);
                }

                if (info.offset.y > 120 || info.velocity.y > 650) {
                  onClose();
                }
              }}
              className="relative flex h-full w-full max-w-md flex-col overflow-hidden sm:h-[92vh] sm:rounded-[2rem] sm:border sm:border-white/10 sm:shadow-[0_24px_80px_rgba(15,23,42,0.45)]"
              onClick={handleStoryTap}
            >
              <div className="absolute left-0 right-0 top-0 z-20 p-3 sm:p-4">
                <div className="flex gap-1.5">
                  {slides.map((slide, index) => (
                    <div key={slide.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: index < safeIndex ? "100%" : index === safeIndex ? "100%" : "0%",
                        }}
                        transition={
                          index === safeIndex
                            ? { duration: (currentSlide.durationMs ?? 6000) / 1000, ease: "linear" }
                            : { duration: 0 }
                        }
                        className="h-full rounded-full bg-white"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-bold backdrop-blur">
                      ET
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Monthly Wrap</div>
                      <div className="text-xs text-white/70">
                        Slide {safeIndex + 1} of {slides.length}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-white/15 bg-black/20 p-2 text-white/85 backdrop-blur transition hover:bg-black/35"
                    aria-label="Close monthly wrap"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="relative z-10 mt-auto flex flex-1 flex-col justify-center px-6 pb-10 pt-28 text-white sm:px-8 sm:pt-32">
                <div className="mb-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-white/75">
                  <span className={cn("rounded-full px-3 py-1", currentSlide.accent ?? "bg-white/15 text-white")}>
                    {currentSlide.eyebrow ?? "Story"}
                  </span>
                </div>

                {currentSlide.data?.emoji && (
                  <div className="mb-6 text-6xl drop-shadow-[0_18px_30px_rgba(15,23,42,0.35)]">
                    {currentSlide.data.emoji}
                  </div>
                )}

                <div className="max-w-sm">
                  <h2 className="text-4xl font-black leading-none tracking-tight sm:text-5xl">
                    {currentSlide.title}
                  </h2>

                  {currentSlide.value && (
                    <div className="mt-5 text-3xl font-black tracking-tight text-white/95 sm:text-4xl">
                      {currentSlide.value}
                    </div>
                  )}

                  {currentSlide.subtitle && (
                    <p className="mt-5 text-base leading-7 text-white/82 sm:text-lg">
                      {currentSlide.subtitle}
                    </p>
                  )}

                  {currentSlide.caption && (
                    <p className="mt-3 text-sm leading-6 text-white/62">
                      {currentSlide.caption}
                    </p>
                  )}
                </div>

                {currentSlide.data?.chips?.length ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {currentSlide.data.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/88 backdrop-blur-sm"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}

                <StoryBars slide={currentSlide} />

                <div className="mt-auto flex items-center justify-center pt-8 text-white/75">
                  <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] backdrop-blur-sm">
                    Tap sides or pull down
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
