import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useEvaluation } from '../contexts/EvaluationContext';
import { Button } from '../components/ui/Button';
import { COLORS } from '../config/colors';

const TASKS_INFO = {
  fotoGeral: { 
    title: 'Ponto de energia', 
    desc: 'Registrar proximidade de tomada para o equipamento',
    buttonText: '📸 Registrar foto',
    action: 'camera',
    isVideo: false
  },
  medicaoAR: { 
    title: 'Espaço para equipamento', 
    desc: 'Medir e registrar o espaço disponível para o modem/roteador',
    buttonText: '📐 Medir com AR',
    action: 'ar'
  },
  videoRota: { 
    title: 'Cobertura do local', 
    desc: 'Gravar um vídeo curto mostrando o ambiente para análise de sinal',
    buttonText: '🎬 Gravar vídeo',
    action: 'camera',
    isVideo: true
  },
  cuboAR: { 
    title: 'Simulação 3D', 
    desc: 'Testar se o modem físico cabe no local desejado',
    buttonText: '📦 Simular roteador',
    action: 'ar'
  },
};

export default function ChecklistScreen({ navigation }) {
  const { evaluationData, completeTask } = useEvaluation();
  const { tasks } = evaluationData;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Chat')}
          style={{ marginRight: 8 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 16 }}>Chat</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const totalTasks = Object.keys(tasks).length;
  const completedTasks = Object.values(tasks).filter(t => t.completed).length;
  const isAllCompleted = completedTasks === totalTasks;

  const handleAction = (key, info) => {
    if (info.action === 'camera') {
      navigation.navigate('Camera', { taskKey: key, isVideo: info.isVideo });
    } else if (info.action === 'ar') {
      navigation.navigate('ARScreen', { taskKey: key });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          Progresso: {completedTasks} de {totalTasks} passos
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(completedTasks / totalTasks) * 100}%` }]} />
        </View>
      </View>
      
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {Object.entries(tasks).map(([key, task]) => {
          const info = TASKS_INFO[key];
          return (
            <View key={key} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{info.title}</Text>
                <View style={[styles.checkbox, task.completed && styles.checkboxCompleted]}>
                  {task.completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </View>
              
              <Text style={styles.taskDesc}>{info.desc}</Text>
              
              <TouchableOpacity 
                style={[styles.actionButton, task.completed && styles.actionButtonCompleted]}
                onPress={() => handleAction(key, info)}
              >
                <Text style={[styles.actionButtonText, task.completed && { color: '#4ade80' }]}>
                  {task.completed ? '🔁 Refazer passo' : info.buttonText}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title="Continuar" 
          disabled={!isAllCompleted}
          onPress={() => navigation.navigate('Summary')} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  progressHeader: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 3,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    paddingTop: 16,
  },
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: 'rgba(43, 180, 214, 0.15)', // Fundo ciano bem transparente
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)', // Verde transparente
  },
  actionButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
  },
});
