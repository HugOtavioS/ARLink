import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useEvaluation } from '../contexts/EvaluationContext';
import { Button } from '../components/ui/Button';
import { COLORS } from '../config/colors';

export default function WelcomeScreen({ navigation }) {
  const { evaluationData } = useEvaluation();
  const customerName = evaluationData.customer.nome || 'Cliente';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.tagContainer}>
          <Text style={styles.tagText}>✨ Avaliação técnica remota</Text>
        </View>

        <Text style={styles.title}>Avaliação técnica da sua instalação</Text>
        
        <Text style={styles.description}>
          Vamos guiá-lo com Realidade Aumentada para coletar as informações que nossa equipe precisa — sem necessidade de visita presencial.
        </Text>

        <Text style={styles.clientText}>Cliente: {customerName}</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoCardHighlight} />
          <Text style={styles.infoCardText}>
            Você vai tirar fotos, medir espaços e gravar um vídeo curto. Cada etapa vale pontos.
          </Text>
        </View>

        {/* Simulando o progresso inicial (Passo 2 de 4 no protótipo, mas aqui é o começo) */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '50%' }]} />
          </View>
          <Text style={styles.progressText}>Passo 2 de 4</Text>
        </View>

        <View style={styles.footer}>
          <Button 
            title="Começar avaliação" 
            onPress={() => navigation.navigate('Checklist')} 
          />
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  tagContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(43, 180, 214, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 24,
  },
  tagText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    lineHeight: 38,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  clientText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 40,
    overflow: 'hidden',
  },
  infoCardHighlight: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.primary,
  },
  infoCardText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    paddingLeft: 8,
  },
  progressSection: {
    marginBottom: 'auto',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footer: {
    paddingBottom: 24,
  },
});
