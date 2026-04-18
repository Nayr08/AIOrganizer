import marketingToolsAnimation from "@/public/lottie/Ai-powered marketing tools abstract.json";
import { LottiePlayer } from "./LottiePlayer";

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-[28px] border border-[#3e404b] bg-[#2f2f2f] px-6 py-10">
      <LottiePlayer
        animationData={marketingToolsAnimation}
        className="h-44 w-44 sm:h-56 sm:w-56"
        loop={false}
      />
      <div className="space-y-2 text-center">
        <p className="text-base font-semibold text-[#f7f7f8]">
          Organizing your tasks
        </p>
        <p className="max-w-md text-sm leading-6 text-[#a9aab5]">
          The AI is separating each activity, identifying dates and time ranges,
          and preparing clean task cards for review.
        </p>
      </div>
    </div>
  );
}
