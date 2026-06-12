import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useEvaluation } from '../contexts/EvaluationContext';
import { Button } from '../components/ui/Button';
import { COLORS } from '../config/colors';

const API_URL = 'https://caddie-dislodge-unscented.ngrok-free.dev/api';

export default function WelcomeScreen({ navigation }) {
  const { evaluationData, resetEvaluation } = useEvaluation();
  const customerName = evaluationData.customer.nome || 'Cliente';
  const protocolo = evaluationData.customer.protocolo;
  
  const [status, setStatus] = useState('CARREGANDO');
  const [observacoes, setObservacoes] = useState('');

  const voltarParaInicio = () => {
    resetEvaluation();
    navigation.reset({
      index: 0,
      routes: [{ name: 'CustomerData' }],
    });
  };

  useEffect(() => {
    if (!protocolo) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/protocolos/${protocolo}`, {
          headers: { 'Bypass-Tunnel-Reminder': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          setObservacoes(data.observacoes_admin || '');

          if (data.status === 'FINALIZADO') {
            Alert.alert('Sucesso', 'Sua instalação foi finalizada e ativada com sucesso pelo NOC!');
            voltarParaInicio();
          }
        } else {
          // Se 404, o protocolo foi finalizado ou removido
          if (res.status === 404 && status !== 'CARREGANDO') {
            Alert.alert('Sucesso', 'Instalação finalizada!');
            voltarParaInicio();
          }
        }
      } catch (e) {}
    };

    // Chamada inicial e depois a cada 5 segundos
    checkStatus();
    const interval = setInterval(checkStatus, 5000); 
    return () => clearInterval(interval);
  }, [protocolo, status]);

  if (status === 'CARREGANDO') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Conectando ao NOC...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* CABEÇALHO */}
        <View style={styles.tagContainer}>
          <Text style={styles.tagText}>
            {status === 'APROVADO' ? '🟢 Fase de Provisionamento' : '✨ Avaliação técnica remota'}
          </Text>
        </View>

        <Text style={styles.title}>
          {status === 'EM_ANALISE' ? 'Aguardando Análise do Admin' : 
           status === 'REENVIAR' ? 'Atenção: Laudo Rejeitado' :
           status === 'APROVADO' ? 'Laudo Aprovado! Provisionamento' : 
           'Avaliação técnica da instalação'}
        </Text>
        
        <Text style={styles.description}>
          {status === 'EM_ANALISE' ? 'Os dados já foram enviados para nossa central. Por favor, aguarde enquanto o administrador verifica as evidências e aprova a instalação.' :
           status === 'REENVIAR' ? `O administrador solicitou ajustes:\n\n"${observacoes}"\n\nPor favor, retorne à avaliação e reenvie.` :
           status === 'APROVADO' ? 'O laudo físico foi aprovado. Agora, aguarde enquanto o suporte (NOC) vincula o MAC e ativa o sinal do roteador neste protocolo.' :
           'Vamos guiá-lo com Realidade Aumentada para coletar as informações que nossa equipe precisa — sem necessidade de visita presencial.'}
        </Text>

        <Text style={styles.clientText}>Cliente: {customerName} | Prot: {protocolo}</Text>

        {/* MENSAGEM DO NOC / STATUS */}
        <View style={styles.infoCard}>
          <View style={[styles.infoCardHighlight, status === 'REENVIAR' && { backgroundColor: 'red' }, status === 'APROVADO' && { backgroundColor: 'green' }]} />
          <Text style={styles.infoCardText}>
            {status === 'EM_ANALISE' ? '⏳ Não feche o aplicativo. O administrador pode solicitar fotos adicionais.' :
             status === 'REENVIAR' ? '❌ Verifique a mensagem do administrador e refaça a etapa pedida.' :
             status === 'APROVADO' ? '✅ Status: Aguardando ativação lógica pela equipe interna.' :
             'Você vai tirar fotos, medir espaços e gravar um vídeo curto. Cada etapa vale pontos.'}
          </Text>
        </View>

        <View style={styles.footer}>
          {status === 'AGUARDANDO' || status === 'REENVIAR' ? (
            <Button 
              title={status === 'REENVIAR' ? "Refazer Avaliação" : "Começar avaliação"} 
              onPress={() => navigation.navigate('Checklist')} 
            />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 12 }} />
              <Text style={{ color: COLORS.textSecondary }}>Sincronizando com a Central...</Text>
            </View>
          )}
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
