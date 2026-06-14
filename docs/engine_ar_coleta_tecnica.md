# Engine de Realidade Aumentada (AR) e Coleta Técnica

Esta unidade aprofunda a implementação da Realidade Aumentada (RA) móvel usando `@reactvision/react-viro` (ViroReact), detalhando a matemática de cálculo espacial, as diretrizes de escopo completo da operadora e as validações elétricas e físicas.

---

## 🛠️ O Motor ViroReact no Expo

O aplicativo utiliza a biblioteca **ViroReact**, que abstrai as APIs nativas de realidade aumentada dos sistemas operacionais móveis:
* **ARKit** no Apple iOS.
* **ARCore** no Google Android.

O motor inicializa um plano tridimensional a partir da câmera e cria um sistema de coordenadas cartesiano local $(x, y, z)$ baseado no giroscópio, acelerômetro e sensores visuais de odometria do dispositivo móvel.

---

## 📐 Lógica de Medição Multi-ponto Contínua

Substituindo medições simples de ponto A ao ponto B, o sistema utiliza um array contínuo de vetores tridimensionais (âncoras virtuais) para acompanhar as mudanças físicas de direção do cabo de rede (subidas de parede, cantos de sala, desvios de portas).

### 1. Cálculo de Distância Euclidiana em 3D
Cada segmento de cabo entre duas âncoras consecutivas é calculado usando a distância Euclidiana tridimensional:

$$d_i = \sqrt{(x_{i+1} - x_i)^2 + (y_{i+1} - y_i)^2 + (z_{i+1} - z_i)^2}$$

Onde:
* $x, y, z$ representam as coordenadas do ponto espacial em metros.
* $i$ é o índice da âncora inicial do segmento.

A distância linear bruta acumulada ($D_{\text{linear}}$) é a somatória de todos os segmentos traçados:

$$D_{\text{linear}} = \sum_{i=1}^{n-1} d_i$$

### 2. Margem Técnica de Sobra (+12%)
Para garantir que o técnico tenha cabo físico suficiente no mundo real para crimpagem de conectores, voltas em conduítes e curvas, o aplicativo adiciona automaticamente **12% de folga** à distância acumulada:

$$D_{\text{final}} = D_{\text{linear}} \times 1.12$$

Esta regra de negócio é processada localmente em [ARScreen.js] e enviada estruturadamente ao banco RDS e ao n8n:
* `distanceRaw`: Distância linear acumulada medida (bruta).
* `distanceMeters`: Distância final com margem de 12% (usada para estimativa de materiais).

---

## 📍 Mapeamento Obrigatório: Da Origem ao Destino

Para garantir que o escopo de medição cubra **100% da instalação** e evite laudos parciais, o aplicativo instrui e exige que o técnico siga a seguinte dinâmica de traçado:

```
[Entrada de Sinal (Hall / Fibra Rua)] ➔ ➔ [Âncoras de Trajeto (Curvas / Paredes)] ➔ ➔ [Local do Roteador]
```

1. **Ponto Inicial (Origem do Link):** O primeiro clique do técnico na tela deve marcar obrigatoriamente a caixa de telecomunicações do hall do andar ou a entrada principal do conduíte que traz a fibra ótica da rua.
2. **Segmentos Intermediários:** Âncoras adicionais para contornar vigas, paredes ou portas.
3. **Ponto Final (Destino):** A última âncora deve coincidir exatamente com o local físico onde o roteador Wi-Fi será alocado.

---

## 🔌 Validação de Alimentação Elétrica (Tomadas)

Evitar roteadores instalados longe de fontes elétricas é um dos principais objetivos do laudo. Durante a fixação do roteador 3D (Simulador de Roteador), o aplicativo auxilia o cliente a responder com as seguintes opções:

1. **Prompt de Distância:**
   O aplicativo exibe a pergunta: *"Existe uma tomada disponível a menos de 1 metro deste ponto?"*
   * Opções: **[Sim]**, **[Não]** e **[Não tenho certeza]** (caso o cliente não consiga estimar a distância).
2. **Prompt de Voltagem:**
   Se a resposta for "Sim", abre a seleção de voltagem:
   * Opções: **[110V]**, **[220V]** e **[Não sei a voltagem]** (ajuda usuários leigos).
3. **Persistência de Dados:**
   Estes dados são anexados à tarefa `cuboAR`:
   * `temTomadaProxima`: booleano (`true`/`false`) ou `null` (se selecionado "Não tenho certeza").
   * `voltagemTomada`: string (`110V`, `220V`, `'desconhecida'` ou `null`).

---

## 📁 Definição da Infraestrutura de Passagem

Ao finalizar a medição de cabo, o técnico ou cliente interage com um modal interativo (glassmorphism) para definir como o cabo de rede UTP será conduzido no espaço:

* **Conduíte Interno:**
  * O técnico seleciona se o conduíte está **Livre** ou **Obstruído**.
* **Instalação Aparente:**
  * Define se haverá necessidade de fixação física e pede a especificação: **Canaletas plásticas**, **Conduletes metálicos** ou **Fixadores (clips/grapas)**.
* **Solto por Cima do Forro/Gesso:**
  * Define que o cabo passará solto em área técnica não visível.
* **Não sei dizer:**
  * Opção de acessibilidade para clientes leigos que não sabem identificar o tipo de infraestrutura da parede. Salva `tipo: 'nao_sei'` e `detalhe: 'Não sei dizer'`, permitindo que o NOC programe uma validação técnica presencial.
