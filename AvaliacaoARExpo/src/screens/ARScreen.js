import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, unstable_batchedUpdates } from 'react-native';
import { ViroARSceneNavigator, ViroARScene, ViroBox, ViroSphere, ViroMaterials, ViroAmbientLight, ViroSpotLight, ViroNode, ViroQuad } from '@reactvision/react-viro';
import { useEvaluation } from '../contexts/EvaluationContext';
import { COLORS } from '../config/colors';

const { width, height } = Dimensions.get('window');

ViroMaterials.createMaterials({
  routerBody: { diffuseColor: '#1e293b', lightingModel: 'Blinn' },
  routerAntenna: { diffuseColor: '#0f172a', lightingModel: 'Blinn' },
  routerLed: { diffuseColor: '#4ade80', lightingModel: 'Constant' },
  shadowMaterial: { diffuseColor: '#000000', lightingModel: 'Constant' },
  measureLine: { diffuseColor: '#38bdf8', lightingModel: 'Constant' },
  measureMarker: { diffuseColor: '#f472b6', lightingModel: 'PBR', metalness: 0.2, roughness: 0.4 },
});

function distance3d(p1, p2) {
  return Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2 + (p2[2] - p1[2]) ** 2);
}

function lineGeometry(p1, p2) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const position = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2];
  const horiz = Math.sqrt(dx * dx + dz * dz);
  const rx = -Math.atan2(dy, horiz) * (180 / Math.PI);
  const ry  = Math.atan2(dx, dz)   * (180 / Math.PI);
  return { position, rotation: [rx, ry, 0], length };
}

// Estado global simples para evitar unmount do ViroARSceneNavigator
const _sceneState = {
  isCuboMode: false,
  cubePos: null,
  point1: null,
  point2: null,
  lastHitPos: null,
};
let _forceSceneUpdate = null;
let _arSceneRef = null;
let _setReticleActive = null;

const ARSceneComponent = () => {
  const [, setTick] = useState(0);
  const lastUpdateTime = useRef(0);
  
  React.useEffect(() => {
    _forceSceneUpdate = () => setTick(t => t + 1);
    return () => { _forceSceneUpdate = null; };
  }, []);

  const handleCameraHitTest = (results) => {
    let hasHit = false;
    if (results.hitTestResults && results.hitTestResults.length > 0) {
      const hit = results.hitTestResults.find(r => r.type === 'ExistingPlaneUsingExtent' || r.type === 'EstimatedHorizontalPlane' || r.type === 'FeaturePoint') || results.hitTestResults[0];
      if (hit && hit.transform && hit.transform.position) {
        const pos = [hit.transform.position[0], hit.transform.position[1], hit.transform.position[2]];
        if (pos.every(Number.isFinite)) {
          _sceneState.lastHitPos = pos;
          hasHit = true;
        }
      }
    }
    if (!hasHit) {
      _sceneState.lastHitPos = null;
    }
    
    // Atualiza a mira na tela a cada 100ms para não travar o celular
    const now = Date.now();
    if (now - lastUpdateTime.current > 100) {
      lastUpdateTime.current = now;
      if (_setReticleActive) _setReticleActive(hasHit);
    }
  };

  const { isCuboMode, cubePos, point1, point2 } = _sceneState;

  let lineBox = null;
  if (point1 && point2) {
    const line = lineGeometry(point1, point2);
    // Viro C++ crasha se o tamanho for menor que 2cm ou maior que 10 metros
    if (line.length >= 0.02 && line.length <= 10) {
      lineBox = (
        <ViroBox
          position={line.position}
          rotation={line.rotation}
          scale={[0.006, 0.006, line.length]}
          materials={['measureLine']}
        />
      );
    }
  }

  return (
    <ViroARScene 
      ref={(ref) => { _arSceneRef = ref; }}
      onCameraARHitTest={handleCameraHitTest}
      anchorDetectionTypes={['PlanesHorizontal', 'PlanesVertical']}
    >
      <ViroAmbientLight color={"#ffffff"} intensity={400} />
      <ViroSpotLight innerAngle={5} outerAngle={90} direction={[0, -1, -0.2]}
        position={[0, 3, 1]} color="#ffffff" castsShadow={true} shadowOpacity={0.7} />

      {isCuboMode && cubePos && (
        <ViroNode position={cubePos} dragType="FixedToWorld" onDrag={() => {}}>
          {/* Base do Roteador (Corpo principal) */}
          <ViroBox position={[0, 0.02, 0]} scale={[0.18, 0.035, 0.12]} materials={["routerBody"]} />
          
          {/* Antena Esquerda inclinada para trás e para o lado */}
          <ViroBox position={[-0.06, 0.08, -0.05]} scale={[0.008, 0.14, 0.008]} rotation={[15, 0, -15]} materials={["routerAntenna"]} />
          
          {/* Antena Direita inclinada para trás e para o lado */}
          <ViroBox position={[0.06, 0.08, -0.05]} scale={[0.008, 0.14, 0.008]} rotation={[15, 0, 15]} materials={["routerAntenna"]} />
          
          {/* Painel Frontal com LEDs Verdes (Status de Rede) */}
          <ViroBox position={[0, 0.02, 0.06]} scale={[0.04, 0.005, 0.005]} materials={["routerLed"]} />
          
          {/* Sombra dinâmica falsa no chão para dar senso de profundidade */}
          <ViroQuad position={[0, 0.001, 0]} rotation={[-90, 0, 0]} scale={[0.2, 0.15, 1]} materials={["shadowMaterial"]} opacity={0.4} />
        </ViroNode>
      )}

      {!isCuboMode && point1 && (
        <ViroSphere position={point1} radius={0.014} materials={['measureMarker']} />
      )}
      
      {!isCuboMode && point2 && (
        <ViroSphere position={point2} radius={0.014} materials={['measureMarker']} />
      )}

      {!isCuboMode && lineBox}
    </ViroARScene>
  );
};

