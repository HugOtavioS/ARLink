import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CollectionProvider, useCollection } from './src/context/CollectionContext';
import { ClientInfoScreen } from './src/screens/ClientInfoScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { ChecklistScreen } from './src/screens/ChecklistScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { ARMeasureScreen } from './src/ar/ARMeasureScene';
import { ARPhotoScreen } from './src/ar/ARPhotoScene';
import { ARVideoScreen } from './src/ar/ARVideoScene';
import type { ChecklistItemId } from './src/types';

export type RootStackParamList = {
  ClientInfo: undefined;
  Welcome: undefined;
  Checklist: undefined;
  Summary: undefined;
  ARMeasure: { label: string; itemId: string };
  ARPhoto: { label: string; itemId: string };
  ARVideo: { label: string; itemId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { state, addMeasure, addPhoto, addVideo, completeChecklist, setStep } = useCollection();

  const maxSteps = 4;
  React.useEffect(() => {
    if (!state.clientInfo) {
      setStep(1, maxSteps);
    }
  }, [maxSteps, setStep, state.clientInfo]);

  return (
    <Stack.Navigator
      initialRouteName={state.clientInfo ? 'Welcome' : 'ClientInfo'}
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f8fafc',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Stack.Screen
        name="ClientInfo"
        component={ClientInfoScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Checklist"
        component={ChecklistScreen}
        options={{ title: 'Checklist', headerBackTitle: 'Voltar' }}
      />
      <Stack.Screen
        name="Summary"
        component={SummaryScreen}
        options={{ title: 'Resumo' }}
      />
      <Stack.Screen name="ARMeasure" options={{ headerShown: false }}>
        {({ route, navigation }) => (
          <ARMeasureScreen
            label={route.params.label}
            onConfirm={(valueMeters) => {
              addMeasure({
                id: `m_${Date.now()}`,
                itemId: route.params.itemId as ChecklistItemId,
                label: route.params.label,
                valueMeters,
                timestamp: Date.now(),
              });
              completeChecklist(route.params.itemId as ChecklistItemId);
              navigation.goBack();
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ARPhoto" options={{ headerShown: false }}>
        {({ route, navigation }) => (
          <ARPhotoScreen
            label={route.params.label}
            onPhoto={(uri) => {
              addPhoto({
                id: `p_${Date.now()}`,
                itemId: route.params.itemId as ChecklistItemId,
                label: route.params.label,
                uri,
                timestamp: Date.now(),
              });
              completeChecklist(route.params.itemId as ChecklistItemId);
              navigation.goBack();
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ARVideo" options={{ headerShown: false }}>
        {({ route, navigation }) => (
          <ARVideoScreen
            label={route.params.label}
            onVideo={(uri, durationSeconds) => {
              addVideo({
                id: `v_${Date.now()}`,
                itemId: route.params.itemId as ChecklistItemId,
                label: route.params.label,
                uri,
                durationSeconds,
                timestamp: Date.now(),
              });
              completeChecklist(route.params.itemId as ChecklistItemId);
              navigation.goBack();
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <CollectionProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </CollectionProvider>
  );
}
