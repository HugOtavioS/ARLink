import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useEvaluation } from '../contexts/EvaluationContext';
import { COLORS } from '../config/colors';

export default function CameraScreen({ route, navigation }) {
  const { taskKey, isVideo } = route.params;
  const { completeTask } = useEvaluation();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Se não temos status de permissão ainda, ou se negado, pedimos (em UI)
  if (!cameraPermission || (isVideo && !micPermission) || !mediaPermission) {
    return <View style={styles.center} />;
  }

  if (!cameraPermission.granted || (isVideo && !micPermission.granted) || !mediaPermission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Aguardando permissões da câmera/microfone/galeria...</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 10, backgroundColor: COLORS.primary, borderRadius: 8 }}
          onPress={() => {
            requestCameraPermission();
            if (isVideo) requestMicPermission();
            requestMediaPermission();
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Conceder Permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    if (isVideo) {
      if (isRecording) {
        cameraRef.current.stopRecording();
        setIsRecording(false);
      } else {
        setIsRecording(true);
        try {
          const video = await cameraRef.current.recordAsync();
          setIsRecording(false);
          
          let finalUri = video.uri;
          try {
            const asset = await MediaLibrary.createAssetAsync(video.uri);
            if (asset && asset.uri) finalUri = asset.uri;
          } catch (e) {
            console.log('Erro ao salvar vídeo na galeria:', e);
          }
          
          completeTask(taskKey, { mediaUri: finalUri });
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            navigation.goBack();
          }, 1500);
        } catch (e) {
          setIsRecording(false);
          console.error(e);
          Alert.alert('Erro', 'Falha ao gravar vídeo.');
        }
      }
    } else {
      // É foto
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        
        let finalUri = photo.uri;
        try {
          const asset = await MediaLibrary.createAssetAsync(photo.uri);
          if (asset && asset.uri) finalUri = asset.uri;
        } catch (e) {
          console.log('Erro ao salvar foto na galeria:', e);
        }
        
        completeTask(taskKey, { mediaUri: finalUri });
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          navigation.goBack();
        }, 1500);
      } catch (e) {
        console.error('Erro ao tirar foto:', e);
        Alert.alert('Erro', 'Falha ao tirar foto.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode={isVideo ? 'video' : 'picture'}
      />
      
      <View style={styles.overlay}>
        <Text style={styles.instruction}>
          {isVideo ? 'Grave a rota do cabo' : 'Tire a foto do local'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.captureButton, isRecording && styles.recordingButton]} 
          onPress={handleCapture}
          disabled={showSuccess}
        >
          <View style={[styles.innerButton, isRecording && styles.innerRecordingButton]} />
        </TouchableOpacity>
      </View>

      {showSuccess && (
        <View style={styles.successOverlay}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successText}>Salvo com sucesso!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    color: COLORS.text,
    fontSize: 16,
  },
  overlay: {
    position: 'absolute',
    top: 60,
    width: '100%',
    alignItems: 'center',
  },
  instruction: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  recordingButton: {
    borderColor: COLORS.error,
  },
  innerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
  },
  innerRecordingButton: {
    width: 30,
    height: 30,
    borderRadius: 4, // Quadradinho de Stop
    backgroundColor: COLORS.error,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  successIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  successText: {
    color: '#4ade80',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
