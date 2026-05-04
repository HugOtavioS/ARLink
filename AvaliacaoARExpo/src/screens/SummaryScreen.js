import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useEvaluation } from '../contexts/EvaluationContext';
import { Button } from '../components/ui/Button';
import { COLORS } from '../config/colors';

export default function SummaryScreen({ navigation }) {
  const { evaluationData, resetEvaluation } = useEvaluation();
  const [isSending, setIsSending] = useState(false);

  // Calcula total possível de pontos somando o valor de cada task
  const maxScore = Object.values(evaluationData.tasks).reduce((acc, t) => acc + t.points, 0);

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      console.log('JSON GERADO PARA O N8N:', JSON.stringify(evaluationData, null, 2));
      setIsSending(false);
      Alert.alert(
        'Sucesso!', 
        'Evidências enviadas com sucesso.',
        [{ 
          text: 'OK', 
          onPress: () => {
            resetEvaluation();
            navigation.popToTop();
          }
        }]
      );
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.title}>Evidências coletadas</Text>
        <Text style={styles.subtitle}>
          Revise os dados abaixo. Nossa equipe analisará e retornará em breve.
        </Text>

        {/* Barra de progresso final 100% */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '100%' }]} />
          </View>
          <Text style={styles.scoreText}>
            🏆 Total: {evaluationData.totalScore} de {maxScore} pontos
          </Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <Text style={styles.sectionSubtitle}>Dados para contato e instalação</Text>
          <Text style={styles.text}>{evaluationData.customer.nome}</Text>
          <Text style={styles.text}>{evaluationData.customer.telefone}</Text>
          <Text style={styles.text}>{evaluationData.customer.email}</Text>
          <Text style={styles.text}>{evaluationData.customer.endereco}</Text>
        </View>

        <View style={styles.footer}>
          <Button 
            title="Enviar para análise" 
            onPress={handleSend} 
            loading={isSending}
          />
          {/* Botão placeholder para visualizar o cubo AR na próxima fase */}
          <Button 
            title="Ver cubo 3D com a câmera (AR)" 
            type="secondary"
            onPress={() => Alert.alert('Aviso', 'A visualização AR será ativada na Fase 3!')} 
            disabled={isSending}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginBottom: 8,
  },
  footer: {
    marginTop: 'auto',
  },
});
