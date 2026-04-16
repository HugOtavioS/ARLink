import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { COPY } from '../constants';
import { persistCapturedVideo } from '../utils/persistCapture';
import { saveCaptureToDeviceGallery } from '../utils/saveToGallery';

export interface ARVideoScreenProps {
  label: string;
  onVideo: (uri: string, durationSeconds: number) => void;
  onBack: () => void;
}

const MAX_VIDEO_SECONDS = 180;

export function ARVideoScreen({ label, onVideo, onBack }: ARVideoScreenProps) {
  const [overlay, setOverlay] = useState<'instructions' | 'camera'>('instructions');
  const [camPermission, requestCam] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const cameraRef = useRef<InstanceType<typeof CameraView>>(null);

  const openCamera = useCallback(async () => {
    if (!camPermission?.granted) {
      const c = await requestCam();
      if (!c.granted) {
        Alert.alert('Permissão', COPY.errors.camera);
        return;
      }
    }
    if (!micPermission?.granted) {
      const m = await requestMic();
      if (!m.granted) {
        Alert.alert('Permissão', COPY.errors.recording);
        return;
      }
    }
    setOverlay('camera');
  }, [camPermission?.granted, micPermission?.granted, requestCam, requestMic]);

  const handleStart = () => {
    const cam = cameraRef.current;
    if (!cam || recording || !cameraReady) return;

    const startedAt = Date.now();
    setRecording(true);

    cam
      .recordAsync({ maxDuration: MAX_VIDEO_SECONDS })
      .then(async (video) => {
        setRecording(false);
        if (!video?.uri) return;
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        try {
          await saveCaptureToDeviceGallery(video.uri);
        } catch {
          // continua com cópia na app
        }
        try {
          const storedUri = await persistCapturedVideo(video.uri);
          onVideo(storedUri, durationSeconds);
        } catch {
          onVideo(video.uri, durationSeconds);
        }
      })
      .catch(() => {
        setRecording(false);
      });
  };

  const handleStop = () => {
    cameraRef.current?.stopRecording();
  };

  if (overlay === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.title}>{COPY.ar.video.title}</Text>
          <Text style={styles.hint}>{COPY.ar.video.hint}</Text>
          <Text style={styles.labelTag}>{label}</Text>
          <TouchableOpacity style={styles.btn} onPress={openCamera}>
            <Text style={styles.btnText}>Abrir câmera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!camPermission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.hint}>{COPY.errors.recording}</Text>
          <TouchableOpacity style={styles.btn} onPress={openCamera}>
            <Text style={styles.btnText}>Permitir câmera e microfone</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} collapsable={false}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode="video"
        onCameraReady={() => setCameraReady(true)}
      />
      <Modal transparent animationType="none" statusBarTranslucent visible>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.uiOverlay} pointerEvents="box-none">
            <Text style={styles.cameraHintText}>{COPY.ar.video.hint}</Text>
            {!recording ? (
              <TouchableOpacity
                style={[styles.recordBtn, !cameraReady && styles.btnDisabled]}
                onPress={handleStart}
                disabled={!cameraReady}
              >
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
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  overlay: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  hint: { fontSize: 15, color: '#94a3b8', marginBottom: 12 },
  labelTag: { fontSize: 13, color: '#64748b', marginBottom: 24 },
  btn: { backgroundColor: '#38bdf8', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  backBtn: { marginTop: 16, alignItems: 'center' },
  backBtnText: { color: '#94a3b8', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
  uiOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
  },
  cameraHintText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  recordBtn: { backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  recordBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  stopBtn: { backgroundColor: '#64748b', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  stopBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  closeBtn: { position: 'absolute', top: 50, right: 24, padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  closeBtnText: { color: '#fff', fontSize: 15 },
});
