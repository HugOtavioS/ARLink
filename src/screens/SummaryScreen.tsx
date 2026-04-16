import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCollection } from '../context/CollectionContext';
import { ProgressBar } from '../components/ProgressBar';
import { Card } from '../components/Card';
import { COPY, EVIDENCE_POINTS, POINTS } from '../constants';

export function SummaryScreen() {
  const { state, reset, setStep } = useCollection();
  const navigation = useNavigation<any>();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  React.useEffect(() => {
    setStep(4, 4);
  }, [setStep]);

  const progress = state.maxSteps > 0 ? state.currentStep / state.maxSteps : 0;
  const maxPoints =
    state.checklist.length * POINTS.CHECKLIST_ITEM +
    state.checklist.reduce((sum, item) => sum + EVIDENCE_POINTS[item.evidence ?? 'none'], 0);
  const pointsProgress = maxPoints > 0 ? state.totalPoints / maxPoints : 0;

  const handleSend = async () => {
    setSending(true);
    try {
      // Simula envio para backend; em produção seria uma chamada API real
      await new Promise((r) => setTimeout(r, 2000));
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>{COPY.summary.success}</Text>
          <Text style={styles.successSubtitle}>
            Nossa equipe analisará as evidências e entrará em contato em até 24h.
          </Text>
          <TouchableOpacity style={styles.cta} onPress={() => { reset(); navigation.replace('ClientInfo'); }} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Nova avaliação</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{COPY.summary.title}</Text>
        <Text style={styles.subtitle}>{COPY.summary.subtitle}</Text>
        <ProgressBar progress={progress} style={styles.progress} />
        <View style={styles.points}>
          <Text style={styles.pointsText}>🏆 Total: {state.totalPoints} de {maxPoints} pontos</Text>
          <ProgressBar progress={pointsProgress} style={styles.pointsProgress} height={6} />
        </View>
        {state.clientInfo && (
          <Card title="Cliente" subtitle="Dados para contato e instalação">
            <Text style={styles.item}>{state.clientInfo.fullName}</Text>
            <Text style={styles.item}>{state.clientInfo.phone}</Text>
            <Text style={styles.item}>{state.clientInfo.email}</Text>
            <Text style={styles.item}>{state.clientInfo.address}</Text>
          </Card>
        )}
        {state.measures.length > 0 && (
          <Card title="Medidas" subtitle={`${state.measures.length} registro(s)`}>
            {state.measures.map((m) => (
              <Text key={m.id} style={styles.item}>{m.label}: {m.valueMeters.toFixed(2)} m</Text>
            ))}
          </Card>
        )}
        {state.photos.length > 0 && (
          <Card title="Fotos" subtitle={`${state.photos.length} foto(s)`}>
            {state.photos.map((p) => (
              <Text key={p.id} style={styles.item}>{p.label}</Text>
            ))}
          </Card>
        )}
        {state.videos.length > 0 && (
          <Card title="Vídeos" subtitle={`${state.videos.length} vídeo(s)`}>
            {state.videos.map((v) => (
              <Text key={v.id} style={styles.item}>{v.label} ({v.durationSeconds}s)</Text>
            ))}
          </Card>
        )}
        <TouchableOpacity
          style={[styles.cta, sending && styles.ctaDisabled]}
          onPress={handleSend}
          disabled={sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.ctaText}>{COPY.summary.send}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: '#f8fafc', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 20 },
  progress: { marginBottom: 16 },
  points: { marginBottom: 20 },
  pointsText: { fontSize: 15, color: '#38bdf8', fontWeight: '600' },
  pointsProgress: { marginTop: 10 },
  item: { fontSize: 14, color: '#cbd5e1', marginTop: 4 },
  cta: {
    backgroundColor: '#38bdf8',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#f8fafc', textAlign: 'center', marginBottom: 8 },
  successSubtitle: { fontSize: 15, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
});
