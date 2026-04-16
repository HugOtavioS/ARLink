import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  unstable_batchedUpdates,   // ← FIX Bug 1
  type GestureResponderEvent,
} from 'react-native';
import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroBox,
  ViroSphere,
  ViroAmbientLight,
  ViroMaterials,
} from '@reactvision/react-viro';
import { COPY } from '../constants';

const TRACKING_NORMAL = 2;
const TRACKING_LIMITED = 1;

// Distância mínima para renderizar a linha — evita ViroBox com length ≈ 0
// que crasha o motor nativo.
const MIN_RENDER_DISTANCE = 0.02; // 2 cm

// FIX Bug 3 — Distância máxima: feature-points distantes podem retornar
// posições a dezenas de metros, o que crasha o motor nativo do Viro.
const MAX_RENDER_DISTANCE = 10; // 10 m

ViroMaterials.createMaterials({
  measureLine:    { lightingModel: 'Constant', diffuseColor: '#38bdf8' },
  measureMarkerA: { lightingModel: 'PBR', diffuseColor: '#38bdf8', metalness: 0.2, roughness: 0.4 },
  measureMarkerB: { lightingModel: 'PBR', diffuseColor: '#f472b6', metalness: 0.2, roughness: 0.4 },
});

function distance3d([x1, y1, z1]: number[], [x2, y2, z2]: number[]) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
}

function lineGeometry(p1: number[], p2: number[]): {
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
} {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const position: [number, number, number] = [
    (p1[0] + p2[0]) / 2,
    (p1[1] + p2[1]) / 2,
    (p1[2] + p2[2]) / 2,
  ];
  const horiz = Math.sqrt(dx * dx + dz * dz);
  const rx = -Math.atan2(dy, horiz) * (180 / Math.PI);
  const ry  = Math.atan2(dx, dz)   * (180 / Math.PI);
  return { position, rotation: [rx, ry, 0], length };
}

function formatDistance(meters: number): string {
  return meters < 1
    ? `${(meters * 100).toFixed(1)} cm`
    : `${meters.toFixed(2)} m`;
}

const HIT_PRIORITY = [
  'ExistingPlaneUsingExtent', 'ExistingPlane',
  'EstimatedHorizontalPlane', 'EstimatedVerticalPlane', 'FeaturePoint',
];

function pickHitResult(results: any[] | null | undefined) {
  if (!results?.length) return null;
  for (const t of HIT_PRIORITY) {
    const hit = results.find((r) => r?.type === t);
    if (hit) return hit;
  }
  return results[0];
}

function positionFromHit(hit: any): number[] | null {
  const p = hit?.transform?.position;
  if (!p || p.length < 3) return null;
  const pos = [p[0], p[1], p[2]] as number[];
  if (!pos.every(isFinite)) return null;
  return pos;
}

// ─── Estado partilhado entre o componente Viro e o overlay React ─────────────
//
// PORQUÊ módulo-level em vez de viroAppProps:
//   Cada vez que viroAppProps muda, o ViroARSceneNavigator pode reprocessar
//   internamente o ViroARScene — em algumas versões do @reactvision/react-viro
//   isso reinicia a sessão AR. Ao usar um objeto mutável estável, o navigator
//   nunca recebe props novas e a sessão AR mantém-se viva.
//
type SceneState = { point1: number[] | null; point2: number[] | null; distanceM: number };
const _sceneState: SceneState = { point1: null, point2: null, distanceM: 0 };

// Função para forçar re-render da cena sem tocar em viroAppProps.
let _sceneForceUpdate: (() => void) | null = null;

// Ref para o ViroARScene — necessário para performARHitTestWithPoint.
const arSceneRef = { current: null as any | null };

// ─── Componente Viro (só elementos Viro aqui dentro) ─────────────────────────
class ARMeasureSceneInner extends React.Component<
  { sceneNavigator: any },
  { tick: number }
