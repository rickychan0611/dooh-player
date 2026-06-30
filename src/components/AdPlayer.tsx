import { useEffect, useState } from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import type { CachedAd } from "../types";

function VideoAd({ ad, onComplete }: { ad: CachedAd; onComplete: () => void }) {
  const player = useVideoPlayer(ad.localUri, (instance) => {
    instance.loop = false;
    instance.play();
  });
  useEventListener(player, "playToEnd", onComplete);
  useEffect(() => {
    const safety = setTimeout(onComplete, Math.max(ad.duration, 10) * 1000);
    return () => clearTimeout(safety);
  }, [ad.duration, onComplete]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} surfaceType={Platform.OS === "android" ? "textureView" : undefined} />;
}

export function AdPlayer({
  ads,
  onItemChange,
}: {
  ads: CachedAd[];
  onItemChange: (id: string | null) => void;
}) {
  const scale = useResponsiveScale();
  const [index, setIndex] = useState(0);
  const ad = ads[index % Math.max(ads.length, 1)];

  function next() {
    setIndex((value) => (value + 1) % Math.max(ads.length, 1));
  }

  useEffect(() => {
    onItemChange(ad?.id ?? null);
    if (!ad || ad.type === "video") return;
    const timer = setTimeout(next, ad.duration * 1000);
    return () => clearTimeout(timer);
  }, [ad, onItemChange]);

  if (!ad) {
    return <View style={styles.empty}><Text style={[styles.emptyText, { fontSize: 30 * scale }]}>No ads assigned</Text></View>;
  }
  return (
    <View style={styles.container}>
      {ad.type === "image" ? (
        <Image source={{ uri: ad.localUri }} style={styles.media} resizeMode="contain" />
      ) : (
        <VideoAd key={ad.id} ad={ad} onComplete={next} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  media: { width: "100%", height: "100%" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  emptyText: { color: "#9aaca6" },
});
