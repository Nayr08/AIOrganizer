"use client";

import Lottie from "lottie-react";

interface LottiePlayerProps {
  animationData: object;
  className?: string;
  loop?: boolean;
}

export function LottiePlayer({
  animationData,
  className = "",
  loop = true,
}: LottiePlayerProps) {
  return <Lottie animationData={animationData} loop={loop} className={className} />;
}