> {
  state = { tick: 0 };

  // Ref callback como método de instância — evita recriar a função a cada
  // render, o que chamaria o callback anterior com null e zeraria arSceneRef.
  private _onSceneRef = (c: any) => {
    if (c !== null) arSceneRef.current = c;
  };

  componentDidMount() {
    // Garante estado limpo se o componente for remontado.
    _sceneState.point1   = null;
    _sceneState.point2   = null;
    _sceneState.distanceM = 0;
    // Expõe o forceUpdate para que o overlay possa acionar re-renders da cena
    // sem alterar viroAppProps.
    _sceneForceUpdate = () => this.setState(prev => ({ tick: prev.tick + 1 }));
  }

  componentWillUnmount() {
    _sceneForceUpdate  = null;
    arSceneRef.current = null;
  }

  render() {
    // Lê sempre do estado partilhado (módulo-level), não de viroAppProps.
    const { point1, point2, distanceM } = _sceneState;
    const onTrackingStateChange =
      this.props.sceneNavigator?.viroAppProps?.onTrackingStateChange as
        ((s: string) => void) | undefined;

    // FIX Bug 3 — também guarda limite superior para evitar geometria gigante.
    const showLine = !!(
      point1 &&
      point2 &&
      distanceM >= MIN_RENDER_DISTANCE &&
      distanceM <= MAX_RENDER_DISTANCE
    );

    // FIX Bug 2 — ViroBox como JSX inline condicional direto, sem IIFE.
    // O IIFE impedia que o reconciliador do React associasse o ViroBox a uma
    // posição estável na árvore entre renders, podendo fazer o Viro destruir
    // e recriar o node nativo a cada render.
    let lineBox: React.ReactNode = null;
    if (showLine) {
      const line = lineGeometry(point1!, point2!);
      lineBox = (
        <ViroBox
          position={line.position}
          rotation={line.rotation}
          width={0.006}
          height={0.006}
          length={line.length}
          materials={['measureLine']}
        />
      );
    }

    return (
      <ViroARScene
        ref={this._onSceneRef}
        anchorDetectionTypes={['PlanesHorizontal', 'PlanesVertical']}
        onTrackingUpdated={(state: number) => {
          const text =
            state === TRACKING_NORMAL  ? COPY.ar.tracking.normal :
            state === TRACKING_LIMITED ? COPY.ar.tracking.limited :
                                         COPY.ar.tracking.unavailable;
          onTrackingStateChange?.(text);
        }}
      >
        <ViroAmbientLight color="#ffffff" intensity={400} />

        {lineBox}

        {point1 && (
          <ViroSphere
            position={point1 as [number, number, number]}
            radius={0.014}
            materials={['measureMarkerA']}
          />
        )}

        {point2 && (
          <ViroSphere
            position={point2 as [number, number, number]}
            radius={0.014}
            materials={['measureMarkerB']}
          />
        )}
      </ViroARScene>
    );
  }
}

// initialScene é constante de módulo — referência nunca muda.
const INITIAL_SCENE = {
  scene: (props: { sceneNavigator: any }) => <ARMeasureSceneInner {...props} />,
} as { scene: () => React.JSX.Element };

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ARMeasureScreenProps {
  label: string;
  onConfirm: (valueMeters: number) => void;
  onBack: () => void;
}

