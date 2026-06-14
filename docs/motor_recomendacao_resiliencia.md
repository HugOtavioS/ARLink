# Mecanismo de Recomendação Dinâmica e Resiliência

Esta unidade descreve a política de não acoplamento de lógica no backend, a estrutura de payloads de comunicação com o **n8n** e a arquitetura de resiliência e auto-healing para tratamento de falhas em tempo de execução.

---

## 📡 Webhook do n8n: Payloads e Estrutura

### 1. Payload de Envio (Request)
Ao enviar a avaliação, o aplicativo móvel ou o backend realiza uma requisição POST enviando os seguintes dados brutos coletados:

```json
{
  "protocolo": "8F3A2B",
  "cliente": "Hugo Otávio",
  "medicao_distancia_metros": 11.20,
  "foto_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "data_envio": "2026-06-13T21:30:00.000Z",
  "grau_complexidade": "medio",
  "categorias_roteador": ["mesh", "high_tech"],
  "infraestrutura_passagem": {
    "tipo": "conduite",
    "detalhe": "obstruido"
  },
  "tomada_proxima": true,
  "voltagem_tomada": "110V"
}
```

### 2. Formato de Resposta do n8n (Response)
O fluxo do n8n analisa os dados e responde com uma estrutura JSON rica contendo a análise visual da foto e a recomendação técnica:

```json
[
  {
    "sucesso": true,
    "recomendacoes": {
      "resumo_tecnico": "Passagem em ambiente comercial com fiação restrita. Foi escolhida fiação Cat6 aparente com canaleta plástica devido ao conduíte obstruído.",
      "grau_complexidade_avaliado": "medio",
      "tipo_cabo_escolhido": "Cat6",
      "metragem_cabo_calculada": 12,
      "itens_recomendados": [
        {
          "categoria": "Cabo",
          "item": "Cat6 UTP",
          "quantidade": 12,
          "unidade": "metros"
        },
        {
          "categoria": "Conector",
          "item": "Conector RJ45 Cat6",
          "quantidade": 4
        },
        {
          "categoria": "Fixador",
          "item": "Canaletas Plásticas Adesivas",
          "quantidade": 6
        },
        {
          "categoria": "Ferramenta",
          "item": "Alicate Crimpador de Passagem"
        },
        {
          "categoria": "Roteador",
          "item": "Roteador Wi-Fi 6 de Alto Desempenho",
          "modelo_sugerido": "RT-AX88U"
        }
      ],
      "observacoes_instalacao": [
        "Necessita de guia de nylon para traçado aparente."
      ],
      "alertas": [
        "Atenção para a curva acentuada na descida da viga comercial."
      ],
      "estimativa_tempo_instalacao_horas": 1.5
    }
  }
]
```

---

## 🧩 Mapeamento Dinâmico no Servidor

Ao receber este retorno, a API do backend executa uma varredura para montar o objeto de cabeamento, ferramentas e recomendação de roteadores de forma dinâmica:

```
 n8n JSON Response
        │
        ▼
 ┌───────────────┐
 │ caboItem      │ ──► cabo_utp_metros: quantidade (ou metragem_cabo_calculada)
 └───────────────┘     tipo_cabo: item (ou tipo_cabo_escolhido)
 ┌───────────────┐
 │ conectorItem  │ ──► conectores_rj45: quantidade
 └───────────────┘
 ┌───────────────┐
 │ fixadoresItem │ ──► fixadores_cabo_unidades: quantidade
 └───────────────┘
 ┌───────────────┐
 │ ferramentas   │ ──► ferramentas: array filtrado de 'Ferramenta'
 └───────────────┘
 ┌───────────────┐
 │ adicionais    │ ──► itens_adicionais: array filtrado de outros materiais
 └───────────────┘
```

Para a escolha de roteadores:
1. O backend busca o catálogo completo de roteadores ativos no banco RDS (`SELECT * FROM roteadores`).
2. Varre o array de itens buscando pela categoria `Roteador` e extrai o campo `modelo_sugerido`.
3. Executa um casamento textual contido: se o modelo sugerido pela IA interceptar algum modelo do RDS (ex: `RT-AX88U` sugerido casa com o modelo cadastrado `RT-AX88U`), o ID correspondente é armazenado no array `roteadores_recomendados`.
4. Caso a IA não sugira nenhum roteador ou o modelo sugerido não esteja cadastrado, a lista de indicações é mantida vazia (`[]`), deixando a escolha totalmente a cargo da auditoria humana do NOC.

---

## 🛡️ Lógica de Resiliência e Auto-healing (Autocorreção)

Sistemas em nuvem de IA podem oscilar ou falhar temporariamente. Para evitar o travamento da operação de vistorias técnicas, o sistema adota as seguintes diretrizes de resiliência:

### 1. Tratamento de Falha no Envio (Submit)
Se o n8n estiver fora do ar ou o timeout de requisição expirar (limite de 6 segundos), o backend:
* Grava `NULL` nas colunas de recomendações no banco de dados (`cabos_ferramentas` e `roteadores_recomendados`).
* Grava no campo `n8n_response` um JSON descritivo:
  ```json
  {
    "error": "recomendacao_indisponivel",
    "analysis": "Não foi possível gerar recomendações automáticas para este laudo porque o serviço de análise (n8n) está indisponível..."
  }
  ```
* O aplicativo administrador exibe um painel de alerta vermelho informando a indisponibilidade.

### 2. Auto-healing em Segundo Plano (Reprocessamento)
Quando o administrador abre os detalhes de um laudo técnico que está com recomendações nulas, o sistema executa o processo de autocorreção:

1. O painel admin realiza uma requisição GET para `/api/avaliacoes/:id/recomendacoes`.
2. O backend identifica que as recomendações do laudo estão vazias ou com erro no banco.
3. Em segundo plano, o backend reconstrói o payload técnico a partir das evidências originais salvas no RDS (metragem bruta, fotos e tomada).
4. Dispara uma nova chamada ao webhook do n8n.
5. Se o n8n respondeu com sucesso, o backend atualiza dinamicamente as tabelas no RDS (`UPDATE recomendacoes SET ...`) e retorna os dados reais de materiais e roteador para o painel administrador sem a necessidade de reenvio por parte do técnico de campo.
