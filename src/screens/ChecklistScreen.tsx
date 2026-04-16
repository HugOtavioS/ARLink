import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCollection } from '../context/CollectionContext';
import { ProgressBar } from '../components/ProgressBar';
import { Card } from '../components/Card';
import { COPY, EVIDENCE_POINTS, POINTS } from '../constants';
import { ChecklistItem as ChecklistItemType } from '../types';

export function ChecklistScreen() {
  const { state, setStep } = useCollection();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const progress = state.maxSteps > 0 ? state.currentStep / state.maxSteps : 0;
  const maxSteps = 4;
  const canContinue = state.checklist.every((item) => item.done);
  const maxPoints =
    state.checklist.length * POINTS.CHECKLIST_ITEM +
    state.checklist.reduce((sum, item) => sum + EVIDENCE_POINTS[item.evidence ?? 'none'], 0);
  const pointsProgress = maxPoints > 0 ? state.totalPoints / maxPoints : 0;

  React.useEffect(() => {
    setStep(3, maxSteps);
  }, [maxSteps, setStep]);

  const onNext = () => {
    setStep(4, maxSteps);
    navigation.navigate('Summary');
  };

  const onStartAR = (item: ChecklistItemType) => {
    if (item.evidence === 'measure') navigation.navigate('ARMeasure', { label: item.label, itemId: item.id });
    else if (item.evidence === 'photo') navigation.navigate('ARPhoto', { label: item.label, itemId: item.id });
    else if (item.evidence === 'video') navigation.navigate('ARVideo', { label: item.label, itemId: item.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Math.max(24, width * 0.06) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{COPY.checklist.title}</Text>
        <Text style={styles.subtitle}>{COPY.checklist.subtitle}</Text>
        {/* <ProgressBar progress={progress} style={styles.progress} /> */}
        <View style={styles.points}>
          <Text style={styles.pointsText}>🏆 {state.totalPoints} de {maxPoints} pontos</Text>
          <ProgressBar progress={pointsProgress} style={styles.pointsProgress} height={6} />
        </View>
        {state.checklist.map((item) => (
          <Card
            key={item.id}
            title={item.label}
            subtitle={item.description}
            right={
              <TouchableOpacity
                style={[styles.checkbox, item.done && styles.checkboxDone]}
                disabled
              >
                {item.done ? <Text style={styles.checkMark}>✓</Text> : null}
              </TouchableOpacity>
            }
          >
            {item.evidence && item.evidence !== 'none' && (
              <TouchableOpacity
                style={styles.arButton}
                onPress={() => onStartAR(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.arButtonText}>
                  {item.evidence === 'measure' && (item.done ? '📐 Reenviar medição' : '📐 Medir com AR')}
                  {item.evidence === 'photo' && (item.done ? '📷 Reenviar foto' : '📷 Registrar foto')}
                  {item.evidence === 'video' && (item.done ? '🎬 Reenviar vídeo' : '🎬 Gravar vídeo')}
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        ))}
        <TouchableOpacity
          style={[styles.cta, !canContinue && styles.ctaDisabled]}
          onPress={onNext}
          activeOpacity={0.85}
          disabled={!canContinue}
        >
          <Text style={styles.ctaText}>{COPY.checklist.next}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { paddingTop: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: '#f8fafc', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 20 },
  progress: { marginBottom: 16 },
  points: { marginBottom: 20 },
  pointsText: { fontSize: 15, color: '#38bdf8', fontWeight: '600' },
  pointsProgress: { marginTop: 10 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  checkMark: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  arButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  arButtonText: { fontSize: 14, color: '#38bdf8', fontWeight: '500' },
  cta: {
    backgroundColor: '#38bdf8',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
});
