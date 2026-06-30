import { useEffect, useRef, type RefObject } from "react";
import { Platform, type View } from "react-native";

export const NO_TV_FOCUS = -1;

export function useWebTvRemote({
  itemCount,
  focusIndex,
  setFocusIndex,
  onSelect,
  enabled = true,
}: {
  itemCount: number;
  focusIndex: number;
  setFocusIndex: (index: number | ((current: number) => number)) => void;
  onSelect: (index: number) => void;
  enabled?: boolean;
}) {
  const focusRef = useRef(focusIndex);
  focusRef.current = focusIndex;

  useEffect(() => {
    if (Platform.OS !== "web" || !enabled || itemCount <= 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setFocusIndex((current) =>
          current < 0 ? 0 : Math.min(current + 1, itemCount - 1),
        );
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setFocusIndex((current) =>
          current < 0 ? itemCount - 1 : Math.max(current - 1, 0),
        );
        return;
      }
      if (event.key === "Enter") {
        if (focusRef.current < 0) return;
        event.preventDefault();
        onSelect(focusRef.current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, itemCount, onSelect, setFocusIndex]);
}

export function useWebFocusTarget(ref: RefObject<View | null>, isFocused: boolean) {
  useEffect(() => {
    if (Platform.OS !== "web" || !isFocused) return;
    const node = ref.current as unknown as { focus?: () => void } | null;
    node?.focus?.();
  }, [isFocused, ref]);
}

function isWebFocusActive(focusIndex: number | undefined, index: number) {
  return focusIndex !== undefined && focusIndex >= 0 && focusIndex === index;
}

export { isWebFocusActive };
