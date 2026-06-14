# Guia de Execução, Instalação e Testes

Esta unidade contém o guia prático passo a passo de como rodar o ambiente completo localmente, expor os serviços de backend usando túneis públicos (ngrok) para testes de dispositivos físicos e executar o fluxo de testes de ponta a ponta.

---

## 💻 1. Inicializando o Backend (AvaliacaoBackend)

O backend do sistema centraliza a persistência de arquivos, imagens e a conexão com o banco de dados AWS RDS MySQL.

### Passo 1.1: Instalar Dependências
Abra o terminal na pasta [/AvaliacaoBackend](file:///c:/06_PINT-2/Integracao_RA/AvaliacaoBackend) e instale os pacotes necessários:
```bash
npm install
```

### Passo 1.2: Inicializar o Servidor
Inicie a API do backend:
```bash
npm start
```
O servidor inicializará, criará as pastas de upload locais e rodará as migrações automáticas de classificação no banco RDS, exibindo a mensagem: `🚀 Servidor AvaliacaoBackend rodando na porta 3000!`.

### Passo 1.3: Exposição Pública com ngrok (Para Dispositivos Físicos)
Se você for testar o aplicativo em um celular físico ou utilizar o webhook do n8n para enviar requisições de volta ao servidor, você precisará expor a porta local `3000` na internet:
```bash
ngrok http 3000
```
Copie a URL segura gerada pelo ngrok (ex: `https://caddie-dislodge-unscented.ngrok-free.dev`).

---

## 📱 2. Inicializando o Aplicativo do Técnico (AvaliacaoARExpo)

### Passo 2.1: Configurar a URL da API
Abra o arquivo [SummaryScreen.js](file:///c:/06_PINT-2/Integracao_RA/AvaliacaoARExpo/src/screens/SummaryScreen.js) e atualize a variável `API_URL` com a URL do ngrok obtida no passo 1.3:
```javascript
let API_URL = 'https://SUA-URL-NGROK.ngrok-free.dev/api';
```

### Passo 2.2: Instalar Dependências
Abra o terminal na pasta [/AvaliacaoARExpo](file:///c:/06_PINT-2/Integracao_RA/AvaliacaoARExpo) e instale os pacotes:
```bash
npm install
```

### Passo 2.3: Inicializar o Expo
Execute o Metro Bundler do Expo:
```bash
npx expo start
```
* Para testar em emulador Android, pressione `a`.
* Para testar em simulador iOS, pressione `i`.
* Para testar em dispositivo físico, escaneie o QR Code na tela usando o aplicativo **Expo Go** (Android) ou a câmera do celular (iOS).

---

## 🏢 3. Inicializando o Painel Admin (AvaliacaoAdminExpo)

### Passo 3.1: Configurar a URL da API
Abra o arquivo [App.js (Admin)](file:///c:/06_PINT-2/Integracao_RA/AvaliacaoAdminExpo/App.js) e atualize a variável `API_URL` com a URL do ngrok obtida no passo 1.3:
```javascript
const API_URL = 'https://SUA-URL-NGROK.ngrok-free.dev/api';
```

### Passo 3.2: Instalar Dependências
Abra o terminal na pasta [/AvaliacaoAdminExpo](file:///c:/06_PINT-2/Integracao_RA/AvaliacaoAdminExpo) e execute:
```bash
npm install
```

### Passo 3.3: Inicializar o Expo
Execute o Metro Bundler do Admin:
```bash
npx expo start
```
Abra no emulador ou escaneie com o **Expo Go** em outro dispositivo.

---

## 📝 4. Roteiro de Teste de Ponta a Ponta

Siga estes passos para executar uma vistoria completa no sistema:

### Fase A: Preparação
1. Abra o **Painel Admin**, digite as credenciais do administrador (`usuario` / `senha` cadastrados na tabela `admins` do RDS) e faça login.
2. Acesse a aba **Novo**, preencha o Nome do Cliente, Endereço de Instalação e Telefone e clique em **Gerar Protocolo**.
3. Um código de 6 dígitos (ex: `HG73A2`) aparecerá na tela. Anote-o.

### Fase B: Execução em Campo (Celular do Técnico)
1. Abra o **App do Técnico**, digite o código do protocolo e avance.
2. O aplicativo validará as informações do cliente e liberará o checklist.
3. Clique em **Foto Geral** e tire uma foto ampla do espaço da instalação.
4. Clique em **Medição AR** e vá até a entrada do link (ex: corredor do andar). Toque na tela para posicionar o primeiro ponto. Caminhe pelo trajeto traçando curvas e finalize tocando no ponto final do roteador. Clique em concluir.
5. No modal glassmorphic de infraestrutura, escolha a passagem (ex: **Instalação Aparente** ➔ **Canaletas**).
6. Clique em **Simular roteador em AR** e posicione o cubo 3D no local final. Ao clicar em fixar, responda "Sim" para a presença de tomada a menos de 1m e selecione "110V".
7. Grave um **Vídeo da Rota** percorrendo a fiação virtual traçada.
8. Tire as fotos técnicas adicionais: **Quadro principal** e **Tomada do roteador**.
9. Na tela de resumo final, confira os scores e dados e clique em **Enviar para análise**.

### Fase C: Auditoria do NOC
1. Retorne ao **Painel Admin**, vá para a aba **Laudos** e clique em **Atualizar Laudos**.
2. O novo laudo aparecerá na lista. Toque nele para abrir.
3. Revise as fotos técnicas complementares ( Quadro e Tomada ) e os dados de passagem do cabo.
4. Veja na seção de recomendações o diagnóstico dinâmico do n8n e os roteadores com o selo de recomendação baseados no modelo enviado pela IA.
5. Selecione o roteador e clique em **Salvar Escolha de Roteador**.
6. Clique em **Aprovar Instalação (Física)**.
7. Acesse a aba **Protocolos/NOC**, clique em **Ativar NOC** para finalizar a ordem de serviço no banco RDS. O status mudará para `Ativado`.