// ─── Main screen: UI overlay (fora do ViroARSceneNavigator) ──────────────────
export function ARMeasureScreen({ label, onConfirm, onBack }: ARMeasureScreenProps) {
  const [overlay, setOverlay]        = useState<'instructions' | 'ar'>('instructions');
  const [point1, setPoint1]          = useState<number[] | null>(null);
  const [point2, setPoint2]          = useState<number[] | null>(null);
  const [trackingState, setTracking] = useState(COPY.ar.tracking.unavailable);
  const [feedback, setFeedback]      = useState<string | null>(null);
  const [placing, setPlacing]        = useState(false);

  const point1Ref  = React.useRef<number[] | null>(null);
  const point2Ref  = React.useRef<number[] | null>(null);
  const placingRef = React.useRef(false);

  const valueMeters = point1 && point2 ? distance3d(point1, point2) : 0;
  const bothPlaced  = !!point1 && !!point2;

  // viroAppProps ESTÁVEL — só contém onTrackingStateChange (setter estável do
  // useState). O objeto nunca muda de referência, então o ViroARSceneNavigator
  // nunca recebe "novos" props e não reinicia a sessão AR.
  const stableViroProps = React.useRef({ onTrackingStateChange: setTracking });

  // Auto-dismiss error feedback após 3 s
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(t);
  }, [feedback]);

  const applyHit = useCallback((pos: number[]) => {
    if (point1Ref.current === null) {
      // Primeiro ponto — apenas um ViroSphere é adicionado, showLine fica false.
      // Os dois setState ainda precisam de batching para consistência.
      point1Ref.current  = pos;
      _sceneState.point1 = pos;

      // FIX Bug 1 — agrupa _sceneForceUpdate + setPoint1 num único ciclo de
      // render para que o motor nativo do Viro nunca receba dois updates
      // consecutivos no mesmo frame.
      unstable_batchedUpdates(() => {
        _sceneForceUpdate?.();
        setPoint1(pos);
      });

    } else if (point2Ref.current === null) {
      // Segundo ponto — showLine passa de false para true neste mesmo render.
      // Sem batching, _sceneForceUpdate e setPoint2 disparariam dois renders
      // separados: o primeiro criaria o ViroBox nativo e o segundo tentaria
      // atualizá-lo antes de o motor terminar a inicialização → crash.
      point2Ref.current     = pos;
      _sceneState.point2    = pos;
      _sceneState.distanceM = distance3d(point1Ref.current, pos);

      // FIX Bug 1 — batching garante um único render com showLine já true
      // e com todos os valores de _sceneState consistentes.
      unstable_batchedUpdates(() => {
        _sceneForceUpdate?.();
        setPoint2(pos);
        setFeedback(null);
      });
    }
  }, []);

  const hitTestAtScreen = useCallback(async (screenX: number, screenY: number) => {
    const scene = arSceneRef.current;
    if (!scene?.performARHitTestWithPoint) return null;
    try {
      const results = await scene.performARHitTestWithPoint(screenX, screenY);
      return positionFromHit(pickHitResult(results));
    } catch { /* AR ainda a inicializar */ }
    return null;
  }, []);

  const tryPlacePoint = useCallback(async (screenX: number, screenY: number) => {
    if (placingRef.current || (point1Ref.current !== null && point2Ref.current !== null)) return;
    placingRef.current = true;
    setPlacing(true);
    try {
      const pos = await hitTestAtScreen(screenX, screenY);
      if (pos) {
        applyHit(pos);
        // setFeedback(null) já é chamado dentro de applyHit com batching.
      } else {
        setFeedback(COPY.ar.measure.noHit);
      }
    } finally {
      placingRef.current = false;
      setPlacing(false);
    }
  }, [hitTestAtScreen, applyHit]);

  const onOverlayPress = useCallback((e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    void tryPlacePoint(locationX, locationY);
  }, [tryPlacePoint]);

  const reset = () => {
    _sceneState.point1    = null;
    _sceneState.point2    = null;
    _sceneState.distanceM = 0;
    _sceneForceUpdate?.();
    point1Ref.current  = null;
    point2Ref.current  = null;
    placingRef.current = false;
    setPoint1(null);
    setPoint2(null);
    setFeedback(null);
  };

  // ── Instruções ───────────────────────────────────────────────────────────
  if (overlay === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.instrContent}>
          <Text style={styles.title}>{COPY.ar.measure.title}</Text>
          <Text style={styles.hint}>{COPY.ar.measure.hint}</Text>

          <View style={styles.stepsGuide}>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: '#38bdf8' }]} />
              <Text style={styles.stepDesc}>Toque para marcar o 1º ponto</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: '#f472b6' }]} />
              <Text style={styles.stepDesc}>Toque para marcar o 2º ponto</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: '#4ade80' }]} />
              <Text style={styles.stepDesc}>Confirme para guardar a medida</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.btn} onPress={() => setOverlay('ar')}>
            <Text style={styles.btnText}>Abrir câmera AR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Vista AR ─────────────────────────────────────────────────────────────
  const stepHint =
    !point1 ? COPY.ar.measure.placeholder :
    !point2 ? COPY.ar.measure.secondPoint :
    formatDistance(valueMeters);

  const chipStateA = point1 ? 'done' : 'active';
  const chipStateB = point2 ? 'done' : point1 ? 'active' : 'idle';

  return (
    <View style={StyleSheet.absoluteFill} collapsable={false}>

      {/* Cena AR — viroAppProps é o objeto estável em stableViroProps.current */}
      <ViroARSceneNavigator
        autofocus
        initialScene={INITIAL_SCENE}
        viroAppProps={stableViroProps.current}
        style={styles.viro}
      />

      {/* Overlay nativo (fora do Navigator) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

        <View style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity style={styles.closeBtn} onPress={onBack}>
            <Text style={styles.closeBtnText}>✕ Voltar</Text>
          </TouchableOpacity>
          <View style={styles.stepChips} pointerEvents="none">
            <View style={[styles.chip, chipStyles[chipStateA]]}>
              <Text style={styles.chipText}>A</Text>
            </View>
            <View style={styles.chipLine} />
            <View style={[styles.chip, chipStyles[chipStateB]]}>
              <Text style={[styles.chipText, chipStateB === 'idle' && styles.chipTextIdle]}>B</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onOverlayPress}
          disabled={placing || bothPlaced}
        />

        {!bothPlaced && (
          <View style={styles.reticle} pointerEvents="none">
            <View style={[styles.reticleRing, placing && styles.reticleRingPlacing]} />
            {placing && <Text style={styles.placingText}>Buscando superfície…</Text>}
          </View>
        )}

        {bothPlaced && (
          <View style={styles.distanceBanner} pointerEvents="none">
            <Text style={styles.distanceM}>{valueMeters.toFixed(2)} m</Text>
            <Text style={styles.distanceCm}>{(valueMeters * 100).toFixed(0)} cm</Text>
          </View>
        )}

        <View style={styles.uiOverlay} pointerEvents="box-none">
          {feedback && <Text style={styles.feedbackText}>{feedback}</Text>}
          <Text style={styles.stepHintText}>{stepHint}</Text>
          <Text style={styles.trackingText}>{trackingState}</Text>
          {bothPlaced && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => onConfirm(valueMeters)}
              >
                <Text style={styles.confirmBtnText}>{COPY.ar.measure.confirm}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.retryBtn} onPress={reset}>
                <Text style={styles.retryBtnText}>{COPY.ar.measure.retry}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </View>
    </View>
  );
}

const chipStyles: Record<'active' | 'done' | 'idle', object> = {
  active: { backgroundColor: '#38bdf8' },
  done:   { backgroundColor: '#4ade80' },
  idle:   { backgroundColor: 'rgba(255,255,255,0.15)' },
};

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0f172a' },
  instrContent:       { flex: 1, justifyContent: 'center', padding: 24 },
  title:              { fontSize: 22, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  hint:               { fontSize: 15, color: '#94a3b8', marginBottom: 24, lineHeight: 22 },
  stepsGuide:         { marginBottom: 28, gap: 14 },
  stepRow:            { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot:            { width: 14, height: 14, borderRadius: 7 },
  stepDesc:           { fontSize: 14, color: '#e2e8f0' },
  btn:                { backgroundColor: '#38bdf8', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnText:            { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  backBtn:            { marginTop: 16, alignItems: 'center' },
  backBtnText:        { color: '#94a3b8', fontSize: 15 },
  viro:               { flex: 1 },
  topBar:             { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingHorizontal: 20 },
  closeBtn:           { padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  closeBtnText:       { color: '#fff', fontSize: 15 },
  stepChips:          { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  chip:               { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  chipText:           { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  chipTextIdle:       { color: '#94a3b8' },
  chipLine:           { width: 18, height: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  reticle:            { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  reticleRing:        { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(56,189,248,0.8)', backgroundColor: 'transparent' },
  reticleRingPlacing: { borderColor: '#38bdf8', borderWidth: 3 },
  placingText:        { marginTop: 10, fontSize: 13, color: '#94a3b8', textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  distanceBanner:     { position: 'absolute', top: 118, left: 20, right: 20, alignItems: 'center' },
  distanceM:          { fontSize: 40, fontWeight: '700', color: '#f8fafc', textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  distanceCm:         { marginTop: 4, fontSize: 16, fontWeight: '600', color: 'rgba(248,250,252,0.9)', textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  uiOverlay:          { position: 'absolute', bottom: 36, left: 20, right: 20, paddingBottom: 8 },
  stepHintText:       { fontSize: 16, fontWeight: '600', color: '#f8fafc', textAlign: 'center', marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  feedbackText:       { fontSize: 14, color: '#fecaca', textAlign: 'center', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  trackingText:       { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 12, textAlign: 'center' },
  actions:            { flexDirection: 'row', marginTop: 4 },
  confirmBtn:         { flex: 1, backgroundColor: '#38bdf8', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginRight: 6 },
  confirmBtnText:     { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  retryBtn:           { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center' },
  retryBtnText:       { fontSize: 15, color: '#f8fafc' },
});