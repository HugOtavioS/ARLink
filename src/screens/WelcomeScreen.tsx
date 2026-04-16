import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCollection } from '../context/CollectionContext';
import { ProgressBar } from '../components/ProgressBar';
import { COPY } from '../constants';

export function WelcomeScreen() {
  const { state, setStep } = useCollection();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();

  React.useEffect(() => {
    setStep(2, 4);
  }, [setStep]);

  const progress = state.maxSteps > 0 ? state.currentStep / state.maxSteps : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Math.max(24, width * 0.06) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✨ Avaliação técnica remota</Text>
        </View>
        <Text style={styles.title}>{COPY.welcome.title}</Text>
        <Text style={styles.subtitle}>{COPY.welcome.subtitle}</Text>
        {state.clientInfo ? (
          <Text style={styles.clientName}>Cliente: {state.clientInfo.fullName}</Text>
        ) : null}
        <View style={styles.tip}>
          <Text style={styles.tipText}>{COPY.welcome.tip}</Text>
        </View>
        <ProgressBar progress={progress} style={styles.progress} />
        <Text style={styles.stepText}>
          Passo {state.currentStep} de {state.maxSteps}
        </Text>
        <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('Checklist')} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{COPY.welcome.cta}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { paddingTop: 24, paddingBottom: 48 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 20,
  },
  badgeText: { fontSize: 13, color: '#38bdf8', fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#cbd5e1', lineHeight: 24, marginBottom: 24 },
  clientName: { fontSize: 14, color: '#38bdf8', marginBottom: 20, fontWeight: '600' },
  tip: {
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#38bdf8',
  },
  tipText: { fontSize: 14, color: '#94a3b8', lineHeight: 22 },
  progress: { marginBottom: 8 },
  stepText: { fontSize: 13, color: '#64748b', marginBottom: 32 },
  cta: {
    backgroundColor: '#38bdf8',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
});
