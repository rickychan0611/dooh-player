import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { ScreenRotation } from "../services/screen-rotation";

type Viewport = {
  rotation: ScreenRotation;
  width: number;
  height: number;
};

const ViewportContext = createContext<Viewport>({
  rotation: 0,
  width: 1280,
  height: 720,
});

export function useViewport() {
  return useContext(ViewportContext);
}

export function RotatedScreen({
  rotation,
  children,
}: {
  rotation: ScreenRotation;
  children: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const sideways = rotation === 90 || rotation === 270;
  const layoutW = sideways ? height : width;
  const layoutH = sideways ? width : height;

  const viewport = useMemo<Viewport>(
    () => ({ rotation, width: layoutW, height: layoutH }),
    [layoutH, layoutW, rotation],
  );

  const content = (
    <View style={{ width: layoutW, height: layoutH, flex: 1 }}>{children}</View>
  );

  return (
    <ViewportContext.Provider value={viewport}>
      {rotation === 0 ? (
        <View style={styles.root}>{content}</View>
      ) : (
        <View style={[styles.root, { width, height }]}>
          <View
            style={{
              position: "absolute",
              left: (width - layoutW) / 2,
              top: (height - layoutH) / 2,
              width: layoutW,
              height: layoutH,
              transform: [{ rotate: `${rotation}deg` }],
            }}
          >
            {content}
          </View>
        </View>
      )}
    </ViewportContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },
});
