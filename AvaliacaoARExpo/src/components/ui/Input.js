import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../config/colors';

export const Input = ({ label, error, helperText, ...props }) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={COLORS.textSecondary}
        {...props}
      />
      {(error || helperText) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12, // Borda mais arredondada do protótipo
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
  },
  inputError: {
    borderColor: COLORS.errorBorder,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  errorText: {
    color: COLORS.errorBorder, // Usando a cor de erro do protótipo
  },
});