const INITIAL_SCENE = { scene: ARSceneComponent };

export default function ARScreen({ route, navigation }) {
  const { taskKey } = route.params;
  const { completeTask } = useEvaluation();
  const isCuboMode = taskKey === 'cuboAR';

  const [cubePos, setCubePos] = useState(null);
  const [point1, setPoint1] = useState(null);
  const [point2, setPoint2] = useState(null);
  const [distance, setDistance] = useState(0);
  const [reticleActive, setReticleActive] = useState(false);
  const [warningMessage, setWarningMessage] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const showWarning = (msg) => {
    setWarningMessage(msg);
    setTimeout(() => setWarningMessage(null), 3500);
  };

  // Inicializar estado global
  React.useEffect(() => {
    _sceneState.isCuboMode = isCuboMode;
    _sceneState.cubePos = null;
    _sceneState.point1 = null;
    _sceneState.point2 = null;
    _sceneState.lastHitPos = null;
    _setReticleActive = setReticleActive;
    return () => {
      _arSceneRef = null;
      _setReticleActive = null;
    };
  }, [isCuboMode]);

  const handleActionPress = async () => {
    if (!_arSceneRef || !_arSceneRef.performARHitTestWithPoint) {
        showWarning('Câmera AR inicializando... Aguarde.');
        return;
    }
    
    try {
      let pos = _sceneState.lastHitPos;

      // 2. FALLBACK MATEMÁTICO (Somente para o Cubo)
      if (!pos && isCuboMode) {
        const cam = await _arSceneRef.getCameraOrientationAsync();
        const p = cam.position; 
        const f = cam.forward;  
        let t = -1.3 / f[1];
        
        if (f[1] >= -0.1 || t > 5 || t < 0.1) {
          t = 1.5; 
          pos = [p[0] + f[0] * t, p[1] - 0.5, p[2] + f[2] * t];
        } else {
          pos = [p[0] + f[0] * t, p[1] - 1.3, p[2] + f[2] * t]; 
        }
      }

      if (!pos) {
        showWarning('Mova o celular lentamente pelo ambiente para a câmera focar na parede ou chão.');
        return;
      }

      // 3. Aplica a posição garantida
      if (isCuboMode) {
        unstable_batchedUpdates(() => {
          setCubePos(pos);
          _sceneState.cubePos = pos;
          _forceSceneUpdate && _forceSceneUpdate();
        });
      } else {
        if (!point1) {
          unstable_batchedUpdates(() => {
            setPoint1(pos);
            _sceneState.point1 = pos;
            _forceSceneUpdate && _forceSceneUpdate();
          });
        } else if (!point2) {
          unstable_batchedUpdates(() => {
            setPoint2(pos);
            _sceneState.point2 = pos;
            setDistance(distance3d(point1, pos));
            _forceSceneUpdate && _forceSceneUpdate();
          });
        }
      }
    } catch (e) {
      console.log('AR Fallback failed', e);
      showWarning('Ocorreu um erro ao processar a medição. Tente outro ângulo.');
    }
  };

  const handleFinish = () => {
    const data = isCuboMode ? { cubePosition: cubePos } : { distanceMeters: distance };
    completeTask(taskKey, { arData: data });
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigation.goBack();
    }, 1500);
  };

  const reset = () => {
    unstable_batchedUpdates(() => {
      setCubePos(null);
      setPoint1(null);
      setPoint2(null);
      setDistance(0);
      _sceneState.cubePos = null;
      _sceneState.point1 = null;
      _sceneState.point2 = null;
      _forceSceneUpdate && _forceSceneUpdate();
    });
  };

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        autofocus={true}
        initialScene={INITIAL_SCENE}
        style={styles.arView}
      />

      {/* Retícula (Mira) no centro da tela */}
      <View style={styles.reticleContainer} pointerEvents="none">
        <View style={[styles.reticleRing, reticleActive && styles.reticleActiveRing]} />
      </View>
      
      {/* 2D Overlay UI */}
      <View style={styles.overlayTop} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>✕ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.instruction}>
          {isCuboMode ? 'Aponte para a superfície' : (!point1 ? 'Aponte para o 1º Ponto' : (!point2 ? 'Aponte para o 2º Ponto' : 'Medição Concluída'))}
        </Text>
      </View>

      {/* Warning Toast Banner */}
      {warningMessage && (
        <View style={styles.warningBanner} pointerEvents="none">
          <Text style={styles.warningText}>⚠️ {warningMessage}</Text>
        </View>
      )}

      {/* Distância */}
      {!isCuboMode && point1 && point2 && (
        <View style={styles.distanceBanner} pointerEvents="none">
          <Text style={styles.distanceM}>{distance.toFixed(2)} m</Text>
          <Text style={styles.distanceCm}>{(distance * 100).toFixed(0)} cm</Text>
        </View>
      )}

      {/* Controles de Ação */}
      <View style={styles.footer} pointerEvents="box-none">
        {(!isCuboMode && !point2) || (isCuboMode && !cubePos) ? (
          <TouchableOpacity style={styles.actionBtn} onPress={handleActionPress}>
            <Text style={styles.actionBtnText}>{isCuboMode ? '📦 Colocar Roteador Aqui' : '📍 Marcar Ponto Aqui'}</Text>
          </TouchableOpacity>
        ) : null}

        {((isCuboMode && cubePos) || (!isCuboMode && point2)) && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleFinish}>
              <Text style={styles.confirmBtnText}>Salvar e Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retryBtn} onPress={reset}>
              <Text style={styles.retryBtnText}>Refazer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Success Overlay */}
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
  container: { flex: 1, backgroundColor: '#000' },
  arView: { flex: 1 },
  reticleContainer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  reticleRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  reticleActiveRing: { borderColor: '#4ade80', borderWidth: 3, transform: [{ scale: 1.2 }] },
  overlayTop: { position: 'absolute', top: 50, width: '100%', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 20 },
  backBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, marginRight: 15 },
  backBtnText: { color: '#FFF', fontWeight: 'bold' },
  instruction: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 8, textAlign: 'center' },
  distanceBanner: { position: 'absolute', top: 120, width: '100%', alignItems: 'center' },
  distanceM: { fontSize: 48, fontWeight: 'bold', color: '#FFF', textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  distanceCm: { marginTop: 4, fontSize: 18, fontWeight: '600', color: 'rgba(248,250,252,0.9)', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  footer: { position: 'absolute', bottom: 40, width: '100%', paddingHorizontal: 20, alignItems: 'center' },
  actionBtn: { backgroundColor: '#38bdf8', width: '100%', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  actionsRow: { flexDirection: 'row', width: '100%', gap: 10 },
  confirmBtn: { flex: 2, backgroundColor: '#4ade80', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  retryBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  retryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  warningBanner: { position: 'absolute', top: 110, width: '90%', alignSelf: 'center', backgroundColor: '#f59e0b', padding: 14, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 5 },
  warningText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 15, lineHeight: 20 },
  successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  successIcon: { fontSize: 80, marginBottom: 20 },
  successText: { color: '#4ade80', fontSize: 26, fontWeight: 'bold' },
});
