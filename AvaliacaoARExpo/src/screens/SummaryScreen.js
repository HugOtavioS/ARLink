import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useEvaluation } from '../contexts/EvaluationContext';
import { Button } from '../components/ui/Button';
import { COLORS } from '../config/colors';
import * as FileSystem from 'expo-file-system';

import Constants from 'expo-constants';

export default function SummaryScreen({ navigation }) {
  const { evaluationData, resetEvaluation } = useEvaluation();
  const [isSending, setIsSending] = useState(false);
  const [complexidade, setComplexidade] = useState('medio'); // 'baixo', 'medio', 'alto'
  const [categoriasSelected, setCategoriasSelected] = useState(['custo_beneficio']); // array of selected categories

  const toggleCategoria = (categoria) => {
    if (categoriasSelected.includes(categoria)) {
      if (categoriasSelected.length > 1) {
        setCategoriasSelected(categoriasSelected.filter(c => c !== categoria));
      }
    } else {
      setCategoriasSelected([...categoriasSelected, categoria]);
    }
  };

  // Calcula total possível de pontos somando o valor de cada task
  const maxScore = Object.values(evaluationData.tasks).reduce((acc, t) => acc + t.points, 0);

  // URL do seu servidor hospedado no AWS Cloud9
  let API_URL = 'https://caddie-dislodge-unscented.ngrok-free.dev/api';

  // Função auxiliar para enviar arquivos físicos (RESTAUROU)
  const uploadImage = async (uri) => {
    if (!uri || !uri.startsWith('file://')) return uri; // Só faz upload de arquivos locais

    const formData = new FormData();
    const isVideo = uri.endsWith('.mp4');

    formData.append('photo', {
      uri,
      name: `media-${Date.now()}${isVideo ? '.mp4' : '.jpg'}`,
      type: isVideo ? 'video/mp4' : 'image/jpeg',
    });

    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { 'Bypass-Tunnel-Reminder': 'true' },
      body: formData,
    });

    if (!res.ok) throw new Error('Falha no upload da mídia');
    const data = await res.json();

    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${data.url}`;
  };

  // (Removida a lógica do IP local pois agora estamos na nuvem)
  const handleSend = async () => {
    setIsSending(true);
    try {
      // 1. Clonar os dados para não alterar o original antes de fazer o upload
      const finalData = JSON.parse(JSON.stringify(evaluationData));

      // 1.5. Converter a foto geral em Base64 diretamente no dispositivo antes do upload
      let base64Photo = null;
      const fotoGeralTask = finalData.tasks.fotoGeral;
      if (fotoGeralTask && fotoGeralTask.completed && fotoGeralTask.mediaUri) {
        try {
          console.log(`[n8n] Convertendo fotoGeral para Base64: ${fotoGeralTask.mediaUri}`);
          const localUri = fotoGeralTask.mediaUri;
          const cleanUri = localUri.startsWith('file://') ? localUri : `file://${localUri}`;
          const base64Content = await FileSystem.readAsStringAsync(cleanUri, {
            encoding: FileSystem.EncodingType.Base64
          });
          base64Photo = `data:image/jpeg;base64,${base64Content}`;
          console.log('[n8n] Imagem convertida para Base64 com sucesso.');
        } catch (e) {
          console.error('[n8n] Erro ao ler foto para Base64:', e);
        }
      }

      // 1.6. Realizar a requisição diretamente ao n8n do app
      let n8nResponseData = null;
      try {
        const N8N_URL = 'https://misaelarlink.app.n8n.cloud/webhook/instalacao-internet';
        const distanceMeters = finalData.tasks.medicaoAR?.arData?.distanceMeters || 0;

        console.log(`[n8n] Fazendo requisição direta para: ${N8N_URL}`);
        const n8nPayload = {
          protocolo: finalData.customer.protocolo,
          cliente: finalData.customer.nome,
          medicao_distancia_metros: distanceMeters,
          foto_base64: base64Photo,
          data_envio: new Date().toISOString(),
          grau_complexidade: complexidade,
          categorias_roteador: categoriasSelected
        };

        const n8nResponse = await fetch(N8N_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(n8nPayload)
        });

        if (n8nResponse.ok) {
          n8nResponseData = await n8nResponse.json();
          console.log('[n8n] Resposta do webhook recebida diretamente:', n8nResponseData);

          // Função recursiva para limpar imagens base64 redundantes e evitar estouro de limite no Express/RDS
          const cleanPayload = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) {
              obj.forEach(item => cleanPayload(item));
            } else {
              for (const key in obj) {
                if (key === 'foto_base64') {
                  delete obj[key];
                } else if (typeof obj[key] === 'object') {
                  cleanPayload(obj[key]);
                }
              }
            }
            return obj;
          };

          n8nResponseData = cleanPayload(n8nResponseData);
          console.log('[n8n] Dados de foto_base64 removidos da resposta com sucesso.');
        } else {
          console.warn(`[n8n] Webhook retornou código de erro: ${n8nResponse.status}`);
        }
      } catch (n8nErr) {
        console.error('[n8n] Erro na requisição direta ao n8n:', n8nErr);
      }

      // 2. Fazer upload de todas as mídias pendentes
      for (const taskKey of Object.keys(finalData.tasks)) {
        const task = finalData.tasks[taskKey];
        if (task.mediaUri && task.mediaUri.startsWith('file://')) {
          console.log(`[Upload] Tentando enviar imagem da task ${taskKey}: ${task.mediaUri}`);
          const oldUri = task.mediaUri;
          task.mediaUri = await uploadImage(task.mediaUri);
          console.log(`[Upload] Sucesso! Nova URL: ${task.mediaUri}`);
        } else if (task.mediaUri) {
          console.log(`[Upload] Ignorado (não é file://): ${task.mediaUri}`);
        }
      }

      // 3. Enviar avaliação para o Banco RDS (enviando junto a resposta do n8n)
      const response = await fetch(`${API_URL}/avaliacoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true' // Ignora a tela de aviso do Localtunnel
        },
        body: JSON.stringify({
          ...finalData,
          n8nResponse: n8nResponseData,
          grau_complexidade: complexidade,
          categorias_roteador: categoriasSelected
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Erro ${response.status}`;
        try {
          const errJson = JSON.parse(errorText);
          errorMessage = errJson.details || errJson.error || errorMessage;
        } catch (_) { }
        throw new Error(errorMessage);
      }

      setIsSending(false);
      Alert.alert(
        'Sucesso!',
        `Laudo enviado com sucesso para o banco de dados AWS RDS! O Admin já pode visualizá-lo.`,
        [{
          text: 'OK',
          onPress: () => {
            // Limpa a pilha de navegação e volta direto para a tela de Espera (Welcome)
            navigation.reset({
              index: 0,
              routes: [{ name: 'Welcome' }],
            });
          }
        }]
      );
    } catch (e) {
      console.error(e);
      setIsSending(false);
      Alert.alert('Erro no Envio', e.message || 'Não foi possível conectar ao servidor (Backend). Verifique o IP e o Wi-Fi.');
    }
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
          <Text style={styles.text}>Protocolo: {evaluationData.customer.protocolo || 'N/A'}</Text>
          <Text style={styles.text}>Nome: {evaluationData.customer.nome}</Text>
          <Text style={styles.text}>Telefone: {evaluationData.customer.telefone}</Text>
          <Text style={styles.text}>Email: {evaluationData.customer.email}</Text>
          <Text style={styles.text}>Endereço: {evaluationData.customer.endereco}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resultados Técnicos</Text>
          <Text style={styles.sectionSubtitle}>Evidências salvas localmente no dispositivo</Text>

          <Text style={styles.text}>
            📸 Foto do Local: {evaluationData.tasks.fotoGeral?.completed ? '✓ Salva na Galeria' : 'Pendente'}
          </Text>
          <Text style={styles.text}>
            📐 Medição AR: {evaluationData.tasks.medicaoAR?.completed && evaluationData.tasks.medicaoAR.arData?.distanceMeters
              ? `✓ ${evaluationData.tasks.medicaoAR.arData.distanceMeters.toFixed(2)} m`
              : 'Pendente'}
          </Text>
          <Text style={styles.text}>
            📦 Simulação Cubo: {evaluationData.tasks.cuboAR?.completed ? '✓ Coordenadas registradas' : 'Pendente'}
          </Text>
          <Text style={styles.text}>
            🎥 Vídeo da Rota: {evaluationData.tasks.videoRota?.completed ? '✓ Salvo na Galeria' : 'Pendente'}
          </Text>
        </View>

        {/* Grau de Complexidade da Instalação */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Grau de Complexidade</Text>
          <Text style={styles.sectionSubtitle}>Informe a dificuldade estimada da instalação</Text>

          <View style={styles.complexityContainer}>
            {['baixo', 'medio', 'alto'].map((lvl) => {
              const label = lvl === 'baixo' ? 'Baixo' : lvl === 'medio' ? 'Médio' : 'Alto';
              const isSelected = complexidade === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  style={[
                    styles.complexityBtn,
                    isSelected && styles.complexityBtnSelected
                  ]}
                  onPress={() => setComplexidade(lvl)}
                >
                  <Text style={[
                    styles.complexityBtnText,
                    isSelected && styles.complexityBtnTextSelected
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Categorias Desejadas de Roteador */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Categorias de Roteador</Text>
          <Text style={styles.sectionSubtitle}>Marque os tipos de equipamentos sugeridos</Text>

          <View style={styles.categoryList}>
            {[
              { id: 'barato', label: 'Baratos / Entrada' },
              { id: 'custo_beneficio', label: 'Custo-Benefício' },
              { id: 'high_tech', label: 'High-Tech / Alta Performance' },
              { id: 'mesh', label: 'Mesh / Cobertura Total' },
              { id: 'corporativo', label: 'Corporativo / Alta Densidade' }
            ].map((cat) => {
              const isSelected = categoriasSelected.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    isSelected && styles.categoryItemSelected
                  ]}
                  onPress={() => toggleCategoria(cat.id)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Enviar para análise"
            onPress={handleSend}
            loading={isSending}
          />
          <Button
            title="Assistente (chat n8n)"
            type="secondary"
            onPress={() => navigation.navigate('Chat')}
            disabled={isSending}
          />
          {/* Botão para refazer/visualizar a simulação do cubo 3D */}
          <Button
            title="Simular roteador em AR"
            type="secondary"
            onPress={() => navigation.navigate('ARScreen', { taskKey: 'cuboAR' })}
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
  complexityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  complexityBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  complexityBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(43, 180, 214, 0.15)',
  },
  complexityBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  complexityBtnTextSelected: {
    color: COLORS.primary,
  },
  categoryList: {
    marginTop: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryItemSelected: {
    borderColor: 'rgba(43, 180, 214, 0.4)',
    backgroundColor: '#1E2A3A',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  checkboxCheck: {
    color: '#0F1626',
    fontWeight: 'bold',
    fontSize: 12,
  },
  categoryLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  categoryLabelSelected: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
});
