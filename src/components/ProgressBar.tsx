import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0..1
  style?: ViewStyle;
  height?: number;
  backgroundColor?: string;
  fillColor?: string;
}

export function ProgressBar({
  progress,
  style,
  height = 8,
  backgroundColor = 'rgba(255,255,255,0.2)',
  fillColor = '#38bdf8',
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.wrapper, { height }, style]}>
      <View style={[styles.track, { height, backgroundColor }]}>
        <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: fillColor, height }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  track: { width: '100%', borderRadius: 999, overflow: 'hidden' },
  fill: { borderRadius: 999 },
});
