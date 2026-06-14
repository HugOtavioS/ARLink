import React, { createContext, useState, useEffect, useContext } from 'react';
import { storageManager } from '../services/storageManager';

export const EvaluationContext = createContext({});

const INITIAL_STATE = {
  customer: {
    protocolo: '',
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    cep: '',
    endereco: '',
  },
  tasks: {
    fotoGeral: { completed: false, mediaUri: null, points: 10 },
    medicaoAR: { completed: false, distance: null, points: 15 },
    videoRota: { completed: false, mediaUri: null, points: 15 },
    cuboAR: { completed: false, printUri: null, points: 10 },
    fotoQuadroEnergia: { completed: false, mediaUri: null, points: 10 },
    fotoTomadaAproximada: { completed: false, mediaUri: null, points: 10 },
    fotoEntradaInternet: { completed: false, mediaUri: null, points: 10 },
    fotoTrechoExterno: { completed: false, mediaUri: null, points: 10 },
    fotoObstaculosFuro: { completed: false, mediaUri: null, points: 10 },
  },
  totalScore: 0,
  complexidade: null,
  categoriasSelected: [],
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

  const updateSummaryData = (summaryData) => {
    setEvaluationData((prev) => ({
      ...prev,
      complexidade: summaryData.complexidade !== undefined ? summaryData.complexidade : prev.complexidade,
      categoriasSelected: summaryData.categoriasSelected !== undefined ? summaryData.categoriasSelected : prev.categoriasSelected,
    }));
  };

  const loadExistingEvaluation = (customerData, existingEval) => {
    setEvaluationData((prev) => {
      // Começa com a estrutura inicial das tasks
      const mergedTasks = JSON.parse(JSON.stringify(INITIAL_STATE.tasks));
      
      // Se tiver avaliação anterior, mescla as evidências
      if (existingEval && existingEval.tasks) {
        Object.keys(mergedTasks).forEach(taskKey => {
          if (existingEval.tasks[taskKey]) {
            const extTask = existingEval.tasks[taskKey];
            let mediaUri = extTask.mediaUri;
            if (taskKey === 'fotoObstaculosFuro' && typeof mediaUri === 'string' && mediaUri.includes(',')) {
              mediaUri = mediaUri.split(',');
            }
            mergedTasks[taskKey] = {
              ...mergedTasks[taskKey],
              completed: extTask.completed,
              mediaUri: mediaUri,
              arData: extTask.arData || null,
              points: extTask.points || mergedTasks[taskKey].points
            };
          }
        });
      }

      const newScore = Object.values(mergedTasks).reduce(
        (acc, t) => (t.completed ? acc + t.points : acc),
        0
      );

      return {
        customer: {
          protocolo: customerData.protocolo,
          nome: customerData.nome,
          endereco: customerData.endereco,
          telefone: customerData.telefone || 'Não informado',
          email: customerData.email || 'Não informado',
        },
        tasks: mergedTasks,
        totalScore: newScore,
        complexidade: existingEval ? existingEval.complexidade : null,
        categoriasSelected: existingEval ? existingEval.categoriasSelected : [],
      };
    });
  };

  const completeTask = (taskKey, resultData) => {
    setEvaluationData((prev) => {
      const task = prev.tasks[taskKey];
      if (!task) return prev; // invalid task key

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
        updateSummaryData,
        loadExistingEvaluation,
        completeTask,
        resetEvaluation,
      }}
    >
      {children}
    </EvaluationContext.Provider>
  );
};

export const useEvaluation = () => useContext(EvaluationContext);
