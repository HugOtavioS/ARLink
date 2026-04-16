import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COPY } from '../constants';
import { persistCapturedPhoto } from '../utils/persistCapture';
import { saveCaptureToDeviceGallery } from '../utils/saveToGallery';

export interface ARPhotoScreenProps {
  label: string;
  onPhoto: (uri: string) => void;
  onBack: () => void;
}

export function ARPhotoScreen({ label, onPhoto, onBack }: ARPhotoScreenProps) {
  const [overlay, setOverlay] = useState<'instructions' | 'camera'>('instructions');
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<InstanceType<typeof CameraView>>(null);

  const openCamera = useCallback(async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permissão', COPY.errors.camera);
        return;
      }
    }
    setOverlay('camera');
  }, [permission?.granted, requestPermission]);

  const handleCapture = async () => {
    const cam = cameraRef.current;
    if (!cam || capturing || !cameraReady) return;
    setCapturing(true);
    try {
      const photo = await cam.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        try {
          await saveCaptureToDeviceGallery(photo.uri);
        } catch {
          // galeria opcional; continua com cópia na app
        }
        try {
          const storedUri = await persistCapturedPhoto(photo.uri);
          onPhoto(storedUri);
        } catch {
          onPhoto(photo.uri);
        }
      }
    } catch {
      Alert.alert('Erro', COPY.errors.save);
    } finally {
      setCapturing(false);
    }
  };

  if (overlay === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.title}>{COPY.ar.photo.title}</Text>
          <Text style={styles.hint}>{COPY.ar.photo.hint}</Text>
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

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.hint}>{COPY.errors.camera}</Text>
          <TouchableOpacity style={styles.btn} onPress={openCamera}>
            <Text style={styles.btnText}>Permitir câmera</Text>
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
        mode="picture"
        onCameraReady={() => setCameraReady(true)}
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.uiOverlay} pointerEvents="box-none">
          <Text style={styles.cameraHintText}>{COPY.ar.photo.hint}</Text>
          <TouchableOpacity
            style={[styles.captureBtn, (capturing || !cameraReady) && styles.captureBtnDisabled]}
            onPress={handleCapture}
            disabled={capturing || !cameraReady}
          >
            {capturing ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.captureBtnText}>{COPY.ar.photo.capture}</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.topOverlay} pointerEvents="box-none">
          <TouchableOpacity style={styles.closeBtn} onPress={onBack}>
            <Text style={styles.closeBtnText}>✕ Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  captureBtn: { backgroundColor: '#38bdf8', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  captureBtnDisabled: { opacity: 0.7 },
  captureBtnText: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  closeBtn: { position: 'absolute', top: 50, right: 24, padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  closeBtnText: { color: '#fff', fontSize: 15 },
});
