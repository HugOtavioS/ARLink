import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageManager } from '../src/services/storageManager';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('storageManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve salvar os dados da avaliação com sucesso', async () => {
    const dummyData = { cliente: 'Hugo', cpf: '12345678900' };
    AsyncStorage.setItem.mockResolvedValueOnce();

    const result = await storageManager.saveEvaluation(dummyData);

    expect(result).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@AR_EVALUATION_DATA',
      JSON.stringify(dummyData)
    );
  });

  it('deve carregar os dados da avaliação corretamente', async () => {
    const dummyData = { cliente: 'Hugo', cpf: '12345678900' };
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(dummyData));

    const result = await storageManager.loadEvaluation();

    expect(result).toEqual(dummyData);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@AR_EVALUATION_DATA');
  });

  it('deve retornar null se não houver dados salvos', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);

    const result = await storageManager.loadEvaluation();

    expect(result).toBeNull();
  });

  it('deve limpar a avaliação com sucesso', async () => {
    AsyncStorage.removeItem.mockResolvedValueOnce();

    const result = await storageManager.clearEvaluation();

    expect(result).toBe(true);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@AR_EVALUATION_DATA');
  });
});
