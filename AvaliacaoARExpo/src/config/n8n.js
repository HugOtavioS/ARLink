import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? Constants.manifest?.extra ?? {};

/** URL do webhook n8n (chat). Pode ser sobrescrita em app.json > expo.extra */
export const N8N_CHAT_WEBHOOK_URL =
  (typeof extra.n8nChatWebhookUrl === 'string' && extra.n8nChatWebhookUrl.trim()) ||
  'https://misaelbm.app.n8n.cloud/webhook/chatbot';

/** Token opcional Bearer se o workflow exigir autenticação */
export const N8N_WEBHOOK_BEARER_TOKEN =
  (typeof extra.n8nWebhookBearerToken === 'string' && extra.n8nWebhookBearerToken.trim()) || '';
