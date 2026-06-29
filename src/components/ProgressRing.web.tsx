import { createElement, useEffect, useId, useRef, useState } from "react";

const ROTATE_MS = 60_000;
const STAGGER_MS = 15_000;
const MIN_FLIP_DELAY_MS = 10_000;
const MAX_FLIP_DELAY_MS = 20_000;

function randomFlipDelayMs() {
  return MIN_FLIP_DELAY_MS + Math.random() * (MAX_FLIP_DELAY_MS - MIN_FLIP_DELAY_MS);
}

export type ProgressRingProps = {
  svgSize: number;
  ringStroke: number;
  ringOverflow: number;
  slotPosition: number;
  messageId: string;
  onComplete: () => void;
};

export function ProgressRing({
  svgSize,
  ringStroke,
  ringOverflow,
  slotPosition,
  messageId,
  onComplete,
}: ProgressRingProps) {
  const animId = useId().replace(/:/g, "");
  const isFirstCycle = useRef(true);
  const completedRef = useRef(false);
  const [delayMs, setDelayMs] = useState(() => slotPosition * STAGGER_MS);
  const ringRadius = (svgSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const cx = svgSize / 2;

  useEffect(() => {
    isFirstCycle.current = true;
    completedRef.current = false;
  }, [messageId]);

  useEffect(() => {
    const delay = isFirstCycle.current
      ? slotPosition * STAGGER_MS
      : randomFlipDelayMs();
    isFirstCycle.current = false;
    completedRef.current = false;
    setDelayMs(delay);
  }, [messageId, slotPosition]);

  return createElement(
    "svg",
    {
      width: svgSize,
      height: svgSize,
      style: {
        position: "absolute",
        top: -ringOverflow,
        left: -ringOverflow,
        pointerEvents: "none",
      },
    },
    createElement(
      "style",
      {},
      `@keyframes ${animId}{from{stroke-dashoffset:0}to{stroke-dashoffset:${circumference}}}`,
    ),
    createElement("circle", {
      key: messageId,
      cx,
      cy: cx,
      r: ringRadius,
      fill: "none",
      stroke: "#000000",
      strokeWidth: ringStroke,
      strokeLinecap: "round",
      strokeDasharray: circumference,
      strokeDashoffset: 0,
      transform: `rotate(-90 ${cx} ${cx})`,
      style: {
        animation: `${animId} ${ROTATE_MS}ms linear ${delayMs}ms forwards`,
      },
      onAnimationEnd: () => {
        if (completedRef.current) return;
        completedRef.current = true;
        onComplete();
      },
    }),
  );
}
