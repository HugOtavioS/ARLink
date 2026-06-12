  const express = require('express');
  const mysql = require('mysql2/promise');
  const cors = require('cors');
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');
  const crypto = require('crypto');

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // 1. Cria a pasta "uploads" se não existir
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  // 2. Torna a pasta pública para as imagens poderem ser vistas
  app.use('/uploads', express.static(uploadDir));

  // 3. Configura o "multer" (gerenciador de arquivos)
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueName + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage });

  // 4. Nova rota que recebe a foto e devolve o link dela
  app.post('/api/upload', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    
    // Retorna a URL da imagem (ex: /uploads/16238123...jpg)
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // Rota raiz para o "Preview" do Cloud9 funcionar sem dar erro
  app.get('/', (req, res) => {
    res.send('🚀 Servidor AvaliacaoBackend rodando no AWS Cloud9! Acesse /api/avaliacoes');
  });

  // Configuração do Banco de Dados AWS RDS
  const dbConfig = {
    host: 'database-2.ceklsazpveu2.us-east-1.rds.amazonaws.com',
    user: 'admin',
    password: 's3nh44wss',
    database: 'app_instalacoes',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
      // Para AWS RDS, habilita o SSL mas não exige o arquivo físico na máquina local
      rejectUnauthorized: false
    }
  };

  const pool = mysql.createPool(dbConfig);

  // Inicialização e Criação de Tabelas (se não existirem)
  async function initializeDatabase() {
    try {
      console.log('🔄 Inicializando tabelas do banco de dados...');
      const connection = await pool.getConnection();

      // NOTA: A tabela 'roteadores' já existe na base de dados com as colunas reais:
      // (id, marca, modelo, padrao_wifi, velocidade_maxima, portas_ethernet, antenas, principais_recursos, categoria)
      // Não recriamos nem deletamos a tabela 'roteadores' para preservar a integridade da base.

      // 2. Tabela de Recomendações
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS recomendacoes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          avaliacao_id INT NOT NULL,
          cabos_ferramentas TEXT,
          roteadores_recomendados TEXT,
          n8n_response TEXT,
          roteadores_selecionados TEXT,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
        )
      `);

      // Migração para adicionar colunas de complexidade e categorias desejadas em recomendacoes se não existirem
      try {
        await connection.execute(`ALTER TABLE recomendacoes ADD COLUMN grau_complexidade VARCHAR(50) DEFAULT 'medio'`);
      } catch (e) {}
      try {
        await connection.execute(`ALTER TABLE recomendacoes ADD COLUMN categorias_roteador TEXT DEFAULT NULL`);
        console.log('✅ Migração: Colunas de complexidade e categorias adicionadas em recomendacoes.');
      } catch (e) {}

      // 3. Atualiza as categorias padrão de todos os 20 roteadores da base para viabilizar as recomendações inteligentes
      console.log('🌱 Classificando roteadores da base de dados em categorias especializadas...');
      
      // High-Tech
      await connection.execute(`
        UPDATE roteadores SET categoria = 'high_tech' 
        WHERE modelo IN ('RT-AX88U', 'Nighthawk RAX80', 'MR9600', 'DIR-X5460', 'Mi Router AX9000', 'UniFi Dream Machine', 'RT2600ac')
      `);
      
      // Mesh
      await connection.execute(`
        UPDATE roteadores SET categoria = 'mesh' 
        WHERE modelo IN ('Nest Wifi', 'Orbi RBK50', 'Deco M4')
      `);
      
      // Baratos
      await connection.execute(`
        UPDATE roteadores SET categoria = 'barato' 
        WHERE modelo IN ('Archer C6', 'Action RG 1200', 'MR70X', 'RX9 Pro', 'hAP ac2')
      `);
      
      // Custo-Benefício
      await connection.execute(`
        UPDATE roteadores SET categoria = 'custo_beneficio' 
        WHERE modelo IN ('Archer AX50', 'WiFi AX3 Pro', 'RT-AC68U', 'DIR-882', 'EA8300')
      `);
      
      console.log('🌱 Classificação dos roteadores concluída com sucesso!');

      connection.release();
      console.log('✅ Inicialização do banco concluída!');
    } catch (err) {
      console.error('❌ Falha ao inicializar tabelas:', err);
    }
  }

  // Executa a inicialização
  initializeDatabase();

  // Endpoint para testar conexão
  app.get('/api/health', async (req, res) => {
    try {
      const connection = await pool.getConnection();
      connection.release();
      res.json({ status: 'ok', message: 'Conectado ao AWS RDS com sucesso!' });
    } catch (err) {
      console.error('Erro de conexão:', err);
      res.status(500).json({ error: 'Falha na conexão com o banco', details: err.message });
    }
  });

  // Endpoint para salvar uma nova avaliação (App Principal)
  app.post('/api/avaliacoes', async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { customer, tasks, totalScore } = req.body;
      await connection.beginTransaction();

      // 1. Inserir ou Atualizar Cliente
      const [clienteResult] = await connection.execute(
        `INSERT INTO clientes (nome, telefone, email, endereco) 
        VALUES (?, ?, ?, ?)`,
        [customer.nome, customer.telefone || null, customer.email || null, customer.endereco]
      );
      const clienteId = clienteResult.insertId;

      // 2. Verifica se já existe uma avaliação para esse protocolo (Reenvio)
      let avaliacaoId;
      const [existingAvaliacao] = await connection.execute(
        `SELECT id FROM avaliacoes WHERE protocolo = ?`, 
        [customer.protocolo]
      );

      if (existingAvaliacao.length > 0) {
        // Atualiza a avaliação existente
        avaliacaoId = existingAvaliacao[0].id;
        await connection.execute(
          `UPDATE avaliacoes SET total_score = ?, status = 'PENDENTE', cliente_id = ? WHERE id = ?`,
          [totalScore || 0, clienteId, avaliacaoId]
        );
        // Limpa as evidências antigas para inserir as novas corrigidas
        await connection.execute(`DELETE FROM evidencias WHERE avaliacao_id = ?`, [avaliacaoId]);
      } else {
        // Nova Avaliação
        const [avaliacaoResult] = await connection.execute(
          `INSERT INTO avaliacoes (protocolo, cliente_id, total_score, status) 
          VALUES (?, ?, ?, 'PENDENTE')`,
          [customer.protocolo, clienteId, totalScore || 0]
        );
        avaliacaoId = avaliacaoResult.insertId;
      }

      // 3. Inserir Evidências (Iterar sobre as tasks do JSON)
      for (const [taskKey, taskData] of Object.entries(tasks)) {
        const mediaUrl = taskData.mediaUri || null;
        const dadosAr = taskData.arData ? JSON.stringify(taskData.arData) : null;
        const completada = taskData.completed ? 1 : 0;
        const pontos = taskData.points || 0;

        await connection.execute(
          `INSERT INTO evidencias (avaliacao_id, tipo_tarefa, completada, media_url, dados_ar, pontos_obtidos) 
          VALUES (?, ?, ?, ?, ?, ?)`,
          [avaliacaoId, taskKey, completada, mediaUrl, dadosAr, pontos]
        );
      }

      // 4. Atualiza o status do protocolo para que não possa ser reusado de imediato (vai para análise)
      if (customer.protocolo) {
        await connection.execute(
          `UPDATE protocolos SET status = 'EM_ANALISE' WHERE codigo = ?`,
          [customer.protocolo]
        );
      }

      // --- GERAR RECOMENDAÇÃO INTELIGENTE (n8n + Lógica de Negócio) ---
      let distanceMeters = 0;
      if (tasks.medicaoAR?.completed && tasks.medicaoAR?.arData?.distanceMeters) {
        distanceMeters = tasks.medicaoAR.arData.distanceMeters;
      }

      // Se a resposta do n8n já foi enviada diretamente pelo aplicativo, usamos ela
      let n8nResponseData = req.body.n8nResponse || null;

      if (n8nResponseData) {
        console.log('[Recomendacao] Usando dados do n8n enviados diretamente pelo aplicativo');
      } else {
        console.log('[Recomendacao] Resposta direta do n8n não recebida. Iniciando busca no servidor (fallback)...');
        let base64Photo = null;
        if (tasks.fotoGeral?.completed && tasks.fotoGeral?.mediaUri) {
          try {
            const mediaUri = tasks.fotoGeral.mediaUri;
            // mediaUri é algo como https://.../uploads/16238123.jpg ou file://...
            // Extraímos o nome do arquivo (ex: 16238123.jpg)
            const filename = path.basename(mediaUri);
            const filePath = path.join(uploadDir, filename);

            if (fs.existsSync(filePath)) {
              console.log(`[Recomendacao] Lendo imagem para base64: ${filePath}`);
              const fileBuffer = fs.readFileSync(filePath);
              base64Photo = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
            }
          } catch (imgErr) {
            console.error('[Recomendacao] Falha ao ler foto para base64:', imgErr);
          }
        }

        // Payload para o n8n
        const n8nPayload = {
          protocolo: customer.protocolo,
          cliente: customer.nome,
          medicao_distancia_metros: distanceMeters,
          foto_base64: base64Photo,
          data_envio: new Date().toISOString()
        };

        // URL do webhook do n8n atualizada
        const N8N_WEBHOOK_URL = 'https://misael2049.app.n8n.cloud/webhook/0630da63-2af8-498f-82a7-29eb6fe0b5c5';
        
        try {
          console.log(`[Recomendacao] Enviando payload ao n8n (fallback): ${N8N_WEBHOOK_URL}`);
          
          // Timeout controlado para a requisição ao n8n
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 segundos de limite
          
          const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(n8nPayload),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (n8nResponse.ok) {
            n8nResponseData = await n8nResponse.json();
            console.log('[Recomendacao] Sucesso no retorno do n8n (fallback):', n8nResponseData);
          } else {
            console.warn(`[Recomendacao] n8n (fallback) respondeu com erro: ${n8nResponse.status}`);
          }
        } catch (n8nErr) {
          console.error('[Recomendacao] Erro ou timeout ao chamar n8n (fallback):', n8nErr.message);
        }
      }

      // Se o n8n respondeu com sucesso, geramos as recomendações completas
      let cabosFerramentas = null;
      let recommendedRouterIds = null;
      let n8nResponseValue = null;
      const selectedCats = req.body.categorias_roteador || [];
      const complexity = req.body.grau_complexidade || 'medio';

      // Unpack n8n array if necessary
      let parsedResponse = n8nResponseData;
      if (Array.isArray(n8nResponseData) && n8nResponseData.length > 0) {
        parsedResponse = n8nResponseData[0];
      }
      
      const recomendacoes = parsedResponse?.recomendacoes;

      if (recomendacoes || (parsedResponse && (parsedResponse.ai_recommendation || parsedResponse.analysis))) {
        const obstacles = recomendacoes ? (recomendacoes.observacoes_instalacao || []) : (parsedResponse.obstacles || []);
        const n8nAnalysis = recomendacoes ? (recomendacoes.resumo_tecnico || '') : (parsedResponse.ai_recommendation || parsedResponse.analysis);
        const alerts = recomendacoes ? (recomendacoes.alertas || []) : [];
        const tempoEstimado = recomendacoes ? (recomendacoes.estimativa_tempo_instalacao_horas || 1) : 1;

        // 1. Lógica de Cabos e Acessórios
        const n8nCable = recomendacoes ? Number(recomendacoes.metragem_cabo_calculada) : 0;
        const UTPCableLength = Math.ceil(distanceMeters * 1.2 + 5); // 20% folga + 5m
        const recommendedCable = n8nCable > 0 ? n8nCable : Math.max(10, UTPCableLength); // Mínimo 10m
        
        const conectorItem = recomendacoes?.itens_recomendados?.find(item => item.categoria === 'Conector' || item.item === 'RJ45');
        const recommendedConnectors = conectorItem ? Number(conectorItem.quantidade) : 4;
        const recommendedClips = Math.ceil(recommendedCable * 3); // 3 clips por metro

        cabosFerramentas = {
          cabo_utp_metros: recommendedCable,
          tipo_cabo: recomendacoes ? (recomendacoes.tipo_cabo_escolhido || 'Cat5e') : 'Cat5e',
          conectores_rj45: recommendedConnectors,
          fixadores_cabo_unidades: recommendedClips,
          ferramentas: [
            'Alicate Crimpador RJ45',
            'Decapador de Cabo UTP',
            'Testador de Cabo RJ45',
            'Fita Isolante',
            'Passa Fio (Guia de Cabo)'
          ],
          itens_adicionais: ['Fita dupla face 3M']
        };

        // Adiciona ferramentas específicas de acordo com obstáculos
        const lowercaseObstacles = obstacles.map(o => o.toLowerCase());
        if (lowercaseObstacles.some(o => o.includes('concreto') || o.includes('parede') || o.includes('tijolo'))) {
          cabosFerramentas.ferramentas.push('Furadeira de Impacto', 'Broca de Concreto 6mm', 'Broca de Concreto 8mm');
          cabosFerramentas.itens_adicionais.push('Bucha Plástica 6mm', 'Parafusos Philips 6mm');
        }
        if (lowercaseObstacles.some(o => o.includes('madeira') || o.includes('divisor'))) {
          cabosFerramentas.ferramentas.push('Broca de Madeira 6mm');
          cabosFerramentas.itens_adicionais.push('Parafusos autoatarraxantes para madeira');
        }

        // 2. Seleção de Roteadores Recomendados (Consulta no Banco com a nova coluna categoria)
        const [allRouters] = await connection.execute(
          'SELECT id, modelo, marca, padrao_wifi, velocidade_maxima, portas_ethernet, antenas, principais_recursos, categoria FROM roteadores'
        );
        
        let matchedRouterIds = [];
        
        // Se a IA do n8n sugeriu um roteador específico nas recomendações
        const n8nRouterItem = recomendacoes?.itens_recomendados?.find(item => item.categoria === 'Roteador');
        const suggestedModel = n8nRouterItem?.modelo_sugerido || n8nRouterItem?.item || '';
        
        if (suggestedModel) {
          const matched = allRouters.find(r => 
            suggestedModel.toLowerCase().includes(r.modelo.toLowerCase()) ||
            r.modelo.toLowerCase().includes(suggestedModel.toLowerCase())
          );
          if (matched) {
            matchedRouterIds.push(matched.id);
            console.log(`[Recomendacao] Roteador casado via sugestão do n8n: ${matched.marca} ${matched.modelo} (ID: ${matched.id})`);
          }
        }

        // Se não casou via modelo explícito, aplica algoritmo padrão baseando-se em categoria/complexidade
        if (matchedRouterIds.length === 0) {
          let filteredRouters = allRouters;
          if (selectedCats.length > 0) {
            filteredRouters = allRouters.filter(r => selectedCats.includes(r.categoria));
          }

          if (complexity === 'alto' || distanceMeters >= 15 || lowercaseObstacles.some(o => o.includes('concreto') || o.includes('laje'))) {
            const premiumRouters = filteredRouters.filter(r => r.categoria === 'mesh' || r.categoria === 'high_tech' || r.categoria === 'corporativo');
            if (premiumRouters.length > 0) {
              matchedRouterIds = premiumRouters.map(r => r.id);
            }
          } else if (complexity === 'baixo' && distanceMeters < 12 && !lowercaseObstacles.some(o => o.includes('concreto'))) {
            const basicRouters = filteredRouters.filter(r => r.categoria === 'barato' || r.categoria === 'custo_beneficio');
            if (basicRouters.length > 0) {
              matchedRouterIds = basicRouters.map(r => r.id);
            }
          }

          if (matchedRouterIds.length === 0) {
            matchedRouterIds = filteredRouters.map(r => r.id);
          }
          if (matchedRouterIds.length === 0) {
            matchedRouterIds = allRouters.map(r => r.id);
          }
        }

        recommendedRouterIds = matchedRouterIds;
        n8nResponseValue = {
          obstacles,
          analysis: n8nAnalysis,
          alertas: alerts,
          tempo_estimado: tempoEstimado,
          grau_complexidade_avaliado: recomendacoes ? (recomendacoes.grau_complexidade_avaliado || null) : null
        };
      } else {
        console.log('[Recomendacao] n8n indisponível durante o envio. Gravando recomendação em branco.');
        n8nResponseValue = {
          error: 'n8n_indisponivel',
          analysis: 'Erro: Processamento do n8n indisponível no momento. O sistema tentará gerar as recomendações automaticamente assim que a conexão com o n8n for restabelecida e este laudo for aberto.'
        };
      }

      // Limpa recomendação antiga se existir (para casos de reenvio)
      await connection.execute(`DELETE FROM recomendacoes WHERE avaliacao_id = ?`, [avaliacaoId]);

      // Salva a recomendação com os campos de complexidade e categorias selecionadas (null se falhar)
      await connection.execute(`
        INSERT INTO recomendacoes (avaliacao_id, cabos_ferramentas, roteadores_recomendados, n8n_response, grau_complexidade, categorias_roteador)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          avaliacaoId, 
          cabosFerramentas ? JSON.stringify(cabosFerramentas) : null, 
          recommendedRouterIds ? JSON.stringify(recommendedRouterIds) : null, 
          JSON.stringify(n8nResponseValue),
          complexity,
          JSON.stringify(selectedCats)
        ]
      );
      console.log(`[Recomendacao] Registro de recomendação inserido para a avaliação ID ${avaliacaoId}!`);

      await connection.commit();
      res.status(201).json({ message: 'Avaliação salva com sucesso no AWS RDS!', avaliacaoId });
    } catch (err) {
      await connection.rollback();
      console.error('Erro ao salvar avaliação:', err);
      res.status(500).json({ error: 'Erro ao salvar dados', details: err.message });
    } finally {
      connection.release();
    }
  });

  // --- NOVAS ROTAS (ADMIN E PROTOCOLOS) ---
  
  // Endpoint de Login do Admin (Validando no Banco)
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { usuario, senha } = req.body;
      const senhaHash = crypto.createHash('sha256').update(senha).digest('hex');
      
      const [rows] = await pool.query(
        `SELECT id, usuario FROM admins WHERE usuario = ? AND senha_hash = ?`,
        [usuario, senhaHash]
      );
      
      if (rows.length > 0) {
        res.json({ token: 'token-valido-123', usuario: rows[0].usuario, message: 'Login realizado com sucesso' });
      } else {
        res.status(401).json({ error: 'Usuário ou senha inválidos' });
      }
    } catch (err) {
      console.error('Erro no login:', err);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  });

  // Endpoint para o Admin gerar um novo Protocolo
  app.post('/api/protocolos', async (req, res) => {
    try {
      const { cliente_nome, endereco, telefone } = req.body;
      
      // Gera um código de 6 caracteres únicos (ex: 8F3A2B)
      const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      await pool.execute(
        `INSERT INTO protocolos (codigo, cliente_nome, endereco, telefone) VALUES (?, ?, ?, ?)`,
        [codigo, cliente_nome, endereco, telefone || null]
      );
      
      res.status(201).json({ codigo, message: 'Protocolo gerado com sucesso!' });
    } catch (err) {
      console.error('Erro ao gerar protocolo:', err);
      res.status(500).json({ error: 'Erro ao gerar o protocolo no banco.' });
    }
  });

  // Endpoint para o App Principal validar o Protocolo digitado (agora aceita EM_ANALISE e APROVADO para telas de espera/interação)
  app.get('/api/protocolos/:codigo', async (req, res) => {
    try {
      const { codigo } = req.params;
      const [rows] = await pool.query(
        `SELECT * FROM protocolos WHERE codigo = ? AND status != 'FINALIZADO'`, 
        [codigo]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Protocolo inválido, inexistente ou já finalizado.' });
      }
      
      res.json(rows[0]);
    } catch (err) {
      console.error('Erro ao validar protocolo:', err);
      res.status(500).json({ error: 'Erro interno ao validar protocolo.' });
    }
  });

  // Endpoint para o Admin solicitar o reenvio de um laudo
  app.post('/api/avaliacoes/:id/reenviar', async (req, res) => {
    try {
      const avaliacaoId = req.params.id;
      const { observacoes, protocolo } = req.body;

      // 1. Marca a avaliação atual como REJEITADA
      await pool.execute(`UPDATE avaliacoes SET status = 'REJEITADA' WHERE id = ?`, [avaliacaoId]);
      
      // 2. Muda o status do protocolo para REENVIAR e adiciona a mensagem do admin
      if (protocolo) {
        await pool.execute(
          `UPDATE protocolos SET status = 'REENVIAR', observacoes_admin = ? WHERE codigo = ?`,
          [observacoes, protocolo]
        );
      }

      res.json({ message: 'Solicitação de reenvio efetuada com sucesso. O técnico será notificado.' });
    } catch (err) {
      console.error('Erro ao solicitar reenvio:', err);
      res.status(500).json({ error: 'Erro interno ao processar reenvio.' });
    }
  });

  // Endpoint para o Admin aprovar um laudo
  app.post('/api/avaliacoes/:id/aprovar', async (req, res) => {
    try {
      const avaliacaoId = req.params.id;
      const { protocolo } = req.body;

      await pool.execute(`UPDATE avaliacoes SET status = 'APROVADA' WHERE id = ?`, [avaliacaoId]);
      if (protocolo) {
        await pool.execute(`UPDATE protocolos SET status = 'APROVADO', observacoes_admin = 'Aprovado' WHERE codigo = ?`, [protocolo]);
      }
      res.json({ message: 'Laudo aprovado com sucesso!' });
    } catch (err) {
      console.error('Erro ao aprovar laudo:', err);
      res.status(500).json({ error: 'Erro interno ao aprovar.' });
    }
  });

  // Endpoint para o Admin buscar as recomendações de um laudo
  app.get('/api/avaliacoes/:id/recomendacoes', async (req, res) => {
    try {
      const { id } = req.params;
      const [recs] = await pool.query(
        `SELECT * FROM recomendacoes WHERE avaliacao_id = ?`, 
        [id]
      );
      
      if (recs.length === 0) {
        return res.json({ recomendada: false, message: 'Nenhuma recomendação disponível para esta avaliação.' });
      }

      let rec = recs[0];
      let cabosFerramentas = rec.cabos_ferramentas ? JSON.parse(rec.cabos_ferramentas) : null;
      let recommendedRouterIds = rec.roteadores_recomendados ? JSON.parse(rec.roteadores_recomendados) : null;
      let n8nResponse = JSON.parse(rec.n8n_response);
      const selectedRouterIds = rec.roteadores_selecionados ? JSON.parse(rec.roteadores_selecionados) : [];

      // SE AS RECOMENDAÇÕES ESTIVEREM EM BRANCO (FALHA DO N8N NO SUBMIT), TENTA REPROCESSAR SE O N8N VOLTOU ONLINE
      if (!cabosFerramentas || !recommendedRouterIds || (n8nResponse && n8nResponse.error === 'n8n_indisponivel')) {
        console.log(`[Reprocessamento] Tentando gerar recomendações pendentes para laudo ID ${id}...`);
        
        // 1. Busca os dados brutos da avaliação e cliente
        const [avs] = await pool.query(`
          SELECT a.*, c.nome, c.telefone, c.endereco 
          FROM avaliacoes a
          JOIN clientes c ON a.cliente_id = c.id
          WHERE a.id = ?
        `, [id]);

        if (avs.length > 0) {
          const av = avs[0];
          
          // 2. Busca as evidências para extrair a distância e a foto geral
          const [evs] = await pool.query(`SELECT * FROM evidencias WHERE avaliacao_id = ?`, [id]);
          
          let distanceMeters = 0;
          let base64Photo = null;
          
          const medicaoEv = evs.find(e => e.tipo_tarefa === 'medicaoAR');
          if (medicaoEv && medicaoEv.dados_ar) {
            const arData = typeof medicaoEv.dados_ar === 'string' ? JSON.parse(medicaoEv.dados_ar) : medicaoEv.dados_ar;
            distanceMeters = arData.distanceMeters || 0;
          }

          const fotoEv = evs.find(e => e.tipo_tarefa === 'fotoGeral');
          if (fotoEv && fotoEv.media_url) {
            try {
              const filename = path.basename(fotoEv.media_url);
              const filePath = path.join(uploadDir, filename);
              if (fs.existsSync(filePath)) {
                console.log(`[Reprocessamento] Convertendo foto local para base64: ${filePath}`);
                const fileBuffer = fs.readFileSync(filePath);
                base64Photo = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
              }
            } catch (err) {
              console.error('[Reprocessamento] Falha ao ler foto para base64:', err);
            }
          }

          // 3. Monta payload e tenta chamar o webhook do n8n novamente
          const n8nPayload = {
            protocolo: av.protocolo,
            cliente: av.nome,
            medicao_distancia_metros: distanceMeters,
            foto_base64: base64Photo,
            grau_complexidade: rec.grau_complexidade,
            categorias_roteador: rec.categorias_roteador ? JSON.parse(rec.categorias_roteador) : [],
            data_envio: new Date().toISOString()
          };

          const N8N_WEBHOOK_URL = 'https://misael2049.app.n8n.cloud/webhook/0630da63-2af8-498f-82a7-29eb6fe0b5c5';
          let n8nResponseData = null;

          try {
            console.log(`[Reprocessamento] Disparando webhook ao n8n: ${N8N_WEBHOOK_URL}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout
            
            const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(n8nPayload),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (n8nResponse.ok) {
              n8nResponseData = await n8nResponse.json();
              console.log('[Reprocessamento] Retorno do n8n obtido com sucesso!');
            }
          } catch (n8nErr) {
            console.error('[Reprocessamento] Erro ou timeout na chamada ao n8n:', n8nErr.message);
          }

          // 4. Se a conexão voltou e o n8n respondeu, calcula e atualiza as recomendações no banco!
          let parsedResponse = n8nResponseData;
          if (Array.isArray(n8nResponseData) && n8nResponseData.length > 0) {
            parsedResponse = n8nResponseData[0];
          }
          
          const recomendacoes = parsedResponse?.recomendacoes;

          if (recomendacoes || (parsedResponse && (parsedResponse.ai_recommendation || parsedResponse.analysis))) {
            const obstacles = recomendacoes ? (recomendacoes.observacoes_instalacao || []) : (parsedResponse.obstacles || []);
            const n8nAnalysis = recomendacoes ? (recomendacoes.resumo_tecnico || '') : (parsedResponse.ai_recommendation || parsedResponse.analysis);
            const alerts = recomendacoes ? (recomendacoes.alertas || []) : [];
            const tempoEstimado = recomendacoes ? (recomendacoes.estimativa_tempo_instalacao_horas || 1) : 1;

            // Lógica de cabos e ferramentas
            const n8nCable = recomendacoes ? Number(recomendacoes.metragem_cabo_calculada) : 0;
            const UTPCableLength = Math.ceil(distanceMeters * 1.2 + 5);
            const recommendedCable = n8nCable > 0 ? n8nCable : Math.max(10, UTPCableLength);
            
            const conectorItem = recomendacoes?.itens_recomendados?.find(item => item.categoria === 'Conector' || item.item === 'RJ45');
            const recommendedConnectors = conectorItem ? Number(conectorItem.quantidade) : 4;
            const recommendedClips = Math.ceil(recommendedCable * 3);

            cabosFerramentas = {
              cabo_utp_metros: recommendedCable,
              tipo_cabo: recomendacoes ? (recomendacoes.tipo_cabo_escolhido || 'Cat5e') : 'Cat5e',
              conectores_rj45: recommendedConnectors,
              fixadores_cabo_unidades: recommendedClips,
              ferramentas: [
                'Alicate Crimpador RJ45',
                'Decapador de Cabo UTP',
                'Testador de Cabo RJ45',
                'Fita Isolante',
                'Passa Fio (Guia de Cabo)'
              ],
              itens_adicionais: ['Fita dupla face 3M']
            };

            const lowercaseObstacles = obstacles.map(o => o.toLowerCase());
            if (lowercaseObstacles.some(o => o.includes('concreto') || o.includes('parede') || o.includes('tijolo'))) {
              cabosFerramentas.ferramentas.push('Furadeira de Impacto', 'Broca de Concreto 6mm', 'Broca de Concreto 8mm');
              cabosFerramentas.itens_adicionais.push('Bucha Plástica 6mm', 'Parafusos Philips 6mm');
            }
            if (lowercaseObstacles.some(o => o.includes('madeira') || o.includes('divisor'))) {
              cabosFerramentas.ferramentas.push('Broca de Madeira 6mm');
              cabosFerramentas.itens_adicionais.push('Parafusos autoatarraxantes para madeira');
            }

            // Seleção de roteadores
            const [allRouters] = await pool.query(
              'SELECT id, modelo, marca, padrao_wifi, categoria FROM roteadores'
            );
            const selectedCats = rec.categorias_roteador ? JSON.parse(rec.categorias_roteador) : [];
            let matchedRouterIds = [];
            
            // Casamento com modelo explícito do n8n
            const n8nRouterItem = recomendacoes?.itens_recomendados?.find(item => item.categoria === 'Roteador');
            const suggestedModel = n8nRouterItem?.modelo_sugerido || n8nRouterItem?.item || '';
            
            if (suggestedModel) {
              const matched = allRouters.find(r => 
                suggestedModel.toLowerCase().includes(r.modelo.toLowerCase()) ||
                r.modelo.toLowerCase().includes(suggestedModel.toLowerCase())
              );
              if (matched) {
                matchedRouterIds.push(matched.id);
                console.log(`[Reprocessamento] Roteador casado via sugestão do n8n: ${matched.marca} ${matched.modelo} (ID: ${matched.id})`);
              }
            }

            // Algoritmo padrão se não casou via modelo explícito
            if (matchedRouterIds.length === 0) {
              let filteredRouters = allRouters;
              if (selectedCats.length > 0) {
                filteredRouters = allRouters.filter(r => selectedCats.includes(r.categoria));
              }

              if (rec.grau_complexidade === 'alto' || distanceMeters >= 15 || lowercaseObstacles.some(o => o.includes('concreto') || o.includes('laje'))) {
                const premiumRouters = filteredRouters.filter(r => r.categoria === 'mesh' || r.categoria === 'high_tech' || r.categoria === 'corporativo');
                if (premiumRouters.length > 0) matchedRouterIds = premiumRouters.map(r => r.id);
              } else if (rec.grau_complexidade === 'baixo' && distanceMeters < 12 && !lowercaseObstacles.some(o => o.includes('concreto'))) {
                const basicRouters = filteredRouters.filter(r => r.categoria === 'barato' || r.categoria === 'custo_beneficio');
                if (basicRouters.length > 0) matchedRouterIds = basicRouters.map(r => r.id);
              }

              if (matchedRouterIds.length === 0) matchedRouterIds = filteredRouters.map(r => r.id);
              if (matchedRouterIds.length === 0) matchedRouterIds = allRouters.map(r => r.id);
            }

            recommendedRouterIds = matchedRouterIds;
            n8nResponse = {
              obstacles,
              analysis: n8nAnalysis,
              alertas: alerts,
              tempo_estimado: tempoEstimado,
              grau_complexidade_avaliado: recomendacoes ? (recomendacoes.grau_complexidade_avaliado || null) : null
            };

            // Salva as recomendações geradas no banco de dados (UPDATE)
            await pool.execute(`
              UPDATE recomendacoes 
              SET cabos_ferramentas = ?, roteadores_recomendados = ?, n8n_response = ?
              WHERE id = ?
            `, [
              JSON.stringify(cabosFerramentas),
              JSON.stringify(recommendedRouterIds),
              JSON.stringify(n8nResponse),
              rec.id
            ]);
            console.log(`[Reprocessamento] Recomendações atualizadas com sucesso no banco de dados!`);
          }
        }
      }

      // Busca todos os roteadores para que a lista completa seja exibida com as indicações
      const [routers] = await pool.query(`SELECT * FROM roteadores`);
      
      const formattedRouters = routers.map(r => ({
        id: r.id,
        modelo: r.modelo,
        marca: r.marca,
        padrao_wifi: r.padrao_wifi,
        velocidade_maxima: r.velocidade_maxima,
        portas_ethernet: r.portas_ethernet,
        antenas: r.antenas,
        principais_recursos: r.principais_recursos,
        categoria: r.categoria,
        recomendado: recommendedRouterIds ? recommendedRouterIds.includes(r.id) : false,
        selecionado: selectedRouterIds.includes(r.id)
      }));

       res.json({
        recomendada: true,
        cabosFerramentas,
        n8nResponse,
        roteadores: formattedRouters,
        grauComplexidade: rec.grau_complexidade || 'medio',
        categoriasRoteador: rec.categorias_roteador ? JSON.parse(rec.categorias_roteador) : []
      });
    } catch (err) {
      console.error('Erro ao buscar recomendações:', err);
      res.status(500).json({ error: 'Erro interno ao buscar recomendações.' });
    }
  });

  // Endpoint para o Admin salvar os roteadores selecionados
  app.post('/api/avaliacoes/:id/recomendacoes/selecionar', async (req, res) => {
    try {
      const { id } = req.params;
      const { selecionados } = req.body; // array de IDs de roteadores selecionados

      await pool.execute(
        `UPDATE recomendacoes SET roteadores_selecionados = ? WHERE avaliacao_id = ?`,
        [JSON.stringify(selecionados || []), id]
      );

      res.json({ message: 'Seleção de roteadores salva com sucesso!' });
    } catch (err) {
      console.error('Erro ao salvar seleção de roteadores:', err);
      res.status(500).json({ error: 'Erro interno ao salvar seleção.' });
    }
  });

  // Endpoint para listar todos os protocolos (App Admin)
  app.get('/api/protocolos', async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM protocolos ORDER BY criado_em DESC`);
      res.json(rows);
    } catch (err) {
      console.error('Erro ao listar protocolos:', err);
      res.status(500).json({ error: 'Erro interno ao listar protocolos.' });
    }
  });

  // Endpoint para o Admin finalizar completamente a instalação (Provisionamento)
  app.post('/api/protocolos/:codigo/finalizar', async (req, res) => {
    try {
      const { codigo } = req.params;
      await pool.execute(`UPDATE protocolos SET status = 'FINALIZADO' WHERE codigo = ?`, [codigo]);
      res.json({ message: 'Instalação finalizada com sucesso!' });
    } catch (err) {
      console.error('Erro ao finalizar protocolo:', err);
      res.status(500).json({ error: 'Erro ao finalizar.' });
    }
  });

  // --- FIM NOVAS ROTAS ---

  // Endpoint para buscar todas as avaliações (App Admin)
  app.get('/api/avaliacoes', async (req, res) => {
    try {
      const [avaliacoes] = await pool.query(`
        SELECT a.id, a.protocolo, a.total_score, a.status, a.criado_em, 
              c.nome as cliente_nome, c.telefone as cliente_telefone, c.endereco as cliente_endereco
        FROM avaliacoes a
        JOIN clientes c ON a.cliente_id = c.id
        ORDER BY a.criado_em DESC
      `);

      // Busca as evidências para cada avaliação
      const [evidencias] = await pool.query(`SELECT * FROM evidencias`);

      const result = avaliacoes.map(av => {
        const avEvidencias = evidencias.filter(e => e.avaliacao_id === av.id);
        
        // Reconstrói o formato "tasks" para manter compatibilidade com o Admin App
        const tasks = {};
        avEvidencias.forEach(e => {
          tasks[e.tipo_tarefa] = {
            completed: e.completada === 1,
            mediaUri: e.media_url,
            arData: e.dados_ar ? (typeof e.dados_ar === 'string' ? JSON.parse(e.dados_ar) : e.dados_ar) : null,
            points: e.pontos_obtidos
          };
        });

        return {
          id: av.id,
          totalScore: av.total_score,
          status: av.status,
          customer: {
            protocolo: av.protocolo,
            nome: av.cliente_nome,
            telefone: av.cliente_telefone,
            endereco: av.cliente_endereco
          },
          tasks: tasks
        };
      });

      res.json(result);
    } catch (err) {
      console.error('Erro ao buscar avaliações:', err);
      res.status(500).json({ error: 'Erro ao buscar dados', detalhe: err.message, stack: err.stack });
    }
  });

  // Configuração para AWS Cloud9 (Usa as portas e IPs definidos pelo ambiente)
  const PORT = process.env.PORT || 8080;
  const HOST = process.env.IP || '0.0.0.0';

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor rodando no AWS Cloud9 em http://${HOST}:${PORT}`);
    console.log('🔗 Conectando ao Banco AWS RDS...');
  });
