import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ViroARScene, ViroARSceneNavigator, ViroText } from '@reactvision/react-viro';
import { COPY } from '../constants';

const TRACKING_NORMAL = 2;
const TRACKING_LIMITED = 1;


export interface ARVideoScreenProps {
  label: string;
  onVideo: (uri: string, durationSeconds: number) => void;
  onBack: () => void;
}

type SceneNavigator = {
  startVideoRecording: (name: string, saveToRoll: boolean, onError?: (code: number) => void) => void;
  stopVideoRecording: () => Promise<{ success: boolean; url?: string }>;
  viroAppProps?: { onTrackingStateChange?: (s: string) => void };
};

const arVideoNavigatorRef = { current: null as SceneNavigator | null };

class ARVideoSceneInner extends React.Component<{ sceneNavigator: SceneNavigator }> {
  componentDidMount() {
    arVideoNavigatorRef.current = this.props.sceneNavigator;
  }

  render() {
    const { sceneNavigator } = this.props;
    const viro = sceneNavigator?.viroAppProps ?? {};
    const onTrackingStateChange = viro.onTrackingStateChange as ((s: string) => void) | undefined;

    return (
      <ViroARScene
        anchorDetectionTypes={['PlanesHorizontal', 'PlanesVertical']}
        onTrackingUpdated={(state: number) => {
          const text =
            state === TRACKING_NORMAL
              ? COPY.ar.tracking.normal
              : state === TRACKING_LIMITED
                ? COPY.ar.tracking.limited
                : COPY.ar.tracking.unavailable;
          onTrackingStateChange?.(text);
        }}
      >
        <ViroText text={COPY.ar.video.hint} position={[0, 0.2, -0.6]} style={styles.arText} />
      </ViroARScene>
    );
  }
}

// Keep a stable initialScene; `scene` must be a component (not a React element/object).
const INITIAL_SCENE = {
  scene: (props: { sceneNavigator: SceneNavigator }) => <ARVideoSceneInner {...props} />,
};

export function ARVideoScreen({ label, onVideo, onBack }: ARVideoScreenProps) {
  const [overlay, setOverlay] = useState<'instructions' | 'ar'>('instructions');
  const [trackingState, setTrackingState] = useState(COPY.ar.tracking.unavailable);
  const [recording, setRecording] = useState(false);
  const [startTime, setStartTime] = useState(0);

  const handleStart = () => {
    const nav = arVideoNavigatorRef.current;
    if (!nav?.startVideoRecording || recording) return;
    nav.startVideoRecording(`video_${Date.now()}`, false, () => {
      setRecording(false);
    });
    setStartTime(Date.now());
    setRecording(true);
  };

  const handleStop = async () => {
    const nav = arVideoNavigatorRef.current;
    if (!nav?.stopVideoRecording || !recording) return;

    try {
      const result = await nav.stopVideoRecording();
      if (result?.success && result?.url) {
        const durationSeconds = Math.round((Date.now() - startTime) / 1000);
        onVideo(result.url, durationSeconds);
      }
    } finally {
      setRecording(false);
    }
  };

  if (overlay === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.title}>{COPY.ar.video.title}</Text>
          <Text style={styles.hint}>{COPY.ar.video.hint}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => setOverlay('ar')}>
            <Text style={styles.btnText}>Abrir câmera AR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <ViroARSceneNavigator
        autofocus
        initialScene={INITIAL_SCENE}
        viroAppProps={{ label, onVideo, onBack, onTrackingStateChange: setTrackingState }}
        style={styles.viro}
      />
      <View style={styles.uiOverlay} pointerEvents="box-none">
        <Text style={styles.trackingText}>{trackingState}</Text>
        {!recording ? (
          <TouchableOpacity style={styles.recordBtn} onPress={handleStart}>
            <Text style={styles.recordBtnText}>{COPY.ar.video.start}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
            <Text style={styles.stopBtnText}>{COPY.ar.video.stop}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.topOverlay} pointerEvents="box-none">
        <TouchableOpacity style={styles.closeBtn} onPress={onBack}>
          <Text style={styles.closeBtnText}>✕ Voltar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  overlay: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  hint: { fontSize: 15, color: '#94a3b8', marginBottom: 24 },
  btn: { backgroundColor: '#38bdf8', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  backBtn: { marginTop: 16, alignItems: 'center' },
  backBtnText: { color: '#94a3b8', fontSize: 15 },
  viro: { flex: 1 },
  uiOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
  },
  trackingText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  recordBtn: { backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  recordBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  stopBtn: { backgroundColor: '#64748b', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  stopBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  closeBtn: { position: 'absolute', top: 50, right: 24, padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  closeBtnText: { color: '#fff', fontSize: 15 },
  arText: { fontFamily: 'Arial', fontSize: 18, color: '#ffffff' },
});
