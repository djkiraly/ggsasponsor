"use client";

export function MobileStepIndicator({
  currentStep,
  totalSteps,
  stepLabels,
}: {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-sm text-slate-500">
          {stepLabels[currentStep]}
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i <= currentStep ? "bg-[#1C3FCF]" : "bg-[#E2E8F0]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
