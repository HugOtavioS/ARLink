import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCollection } from '../context/CollectionContext';
import { ProgressBar } from '../components/ProgressBar';
import { Card } from '../components/Card';
import { COPY } from '../constants';
import { ChecklistItem as ChecklistItemType } from '../types';

export function ChecklistScreen() {
  const { state, toggleChecklist, setStep } = useCollection();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const progress = state.maxSteps > 0 ? state.currentStep / state.maxSteps : 0;
  const maxSteps = 7;

  const onNext = () => {
    setStep(3, maxSteps);
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
        <ProgressBar progress={progress} style={styles.progress} />
        <View style={styles.points}>
          <Text style={styles.pointsText}>🏆 {state.totalPoints} pontos</Text>
        </View>
        {state.checklist.map((item) => (
          <Card
            key={item.id}
            title={item.label}
            subtitle={item.description}
            right={
              <TouchableOpacity
                style={[styles.checkbox, item.done && styles.checkboxDone]}
                onPress={() => toggleChecklist(item.id)}
              >
                {item.done ? <Text style={styles.checkMark}>✓</Text> : null}
              </TouchableOpacity>
            }
          >
            {!item.done && item.evidence && item.evidence !== 'none' && (
              <TouchableOpacity
                style={styles.arButton}
                onPress={() => onStartAR(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.arButtonText}>
                  {item.evidence === 'measure' && '📐 Medir com AR'}
                  {item.evidence === 'photo' && '📷 Registrar foto'}
                  {item.evidence === 'video' && '🎬 Gravar vídeo'}
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        ))}
        <TouchableOpacity style={styles.cta} onPress={onNext} activeOpacity={0.85}>
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
  ctaText: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
});
