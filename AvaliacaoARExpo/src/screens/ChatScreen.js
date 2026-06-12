import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useEvaluation } from '../contexts/EvaluationContext';
import { sendChatMessage } from '../services/n8nChatClient';
import { COLORS } from '../config/colors';

const SESSION_KEY = '@pint_n8n_chat_session_v1';

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ChatScreen() {
  const { evaluationData } = useEvaluation();
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Carrega ou cria a Sessão
      let sid = await AsyncStorage.getItem(SESSION_KEY);
      if (!sid) {
        sid = createId();
        await AsyncStorage.setItem(SESSION_KEY, sid);
      }
      if (!cancelled) setSessionId(sid);

      // 2. Carrega as mensagens salvas
      try {
        const storedMsgs = await AsyncStorage.getItem('@pint_n8n_chat_messages_v1');
        if (storedMsgs && !cancelled) {
          setMessages(JSON.parse(storedMsgs));
        }
      } catch (e) {
        console.error('Falha ao carregar mensagens', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Salva mensagens toda vez que elas mudam
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('@pint_n8n_chat_messages_v1', JSON.stringify(messages));
      } catch (e) {
        console.error('Falha ao salvar mensagens', e);
      }
    })();
  }, [messages]);

  const appendMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { ...msg, id: msg.id || createId() }]);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !sessionId) {
      return;
    }

    setInput('');
    appendMessage({ role: 'user', text: trimmed });

    const customer = evaluationData?.customer || {};
    const metadata = {
      customer: {
        nome: customer.nome,
        telefone: customer.telefone,
        email: customer.email,
        endereco: customer.endereco,
      },
      source: 'AvaliacaoARExpo',
    };

    setSending(true);
    try {
      const reply = await sendChatMessage({
        text: trimmed,
        sessionId,
        metadata,
      });
      appendMessage({ role: 'assistant', text: reply });
    } catch (e) {
      const errText = e?.message || 'Falha ao contactar o assistente.';
      appendMessage({ role: 'assistant', text: errText, isError: true });
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionId, evaluationData, appendMessage]);

  const renderItem = useCallback(({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.bubbleRow,
          isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
            item.isError && styles.bubbleError,
          ]}
        >
          {!isUser && <Text style={styles.bubbleLabel}>Assistente</Text>}
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.text}</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Chat com o assistente</Text>
              <Text style={styles.emptySubtitle}>
                As mensagens são enviadas ao n8n. Os dados do cliente atual são incluídos como
                contexto opcional.
              </Text>
            </View>
          }
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Escreva uma mensagem…"
            placeholderTextColor={COLORS.textSecondary}
            value={input}
            onChangeText={setInput}
            editable={!sending}
            multiline
            maxLength={4000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending || !sessionId}
            accessibilityLabel="Enviar mensagem"
          >
            {sending ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.sendBtnText}>Enviar</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  empty: {
    paddingTop: 32,
    paddingHorizontal: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleRow: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleError: {
    borderColor: COLORS.errorBorder,
  },
  bubbleLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '600',
  },
  bubbleText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: '#000000',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    color: COLORS.text,
    fontSize: 16,
    backgroundColor: COLORS.background,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
