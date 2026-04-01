export const POINTS = {
  CHECKLIST_ITEM: 20,
  MEASURE: 30,
  PHOTO: 25,
  VIDEO: 40,
  COMPLETE_STEP: 10,
} as const;

export const COPY = {
  welcome: {
    title: 'Avaliação técnica da sua instalação',
    subtitle: 'Vamos guiá-lo com Realidade Aumentada para coletar as informações que nossa equipe precisa — sem necessidade de visita presencial.',
    cta: 'Começar avaliação',
    tip: 'Você vai tirar fotos, medir espaços e gravar um vídeo curto. Cada etapa vale pontos.',
  },
  checklist: {
    title: 'Checklist da instalação',
    subtitle: 'Marque e complete cada item com as evidências pedidas. Quanto mais completo, mais rápida a análise.',
    next: 'Continuar',
    done: 'Item concluído',
  },
  ar: {
    measure: {
      title: 'Medir espaço',
      hint: 'Toque em dois pontos no chão ou parede para medir a distância.',
      placeholder: 'Toque para colocar o primeiro ponto...',
      result: 'Distância: {value} m',
      confirm: 'Usar esta medida',
      retry: 'Medir de novo',
    },
    photo: {
      title: 'Registrar foto',
      hint: 'Enquadre o que precisa ser registrado e toque no botão para capturar.',
      capture: 'Capturar foto',
      saved: 'Foto registrada com sucesso.',
    },
    video: {
      title: 'Gravar vídeo',
      hint: 'Mostre o ambiente (parede, teto, ponto de entrada) por alguns segundos.',
      start: 'Iniciar gravação',
      stop: 'Parar gravação',
      saved: 'Vídeo registrado com sucesso.',
    },
    tracking: {
      normal: 'Ambiente detectado. Pode continuar.',
      limited: 'Mova o celular devagar para melhorar a detecção.',
      unavailable: 'Aponte a câmera para o chão ou paredes para começar.',
    },
  },
  summary: {
    title: 'Evidências coletadas',
    subtitle: 'Revise os dados abaixo. Nossa equipe analisará e retornará em breve.',
    send: 'Enviar para análise',
    sending: 'Enviando...',
    success: 'Tudo certo! Você será contactado em breve.',
  },
  errors: {
    camera: 'Não foi possível acessar a câmera. Verifique as permissões.',
    save: 'Erro ao salvar. Tente novamente.',
    recording: 'Erro na gravação. Verifique permissões de microfone e armazenamento.',
  },
} as const;
