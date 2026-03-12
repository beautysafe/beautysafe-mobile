import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, StyleSheet, Modal, Animated, Easing, Text } from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";

type Props = {
  visible: boolean;
  url: string;
  onClose: () => void;
};

export default function StoryVideoModal({ visible, url, onClose }: Props) {
  const videoRef = useRef<Video>(null);
  const [ready, setReady] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    if (visible) {
      setReady(false);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.98);
    }
  }, [visible]);

  const close = async () => {
    try {
      await videoRef.current?.stopAsync();
    } catch {}
    onClose();
  };

  const onStatus = (st: AVPlaybackStatus) => {
    if (!st.isLoaded) return;
    if (!ready && st.isLoaded) setReady(true);
    if (st.didJustFinish) close();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ scale }], opacity }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Story</Text>
          <Pressable onPress={close} hitSlop={10} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.playerWrap}>
          <Video
            ref={videoRef}
            style={styles.video}
            source={{ uri: url }}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            shouldPlay
            isLooping={false}
            onPlaybackStatusUpdate={onStatus}
            onReadyForDisplay={() => setReady(true)}
          />
          {!ready ? <Text style={styles.loading}>Chargement…</Text> : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 60,
    bottom: 60,
    borderRadius: 18,
    backgroundColor: "#0B0B0B",
    overflow: "hidden",
  },
  header: {
    height: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  closeBtn: { position: "absolute", right: 12, padding: 6 },
  closeText: { color: "#fff", fontSize: 18, fontWeight: "800" },

  playerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  video: { width: "100%", height: "100%" },
  loading: { position: "absolute", color: "rgba(255,255,255,0.8)", fontSize: 14 },
});
