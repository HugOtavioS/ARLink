import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COPY } from '../constants';
import { useCollection } from '../context/CollectionContext';

export function ClientInfoScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const { state, setClientInfo, setStep } = useCollection();

  const [fullName, setFullName] = useState(state.clientInfo?.fullName ?? '');
  const [phone, setPhone] = useState(state.clientInfo?.phone ?? '');
  const [email, setEmail] = useState(state.clientInfo?.email ?? '');
  const [address, setAddress] = useState(state.clientInfo?.address ?? '');

  const isValid = useMemo(
    () =>
      fullName.trim().length > 2 &&
      phone.trim().length >= 8 &&
      email.includes('@') &&
      address.trim().length > 5,
    [address, email, fullName, phone]
  );

  const handleContinue = () => {
    if (!isValid) {
      Alert.alert('Atenção', COPY.errors.requiredFields);
      return;
    }
    setClientInfo({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
    });
    setStep(2, 4);
    navigation.replace('Welcome');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: Math.max(24, width * 0.06) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{COPY.client.title}</Text>
        <Text style={styles.subtitle}>{COPY.client.subtitle}</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{COPY.client.fullName}</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Ex: Maria Souza" placeholderTextColor="#64748b" />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{COPY.client.phone}</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="(11) 99999-9999" placeholderTextColor="#64748b" />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{COPY.client.email}</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="nome@email.com" placeholderTextColor="#64748b" />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{COPY.client.address}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            placeholder="Rua, número, bairro e cidade"
            placeholderTextColor="#64748b"
          />
        </View>

        <TouchableOpacity
          style={[styles.cta, !isValid && styles.ctaDisabled]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{COPY.client.cta}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { paddingTop: 24, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#f8fafc', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 24, lineHeight: 22 },
  fieldGroup: { marginBottom: 16 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 14, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 12,
    color: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  cta: {
    marginTop: 14,
    backgroundColor: '#38bdf8',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.75 },
  ctaText: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
});
