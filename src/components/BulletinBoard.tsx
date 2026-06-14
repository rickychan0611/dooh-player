import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import Svg, { Circle } from "react-native-svg";
import {
  bulletinCategoryColor,
  formatBulletinCategoryLabel,
} from "../lib/shared";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import {
  clampSlotIndices,
  initialSlotIndices,
  nextPostIndex,
} from "../services/rotation";
import type { CachedManifest } from "../types";

type BulletinMessage = CachedManifest["bulletin"]["messages"][number];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ROTATE_MS = 60_000;
const STAGGER_MS = 15_000;
const MIN_FLIP_DELAY_MS = 10_000;
const MAX_FLIP_DELAY_MS = 20_000;
const BOARD_COLUMNS = 5;
const BOARD_ROWS = 3;

function randomFlipDelayMs() {
  return MIN_FLIP_DELAY_MS + Math.random() * (MAX_FLIP_DELAY_MS - MIN_FLIP_DELAY_MS);
}

function dropShadow({
  offsetY,
  blur,
  opacity,
  color = "#000000",
  elevation = 8,
}: {
  offsetY: number;
  blur: number;
  opacity: number;
  color?: string;
  elevation?: number;
}) {
  if (Platform.OS === "web") {
    return {
      boxShadow: `0px ${offsetY}px ${blur}px rgba(0, 0, 0, ${opacity})`,
    };
  }

  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowOffset: { width: 0, height: offsetY },
    shadowRadius: blur,
    elevation,
  };
}

export function BulletinBoard({
  manifest,
  onItemChange,
}: {
  manifest: CachedManifest;
  onItemChange: (id: string | null) => void;
}) {
  const scale = useResponsiveScale();
  const boardPadding = 14 * scale;
  const boardGap = 10 * scale;
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const messages = useMemo(
    () =>
      [...manifest.bulletin.messages].sort(
        (a, b) =>
          (a.postNumber ?? Number.POSITIVE_INFINITY) -
          (b.postNumber ?? Number.POSITIVE_INFINITY),
      ),
    [manifest.bulletin.messages],
  );
  const totalPosts = messages.length;

  const [slotIndices, setSlotIndices] = useState<number[]>(() =>
    initialSlotIndices(totalPosts),
  );

  useEffect(() => {
    setSlotIndices((current) => clampSlotIndices(current, totalPosts));
  }, [totalPosts]);

  const handleSlotComplete = useCallback(
    (slotPosition: number) => {
      setSlotIndices((current) =>
        current.map((index, position) =>
          position === slotPosition
            ? nextPostIndex(index, totalPosts)
            : index,
        ),
      );
    },
    [totalPosts],
  );

  const firstSlotId = messages[slotIndices[0]]?.id ?? null;
  useEffect(() => {
    onItemChange(firstSlotId);
  }, [firstSlotId, onItemChange]);

  const onBoardLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      setBoardSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    },
    [],
  );

  const cellSize =
    boardSize.width > 0 && boardSize.height > 0
      ? {
          width:
            (boardSize.width -
              boardPadding * 2 -
              boardGap * (BOARD_COLUMNS - 1)) /
            BOARD_COLUMNS,
          height:
            (boardSize.height -
              boardPadding * 2 -
              boardGap * (BOARD_ROWS - 1)) /
            BOARD_ROWS,
        }
      : null;

  return (
    <View
      onLayout={onBoardLayout}
      style={[
        styles.board,
        {
          padding: boardPadding,
          gap: boardGap,
        },
      ]}
    >
      {slotIndices.map((postIndex, slotPosition) => {
        const message = messages[postIndex];
        if (!message) {
          return (
            <View
              key={`slot-${slotPosition}`}
              style={[styles.card, cellSize, styles.emptyCard]}
            />
          );
        }
        return (
          <BulletinCard
            key={`slot-${slotPosition}`}
            slotPosition={slotPosition}
            message={message}
            scale={scale}
            cellSize={cellSize}
            onComplete={handleSlotComplete}
          />
        );
      })}

      <View
        style={[
          styles.card,
          cellSize,
          styles.qrCard,
          {
            padding: 10 * scale,
            borderRadius: 5 * scale,
            ...dropShadow({
              offsetY: 4 * scale,
              blur: 7 * scale,
              opacity: 0.25,
              elevation: 6,
            }),
          },
        ]}
      >
        {manifest.settings.showQrCode && manifest.bulletin.qrCodeUrl ? (
          <>
            <Text
              style={[
                styles.qrBoardTitle,
                { fontSize: 23 * scale, marginBottom: 4 * scale },
              ]}
            >
              Community Board
            </Text>
          
            <QRCode
              value={manifest.bulletin.qrCodeUrl}
              size={132 * scale}
              backgroundColor="#fff9e9"
            />
            <Text
              style={[
                styles.qrTitle,
                { fontSize: 14 * scale, marginTop: 8 * scale },
              ]}
            >
              Scan to view full message, contact, or add new posts. FREE!
            </Text>
          </>
        ) : (
          <Text style={[styles.qrUnavailable, { fontSize: 12 * scale }]}>
            Posting unavailable
          </Text>
        )}
      </View>
    </View>
  );
}

