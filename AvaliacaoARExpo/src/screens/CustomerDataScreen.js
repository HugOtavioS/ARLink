import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useEvaluation } from '../contexts/EvaluationContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { COLORS } from '../config/colors';

const API_URL = 'https://caddie-dislodge-unscented.ngrok-free.dev/api';

export default function CustomerDataScreen({ navigation }) {
  const { updateCustomerData } = useEvaluation();
  const [protocolo, setProtocolo] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleValidar = async () => {
    if (!protocolo || protocolo.trim().length === 0) {
      setError('Por favor, digite o código do protocolo.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/protocolos/${protocolo.trim()}`, {
        headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });

      if (!response.ok) {
        throw new Error('Protocolo inválido, inexistente ou já utilizado.');
      }

      const data = await response.json();
      
      // Sucesso! O protocolo existe e está aguardando.
      // Preenchemos os dados no contexto global.
      updateCustomerData({
        protocolo: data.codigo,
        nome: data.cliente_nome,
        endereco: data.endereco,
        telefone: data.telefone || 'Não informado',
        email: 'Não informado',
      });

      navigation.navigate('Welcome');
    } catch (e) {
      setError(e.message || 'Erro ao validar protocolo. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 100}
      >
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Validação de Acesso</Text>
          <Text style={styles.subtitle}>
            Digite o código do protocolo gerado pelo Administrador para iniciar a avaliação técnica deste cliente.
          </Text>

          <Input
            label="Código do Protocolo"
            placeholder="Ex: 8F3A2B"
            value={protocolo}
            onChangeText={(v) => { setProtocolo(v.toUpperCase()); setError(null); }}
            error={error}
            helperText="Código de 6 dígitos gerado no Painel Admin."
            autoCapitalize="characters"
          />

          <View style={styles.footer}>
            <Button 
              title={isLoading ? 'Validando...' : 'Validar e Iniciar'} 
              onPress={handleValidar} 
              disabled={isLoading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 32, flexGrow: 1, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 32, lineHeight: 22 },
  footer: { marginTop: 32, marginBottom: 24 },
});
