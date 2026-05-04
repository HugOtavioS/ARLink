import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useEvaluation } from '../contexts/EvaluationContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { isValidCPF, isValidEmail, isValidPhone, isValidCEP } from '../utils/validators';
import { COLORS } from '../config/colors';

export default function CustomerDataScreen({ navigation }) {
  const { evaluationData, updateCustomerData } = useEvaluation();
  const [formData, setFormData] = useState(evaluationData.customer);
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nome || formData.nome.trim().length < 3) {
      newErrors.nome = 'Informe pelo menos 3 caracteres no nome.';
    }
    if (!isValidPhone(formData.telefone)) {
      newErrors.telefone = 'Telefone deve ter DDD + número (10 ou 11 dígitos).';
    }
    if (!isValidEmail(formData.email)) {
      newErrors.email = 'Informe um e-mail válido.';
    }
    // Para simplificar o teste rápido, vou deixar CPF e CEP opcionais na interface inicial,
    // mas adicionando Endereço como obrigatório igual ao protótipo.
    if (!formData.endereco || formData.endereco.trim().length < 5) {
      newErrors.endereco = 'Descreva o endereço com mais detalhes (rua, número, bairro, cidade).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      updateCustomerData(formData);
      navigation.navigate('Welcome');
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
          <Text style={styles.title}>Dados do cliente</Text>
          <Text style={styles.subtitle}>
            Preencha as informações abaixo antes de iniciar a avaliação técnica.
          </Text>

          <Input
            label="Nome completo"
            placeholder="Ex: Maria Souza"
            value={formData.nome}
            onChangeText={(v) => handleChange('nome', v)}
            error={errors.nome}
            helperText="Informe pelo menos 3 caracteres no nome."
          />

          <Input
            label="Telefone"
            placeholder="(11) 99999-9999"
            keyboardType="phone-pad"
            value={formData.telefone}
            onChangeText={(v) => handleChange('telefone', v)}
            error={errors.telefone}
            helperText="Telefone deve ter DDD + número (10 ou 11 dígitos)."
          />

          <Input
            label="E-mail"
            placeholder="nome@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(v) => handleChange('email', v)}
            error={errors.email}
            helperText="Informe um e-mail."
          />

          <Input
            label="Endereço da instalação"
            placeholder="Rua, número, bairro e cidade"
            value={formData.endereco}
            onChangeText={(v) => handleChange('endereco', v)}
            error={errors.endereco}
            helperText="Descreva o endereço com mais detalhes (rua, número, bairro, cidade)."
            multiline
          />

          <View style={styles.footer}>
            <Button title="Salvar e continuar" onPress={handleNext} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  content: {
    padding: 24,
    paddingTop: 32,
    flexGrow: 1,
    paddingBottom: 40, // Espaço extra no final para o scroll não ficar apertado
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  footer: {
    marginTop: 32,
    marginBottom: 24,
  },
});
