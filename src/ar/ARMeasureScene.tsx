import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroBox,
  ViroText,
} from '@reactvision/react-viro';
import { COPY } from '../constants';

const TRACKING_NORMAL = 2;
const TRACKING_LIMITED = 1;

function distance([x1, y1, z1]: number[], [x2, y2, z2]: number[]): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
}

export interface ARMeasureScreenProps {
  label: string;
  onConfirm: (valueMeters: number) => void;
  onBack: () => void;
}

function ARMeasureSceneWithProps({
  onConfirm,
  onBack,
}: {
  label: string;
  onConfirm: (valueMeters: number) => void;
  onBack: () => void;
}) {
  const [point1, setPoint1] = useState<number[] | null>(null);
  const [point2, setPoint2] = useState<number[] | null>(null);
  const [trackingState, setTrackingState] = useState<string>(COPY.ar.tracking.unavailable);

  const valueMeters = point1 && point2 ? distance(point1, point2) : 0;

  return (
    <View style={StyleSheet.absoluteFill}>
      <ViroARScene
        anchorDetectionTypes={['PlanesHorizontal', 'PlanesVertical']}
        onTrackingUpdated={(state: number) => {
          if (state === TRACKING_NORMAL) setTrackingState(COPY.ar.tracking.normal);
          else if (state === TRACKING_LIMITED) setTrackingState(COPY.ar.tracking.limited);
          else setTrackingState(COPY.ar.tracking.unavailable);
        }}
        onClick={() => {
          if (!point1) setPoint1([0, 0, -2]);
          else if (!point2) setPoint2([0.5, 0, -2]);
        }}
      >
        {point1 && (
          <ViroBox position={point1 as [number, number, number]} scale={[0.08, 0.08, 0.08]} />
        )}
        {point2 && (
          <ViroBox position={point2 as [number, number, number]} scale={[0.08, 0.08, 0.08]} />
        )}
        <ViroText
          text={
            point1 && point2
              ? COPY.ar.measure.result.replace('{value}', valueMeters.toFixed(2))
              : COPY.ar.measure.placeholder
          }
          position={[0, 0.3, -0.8]}
          style={styles.arText}
        />
      </ViroARScene>
      <View style={styles.uiOverlay} pointerEvents="box-none">
        <Text style={styles.trackingText}>{trackingState}</Text>
        {point1 && point2 && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(valueMeters)}>
              <Text style={styles.confirmBtnText}>{COPY.ar.measure.confirm}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { setPoint1(null); setPoint2(null); }}>
              <Text style={styles.retryBtnText}>{COPY.ar.measure.retry}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export function ARMeasureScreen({ label, onConfirm, onBack }: ARMeasureScreenProps) {
  const [overlay, setOverlay] = useState<'instructions' | 'ar'>('instructions');
  const initialScene = React.useMemo(
    () => ({
      scene: () => <ARMeasureSceneWithProps label={label} onConfirm={onConfirm} onBack={onBack} />,
    }),
    [label, onConfirm, onBack]
  );

  if (overlay === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.title}>{COPY.ar.measure.title}</Text>
          <Text style={styles.hint}>{COPY.ar.measure.hint}</Text>
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
        initialScene={initialScene}
        viroAppProps={{ label, onConfirm, onBack }}
        style={styles.viro}
      />
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
  actions: { flexDirection: 'row', marginBottom: 12 },
  confirmBtn: { flex: 1, backgroundColor: '#38bdf8', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginRight: 6 },
  confirmBtnText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  retryBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center' },
  retryBtnText: { fontSize: 15, color: '#f8fafc' },
  closeBtn: { position: 'absolute', top: 50, right: 24, padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  closeBtnText: { color: '#fff', fontSize: 15 },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  arText: { fontFamily: 'Arial', fontSize: 24, color: '#ffffff' },
});
