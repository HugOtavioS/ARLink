import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@AR_EVALUATION_DATA';

export const storageManager = {
  async saveEvaluation(data) {
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
      return true;
    } catch (e) {
      console.error('Erro ao salvar avaliação:', e);
      return false;
    }
  },

  async loadEvaluation() {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error('Erro ao ler avaliação:', e);
      return null;
    }
  },

  async clearEvaluation() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      console.error('Erro ao limpar avaliação:', e);
      return false;
    }
  }
};
