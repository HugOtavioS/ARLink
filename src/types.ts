export type ChecklistItemId =
  | 'acesso_instalacao'
  | 'ponto_entrada'
  | 'espaco_equipamento'
  | 'energia'
  | 'cobertura_sinal';

export interface ChecklistItem {
  id: ChecklistItemId;
  label: string;
  description: string;
  done: boolean;
  evidence?: 'photo' | 'video' | 'measure' | 'none';
}

export interface MeasureEvidence {
  id: string;
  itemId?: ChecklistItemId;
  label: string;
  valueMeters: number;
  timestamp: number;
}

export interface PhotoEvidence {
  id: string;
  itemId?: ChecklistItemId;
  label: string;
  uri: string;
  timestamp: number;
}

export interface VideoEvidence {
  id: string;
  itemId?: ChecklistItemId;
  label: string;
  uri: string;
  durationSeconds: number;
  timestamp: number;
}

export interface ClientInfo {
  fullName: string;
  phone: string;
  email: string;
  address: string;
}

export interface CollectionState {
  clientInfo: ClientInfo | null;
  checklist: ChecklistItem[];
  measures: MeasureEvidence[];
  photos: PhotoEvidence[];
  videos: VideoEvidence[];
  totalPoints: number;
  currentStep: number;
  maxSteps: number;
}

export const INITIAL_CHECKLIST: ChecklistItem[] = [
  {
    id: 'acesso_instalacao',
    label: 'Acesso para instalação',
    description: 'Confirmar se há acesso seguro ao local de instalação',
    done: false,
    evidence: 'photo',
  },
  {
    id: 'ponto_entrada',
    label: 'Ponto de entrada do cabo',
    description: 'Registrar onde o cabo de rede pode entrar no imóvel',
    done: false,
    evidence: 'photo',
  },
  {
    id: 'espaco_equipamento',
    label: 'Espaço para equipamento',
    description: 'Medir e registrar o espaço disponível para o modem/roteador',
    done: false,
    evidence: 'measure',
  },
  {
    id: 'energia',
    label: 'Ponto de energia',
    description: 'Registrar proximidade de tomada para o equipamento',
    done: false,
    evidence: 'photo',
  },
  {
    id: 'cobertura_sinal',
    label: 'Cobertura do local',
    description: 'Gravar um vídeo curto mostrando o ambiente para análise de sinal',
    done: false,
    evidence: 'video',
  },
];
