import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, View, ActivityIndicator } from 'react-native';

import { EvaluationProvider, useEvaluation } from './src/contexts/EvaluationContext';
import { COLORS } from './src/config/colors';

// Telas
import CustomerDataScreen from './src/screens/CustomerDataScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import ChecklistScreen from './src/screens/ChecklistScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import CameraScreen from './src/screens/CameraScreen';
import ARScreen from './src/screens/ARScreen';
import ChatScreen from './src/screens/ChatScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { isLoading, evaluationData } = useEvaluation();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Se o usuário já preencheu o protocolo e fechou o app, enviamos ele para a tela Welcome
  // A tela Welcome é inteligente e fará o polling do status para saber se ele pode ir pro Checklist
  const initialRoute = evaluationData?.customer?.protocolo ? 'Welcome' : 'CustomerData';

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.surface,
          },
          headerTintColor: COLORS.primary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: COLORS.background,
          },
        }}
      >
        <Stack.Screen 
          name="CustomerData" 
          component={CustomerDataScreen} 
          options={{ title: 'Novo Atendimento' }} 
        />
        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Checklist" 
          component={ChecklistScreen} 
          options={{ title: 'Avaliação RA' }} 
        />
        <Stack.Screen 
          name="Summary" 
          component={SummaryScreen} 
          options={{ title: 'Finalizar' }} 
        />
        <Stack.Screen 
          name="Camera" 
          component={CameraScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="ARScreen" 
          component={ARScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ title: 'Assistente' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <EvaluationProvider>
      <AppNavigator />
    </EvaluationProvider>
  );
}
