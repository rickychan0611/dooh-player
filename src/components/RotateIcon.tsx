import RotateCcw from "lucide-react-native/dist/esm/icons/rotate-ccw";
import RotateCw from "lucide-react-native/dist/esm/icons/rotate-cw";

export function RotateIcon({
  direction,
  size,
  color = "#f4f7f3",
}: {
  direction: "cw" | "ccw";
  size: number;
  color?: string;
}) {
  const Icon = direction === "cw" ? RotateCw : RotateCcw;

  return <Icon size={size} color={color} strokeWidth={2} />;
}
