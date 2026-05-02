import React, { createContext, useState, useEffect, useContext } from 'react';
import { storageManager } from '../services/storageManager';

export const EvaluationContext = createContext({});

const INITIAL_STATE = {
  customer: {
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    cep: '',
    endereco: '',
  },
  tasks: {
    fotoGeral: { completed: false, uri: null, points: 20 },
    medicaoAR: { completed: false, distance: null, points: 30 },
    videoRota: { completed: false, uri: null, points: 30 },
    cuboAR: { completed: false, printUri: null, points: 20 },
  },
  totalScore: 0,
};

export const EvaluationProvider = ({ children }) => {
  const [evaluationData, setEvaluationData] = useState(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    const loadData = async () => {
      const savedData = await storageManager.loadEvaluation();
      if (savedData) {
        setEvaluationData(savedData);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Auto-save whenever evaluationData changes (if not loading)
  useEffect(() => {
    if (!isLoading) {
      storageManager.saveEvaluation(evaluationData);
    }
  }, [evaluationData, isLoading]);

  const updateCustomerData = (customerData) => {
    setEvaluationData((prev) => ({
      ...prev,
      customer: { ...prev.customer, ...customerData },
    }));
  };

  const completeTask = (taskKey, resultData) => {
    setEvaluationData((prev) => {
      const task = prev.tasks[taskKey];
      if (!task || task.completed) return prev; // already done or invalid

      const newTasks = {
        ...prev.tasks,
        [taskKey]: { ...task, ...resultData, completed: true },
      };

      const newScore = Object.values(newTasks).reduce(
        (acc, t) => (t.completed ? acc + t.points : acc),
        0
      );

      return { ...prev, tasks: newTasks, totalScore: newScore };
    });
  };

  const resetEvaluation = async () => {
    await storageManager.clearEvaluation();
    setEvaluationData(INITIAL_STATE);
  };

  return (
    <EvaluationContext.Provider
      value={{
        evaluationData,
        isLoading,
        updateCustomerData,
        completeTask,
        resetEvaluation,
      }}
    >
      {children}
    </EvaluationContext.Provider>
  );
};

export const useEvaluation = () => useContext(EvaluationContext);
