import { N8N_CHAT_WEBHOOK_URL, N8N_WEBHOOK_BEARER_TOKEN } from '../config/n8n';

const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Extrai texto legível da resposta do n8n (formatos comuns de Respond to Webhook / AI).
 */
export function extractAssistantText(payload) {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload.trim();

  const tryString = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  if (typeof payload === 'object') {
    const keys = ['reply', 'message', 'text', 'output', 'response', 'answer', 'content', 'chatOutput'];
    for (const k of keys) {
      const s = tryString(payload[k]);
      if (s) return s;
    }
    if (payload.data != null) {
      const fromData = extractAssistantText(payload.data);
      if (fromData) return fromData;
    }
    if (Array.isArray(payload) && payload.length > 0) {
      const first = payload[0];
      if (first?.json) return extractAssistantText(first.json) || '';
      return extractAssistantText(first) || '';
    }
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return '';
  }
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Envia mensagem ao webhook n8n e devolve texto do assistente (ou lança erro).
 * @param {{ text: string, sessionId: string, metadata?: object }} params
 */
export async function sendChatMessage({ text, sessionId, metadata = {} }) {
  const url = N8N_CHAT_WEBHOOK_URL;
  if (!url) {
    throw new Error('URL do webhook n8n não configurada.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (N8N_WEBHOOK_BEARER_TOKEN) {
    headers.Authorization = `Bearer ${N8N_WEBHOOK_BEARER_TOKEN}`;
  }

  const body = {
    message: text,
    chatInput: text,
    sessionId,
    ...metadata,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      const detail =
        typeof payload === 'string'
          ? payload
          : payload?.message || payload?.error || response.statusText;
      throw new Error(detail || `HTTP ${response.status}`);
    }

    const assistantText = extractAssistantText(payload);
    if (assistantText) return assistantText;

    if (response.status === 204 || payload === null || payload === '') {
      return 'Recebido. O fluxo não devolveu texto; confira a saída no n8n.';
    }

    return 'Resposta recebida sem texto reconhecido.';
  } finally {
    clearTimeout(timer);
  }
}