function BulletinCard({
  slotPosition,
  message,
  scale,
  cellSize,
  onComplete,
}: {
  slotPosition: number;
  message: BulletinMessage;
  scale: number;
  cellSize: { width: number; height: number } | null;
  onComplete: (slotPosition: number) => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const isFirstCycle = useRef(true);
  const bgColor = bulletinCategoryColor(message.category);

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
      if (finished) onComplete(slotPosition);
    });
    return () => animation.stop();
  }, [message.id, onComplete, slotPosition, progress]);

  const badgeSize = 32 * scale;
  const ringStroke = 2 * scale;
  const ringOverflow = 1;
  const svgSize = badgeSize + ringOverflow * 2;
  const ringRadius = (svgSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, circumference],
  });

  return (
    <View
      style={[
        styles.card,
        cellSize,
        {
          borderRadius: 5 * scale,
          transform: [
            { rotate: slotPosition % 2 === 0 ? "-1.56deg" : "0.25deg" },
          ],
          ...dropShadow({
            offsetY: 4 * scale,
            blur: 8 * scale,
            opacity: 0.3,
          }),
        },
      ]}
    >
      <View
        style={[
          styles.postCard,
          {
            padding: 10 * scale,
            borderRadius: 5 * scale,
            backgroundColor: bgColor,
          },
        ]}
      >
      <Text
        numberOfLines={1}
        style={[
          styles.category,
          {
            fontSize: 11 * scale,
            lineHeight: 14 * scale,
          },
        ]}
      >
        {formatBulletinCategoryLabel(message.category)}
      </Text>
      <Text
        numberOfLines={2}
        ellipsizeMode="tail"
        style={[
          styles.title,
          {
            fontSize: 22 * scale,
            lineHeight: 27 * scale,
            marginBottom: 8 * scale,
          },
        ]}
      >
        {message.title}
      </Text>
      <View
        style={[
          styles.bodyWrap,
          { paddingBottom: badgeSize + 4 * scale },
        ]}
      >
        <Text
          numberOfLines={5}
          ellipsizeMode="tail"
          style={[
            styles.body,
            {
              fontSize: 17 * scale,
              lineHeight: 22 * scale,
              fontWeight: "500",
            },
          ]}
        >
          {message.body}
        </Text>
      </View>
      <View
        style={[
          styles.postNumber,
          {
            right: 7 * scale,
            bottom: 7 * scale,
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
          },
        ]}
      >
        <Svg
          pointerEvents="none"
          width={svgSize}
          height={svgSize}
          style={[styles.ring, { top: -ringOverflow, left: -ringOverflow }]}
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
        <Text style={[styles.postNumberText, { fontSize: 13 * scale }]}>
          {message.postNumber ? `#${message.postNumber}` : "#"}
        </Text>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "stretch",
    backgroundColor: "#9a5f34",
  },
  card: {
    width: "20%",
    height: `${100 / BOARD_ROWS}%`,
  },
  postCard: {
    flex: 1,
  },
  emptyCard: {
    opacity: 0,
  },
  category: {
    color: "#765f00",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flexShrink: 0,
  },
  title: {
    color: "#2c2615",
    fontWeight: "700",
    flexShrink: 0,
  },
  bodyWrap: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  body: { color: "#40381f" },
  postNumber: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
  },
  postNumberText: {
    color: "#000000",
    fontWeight: "900",
  },
  qrCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff9e9",
  },
  qrBoardTitle: {
    color: "#201a12",
    fontWeight: "900",
    textAlign: "center",
  },
  qrBoardSubtitle: {
    color: "#000",
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 6,
  },
  qrTitle: { color: "#201a12", fontWeight: "900", textAlign: "center" },
  qrHint: { color: "#746a5d", textAlign: "center" },
  qrUnavailable: {
    color: "#746a5d",
    fontWeight: "800",
    textAlign: "center",
  },
});
