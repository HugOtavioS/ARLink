import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useEvaluation } from '../contexts/EvaluationContext';
import { Button } from '../components/ui/Button';
import { COLORS } from '../config/colors';

const TASKS_INFO = {
  fotoGeral: { 
    title: 'Foto Geral do Ambiente (Instalação)', 
    desc: 'Registre uma foto panorâmica do local selecionado para a instalação física do roteador',
    buttonText: '📸 Foto Geral do Ambiente',
    action: 'camera',
    isVideo: false
  },
  medicaoAR: { 
    title: 'Medição do Trajeto (Cabo UTP)', 
    desc: 'Utilize a câmera para mapear e medir o trajeto físico por onde passará o cabo de rede UTP',
    buttonText: '📐 Medir Trajeto com AR',
    action: 'ar'
  },
  videoRota: { 
    title: 'Vídeo do Trajeto Mapeado', 
    desc: 'Grave um vídeo contínuo percorrendo a rota traçada para análise física de viabilidade',
    buttonText: '🎬 Gravar Vídeo do Trajeto',
    action: 'camera',
    isVideo: true
  },
  cuboAR: { 
    title: 'Simulação de Equipamento 3D', 
    desc: 'Posicione virtualmente o modelo 3D do roteador na parede ou móvel para simular a instalação final',
    buttonText: '📦 Simular Roteador 3D',
    action: 'ar'
  },
  fotoQuadroEnergia: { 
    title: 'Foto do Quadro de Energia / Telecom', 
    desc: 'Registre uma foto nítida do quadro de força geral ou da caixa de distribuição de telecomunicações',
    buttonText: '📸 Foto do Quadro Técnico',
    action: 'camera',
    isVideo: false,
    allowEscape: true
  },
  fotoTomadaAproximada: { 
    title: 'Foto da Tomada do Equipamento', 
    desc: 'Registre uma foto em close da tomada elétrica que alimentará o roteador',
    buttonText: '📸 Foto da Tomada Próxima',
    action: 'camera',
    isVideo: false
  },
  fotoEntradaInternet: { 
    title: 'Foto do Ponto de Entrada da Internet', 
    desc: 'Fotografe o local externo ou interno de onde o cabo de internet da rua chega na sua casa (ex: poste, caixa externa no muro ou fachada)',
    buttonText: '📸 Foto do Ponto de Entrada',
    action: 'camera',
    isVideo: false,
    allowEscape: true
  },
  fotoTrechoExterno: { 
    title: 'Foto da Passagem Externa (Se houver)', 
    desc: 'Tire uma foto da área externa caso alguma parte do cabo precise ficar exposta ao tempo (sol e chuva)',
    buttonText: '📸 Foto da Área Externa',
    action: 'camera',
    isVideo: false,
    allowEscape: true
  },
  fotoObstaculosFuro: { 
    title: 'Foto de Paredes a Serem Furadas', 
    desc: 'Fotografe as paredes ou divisórias que o cabo precisará atravessar de um cômodo para o outro',
    buttonText: '📸 Foto de Paredes a Furar',
    action: 'camera',
    isVideo: false,
    allowEscape: true,
    isMultiple: true
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
      navigation.navigate('Camera', { taskKey: key, isVideo: info.isVideo, isMultiple: info.isMultiple });
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
                <View style={[
                  styles.checkbox,
                  task.completed && (task.mediaUri === 'nao_se_aplica' ? styles.checkboxSkipped : styles.checkboxCompleted)
                ]}>
                  {task.completed && (
                    <Text style={[styles.checkmark, task.mediaUri === 'nao_se_aplica' && { color: '#94a3b8' }]}>
                      {task.mediaUri === 'nao_se_aplica' ? '—' : '✓'}
                    </Text>
                  )}
                </View>
              </View>
              
              <Text style={styles.taskDesc}>{info.desc}</Text>
              
              <View style={styles.buttonsContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, task.completed && task.mediaUri !== 'nao_se_aplica' && styles.actionButtonCompleted]}
                  onPress={() => handleAction(key, info)}
                >
                  <Text style={[styles.actionButtonText, task.completed && task.mediaUri !== 'nao_se_aplica' && { color: '#4ade80' }]}>
                    {task.completed 
                      ? (task.mediaUri === 'nao_se_aplica' ? '📸 Tirar Foto' : '🔁 Refazer passo') 
                      : info.buttonText}
                  </Text>
                </TouchableOpacity>

                {info.allowEscape && (
                  <TouchableOpacity 
                    style={[
                      styles.escapeButton,
                      task.completed && task.mediaUri === 'nao_se_aplica' && styles.escapeButtonSelected
                    ]}
                    onPress={() => {
                      if (task.completed && task.mediaUri === 'nao_se_aplica') {
                        completeTask(key, { mediaUri: null, completed: false });
                      } else {
                        completeTask(key, { mediaUri: 'nao_se_aplica', completed: true });
                      }
                    }}
                  >
                    <Text style={styles.escapeButtonText}>
                      {task.completed && task.mediaUri === 'nao_se_aplica' ? '✓ Dispensado' : '🚫 Não se aplica'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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
  checkboxSkipped: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderColor: '#64748b',
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
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(43, 180, 214, 0.15)', // Fundo ciano bem transparente
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)', // Verde transparente
  },
  actionButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  escapeButton: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)', // Cinza azulado transparente
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escapeButtonSelected: {
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
    borderColor: '#64748b',
    borderWidth: 1,
  },
  escapeButtonText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
  },
});
