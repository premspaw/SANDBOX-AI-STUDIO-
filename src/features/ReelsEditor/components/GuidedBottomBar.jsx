import React from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { STEPS } from './GuidedStepperHeader.jsx';

export function GuidedBottomBar({
  currentStepIndex,
  onPreviousStep,
  onNextStep,
  onSurpriseMe,
  isSurprising,
}) {
  const currentStep = STEPS[currentStepIndex];
  const nextStep = STEPS[currentStepIndex + 1];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // Next button label: e.g. "Next: Fonts", "Next: Hook", "Next: Captions"
  const nextLabel = nextStep
    ? `Next: ${nextStep.label.replace(/^[0-9]+\s*/, '')}`
    : 'Export Reel';

  return (
    <footer className="h-16 border-t border-white/10 bg-zinc-950 px-4 md:px-8 flex items-center justify-between z-40 shrink-0 select-none">
      {/* Back button */}
      <div>
        <button
          onClick={onPreviousStep}
          disabled={isFirstStep}
          className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-xs md:text-sm font-semibold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Center: Step indicator & Surprise Me */}
      <div className="flex items-center gap-3 md:gap-4">
        {currentStep.stepNumber > 0 && (
          <span className="text-xs md:text-sm font-medium text-zinc-400">
            Step {currentStep.stepNumber} of 6
          </span>
        )}

        <button
          onClick={onSurpriseMe}
          disabled={isSurprising}
          className="px-3.5 py-1.5 md:px-4 md:py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-xs md:text-sm font-semibold text-white transition-all flex items-center gap-2 hover:border-[#c8f135]/40 shadow-sm"
          title="Let AI pick a fresh, high-converting aesthetic combination"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#c8f135] animate-pulse" />
          <span>Surprise me</span>
        </button>
      </div>

      {/* Next Step button */}
      <div>
        <button
          onClick={onNextStep}
          className="px-5 py-2 rounded-xl bg-[#c8f135] text-black font-black text-xs md:text-sm uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#c8f135]/25 flex items-center gap-1.5"
        >
          <span>{nextLabel}</span>
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </footer>
  );
}
