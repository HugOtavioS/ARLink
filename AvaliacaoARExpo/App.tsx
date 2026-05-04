import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';

import { EvaluationProvider } from './src/contexts/EvaluationContext';
import { COLORS } from './src/config/colors';

// Telas
import CustomerDataScreen from './src/screens/CustomerDataScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import ChecklistScreen from './src/screens/ChecklistScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import CameraScreen from './src/screens/CameraScreen';
import ARScreen from './src/screens/ARScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <EvaluationProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <Stack.Navigator
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
        </Stack.Navigator>
      </NavigationContainer>
    </EvaluationProvider>
  );
}
