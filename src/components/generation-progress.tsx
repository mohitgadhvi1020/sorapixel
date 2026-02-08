"use client";

import { PipelineStep } from "@/types";

interface GenerationProgressProps {
  currentStep: PipelineStep;
}

const STEPS: { key: PipelineStep; label: string }[] = [
  { key: "uploading", label: "Uploading image" },
  { key: "removing-background", label: "Removing background" },
  { key: "generating-scene", label: "Generating studio scene" },
  { key: "finalizing", label: "Finalizing image" },
];

export default function GenerationProgress({
  currentStep,
}: GenerationProgressProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="w-full max-w-md mx-auto py-8">
      <div className="flex flex-col gap-4">
        {STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  transition-all duration-300
                  ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-blue-500 text-white"
                      : "bg-zinc-200 text-zinc-400"
                  }
                `}
              >
                {isCompleted ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : isActive ? (
                  <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>
              <span
                className={`
                  text-sm font-medium transition-colors duration-300
                  ${
                    isActive
                      ? "text-blue-600"
                      : isCompleted
                      ? "text-green-600"
                      : "text-zinc-400"
                  }
                `}
              >
                {step.label}
                {isActive && (
                  <span className="inline-flex ml-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce [animation-delay:0.2s]">
                      .
                    </span>
                    <span className="animate-bounce [animation-delay:0.4s]">
                      .
                    </span>
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
