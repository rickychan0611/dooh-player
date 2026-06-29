import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
  const progress = useRef(new Animated.Value(0)).current;
  const isFirstCycle = useRef(true);
  const ringRadius = (svgSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, circumference],
  });

  useEffect(() => {
    progress.setValue(0);
    const delayMs = isFirstCycle.current
      ? slotPosition * STAGGER_MS
      : randomFlipDelayMs();
    isFirstCycle.current = false;

    const animation = Animated.sequence([
      Animated.delay(delayMs),
      Animated.timing(progress, {
        toValue: 1,
        duration: ROTATE_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) onComplete();
    });
    return () => animation.stop();
  }, [messageId, onComplete, progress, slotPosition]);

  return (
    <Svg
      pointerEvents="none"
      width={svgSize}
      height={svgSize}
      style={{ position: "absolute", top: -ringOverflow, left: -ringOverflow }}
    >
      <AnimatedCircle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={ringRadius}
        fill="none"
        stroke="#000000"
        strokeWidth={ringStroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        rotation={-90}
        originX={svgSize / 2}
        originY={svgSize / 2}
      />
    </Svg>
  );
}
