const express = require('express');
const mysql = require('mysql');
const path = require('path');
const session = require('express-session');

const app = express();
const port = 3000;

app.use(session({
  secret: 'umSegredoMuitoSecreto',
  resave: false,
  saveUninitialized: false
}));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Gabuy741!!',
  database: 'quiz_app'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Conectado ao MySQL!');
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Middleware de autenticação
function checkAuthApi(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  next();
}

function checkAuthWeb(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  next();
}

function checkAdmin(req, res, next) {
  if (req.session.userRole !== 'admin') {
    return res.status(403).send('Acesso negado: Admins apenas.');
  }
  next();
}

// ROTA DE CONTATO COM DESENVOLVEDORES
app.post('/contato', (req, res) => {
  const { nome, email, mensagem } = req.body;

  if (!nome || !email || !mensagem) {
    return res.status(400).send('Todos os campos são obrigatórios.');
  }

  console.log('📩 Mensagem recebida de contato:');
  console.log(`Nome: ${nome}`);
  console.log(`Email: ${email}`);
  console.log(`Mensagem: ${mensagem}`);

  res.send('Mensagem recebida com sucesso!');
});

// Categorias
app.get('/categories', (req, res) => {
  const sql = 'SELECT id, name FROM categories ORDER BY name ASC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erro ao buscar categorias:', err);
      return res.status(500).send('Erro ao buscar categorias');
    }
    res.json(results);
  });
});

// Questões
app.get('/questions', checkAuthApi, (req, res) => {
  const categoryId = req.query.category_id;
  if (!categoryId) return res.status(400).send('Categoria obrigatória');

  const sqlQuestions = `SELECT id, text FROM questions WHERE category_id = ? ORDER BY id ASC`;

  db.query(sqlQuestions, [categoryId], (err, questions) => {
    if (err) {
      console.error('Erro ao buscar perguntas:', err);
      return res.status(500).send('Erro ao buscar perguntas');
    }

    if (questions.length === 0) {
      return res.json([]);
    }

    const questionIds = questions.map(q => q.id);

    const sqlAnswers = `SELECT question_id, text, is_correct FROM question_answer WHERE question_id IN (?)`;

    db.query(sqlAnswers, [questionIds], (err2, answers) => {
      if (err2) {
        console.error('Erro ao buscar respostas:', err2);
        return res.status(500).send('Erro ao buscar respostas');
      }

      const answersMap = {};
      answers.forEach(ans => {
        if (!answersMap[ans.question_id]) answersMap[ans.question_id] = [];
        answersMap[ans.question_id].push({ text: ans.text, is_correct: !!ans.is_correct });
      });

      const result = questions.map(q => ({
        id: q.id,
        text: q.text,
        answers: answersMap[q.id] || []
      }));

      res.json(result);
    });
  });
});

app.get('/questions/:id/answers', checkAuthApi, (req, res) => {
  const questionId = req.params.id;
  const sql = 'SELECT id, text, is_correct FROM question_answer WHERE question_id = ?';
  db.query(sql, [questionId], (err, results) => {
    if (err) {
      console.error('Erro ao buscar respostas:', err);
      return res.status(500).send('Erro ao buscar respostas');
    }
    res.json(results);
  });
});

// Rotas principais
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/index.html', checkAuthWeb, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/leaderboard.html', checkAuthWeb, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

app.get('/admin.html', checkAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Login
app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const sql = 'SELECT id, role FROM users WHERE email = ? AND senha = ?';
  db.query(sql, [email, senha], (err, results) => {
    if (err) return res.status(500).send('Erro no servidor.');
    if (results.length === 0) return res.status(400).send('Credenciais inválidas.');

    req.session.userId = results[0].id;
    req.session.userRole = results[0].role;
    req.session.userEmail = email;

    if (results[0].role === 'admin') return res.send('admin');
    res.send('OK');
  });
});

// Registro
app.post('/register', (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).send('Preencha todos os campos.');

  const sql = 'INSERT INTO users (nome, email, senha, role) VALUES (?, ?, ?, ?)';
  db.query(sql, [nome, email, senha, 'user'], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).send('Email já cadastrado.');
      return res.status(500).send('Erro ao cadastrar: ' + err.message);
    }
    res.send('Usuário cadastrado com sucesso!');
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Erro ao destruir sessão:', err);
      return res.redirect('/index.html');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// Modos de jogo
app.get('/game-modes', (req, res) => {
  const sql = 'SELECT id, name, description FROM game_modes ORDER BY id ASC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erro ao buscar modos de jogo:', err);
      return res.status(500).send('Erro ao buscar modos de jogo');
    }
    res.json(results);
  });
});

// Score
app.post('/score', checkAuthApi, (req, res) => {
  const userId = req.session.userId;
  const { score } = req.body;
  const sql = 'INSERT INTO scores (user_id, score) VALUES (?, ?)';
  db.query(sql, [userId, score], err => {
    if (err) {
      console.error('Erro ao salvar score:', err);
      return res.status(500).send('Erro ao salvar score.');
    }
    res.send('Score salvo');
  });
});

// Leaderboard
app.get('/leaderboard', checkAuthApi, (req, res) => {
  const userId = req.session.userId;
  const { period = 'all', scope = 'global' } = req.query;

  let dateCond = '1=1';
  if (period === 'day') {
    dateCond = 's.created_at >= CURDATE()';
  } else if (period === 'week') {
    dateCond = 's.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
  }

  let friendJoin = '';
  let params = [];
  if (scope === 'friends') {
    friendJoin = `JOIN friends f ON f.friend_id = s.user_id AND f.user_id = ?`;
    params.push(userId);
  }

  const sql = `
    SELECT u.nome, SUM(s.score) AS total_score
    FROM scores s
    JOIN users u ON u.id = s.user_id
    ${friendJoin}
    WHERE ${dateCond}
    GROUP BY s.user_id
    ORDER BY total_score DESC
    LIMIT 50
  `;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro no leaderboard:', err);
      return res.status(500).send('Erro no leaderboard.');
    }
    res.json(rows);
  });
});

// Rotas de amigos
app.post('/friends', checkAuthApi, (req, res) => {
  const userId = req.session.userId;
  const friendEmail = req.body.friendEmail;

  if (!friendEmail) return res.status(400).send('Email do amigo é obrigatório.');

  if (req.session.userEmail === friendEmail) {
    return res.status(400).send('Você não pode se adicionar como amigo.');
  }

  const sqlFindUser = 'SELECT id FROM users WHERE email = ?';
  db.query(sqlFindUser, [friendEmail], (err, results) => {
    if (err) return res.status(500).send('Erro ao buscar usuário.');
    if (results.length === 0) return res.status(404).send('Usuário não encontrado.');

    const friendId = results[0].id;
    if (friendId === userId) {
      return res.status(400).send('Você não pode se adicionar como amigo.');
    }

    const sqlInsertFriend = 'INSERT IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)';
    db.query(sqlInsertFriend, [userId, friendId], err2 => {
      if (err2) return res.status(500).send('Erro ao adicionar amigo.');
      res.send('Amigo adicionado com sucesso.');
    });
  });
});

app.get('/friends', checkAuthApi, (req, res) => {
  const userId = req.session.userId;
  const sql = `
    SELECT u.id, u.nome, u.email
    FROM friends f
    JOIN users u ON f.friend_id = u.id
    WHERE f.user_id = ?
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).send('Erro ao buscar amigos.');
    res.json(results);
  });
});

app.delete('/friends/:friendId', checkAuthApi, (req, res) => {
  const userId = req.session.userId;
  const friendId = parseInt(req.params.friendId);

  const sql = 'DELETE FROM friends WHERE user_id = ? AND friend_id = ?';
  db.query(sql, [userId, friendId], (err, result) => {
    if (err) return res.status(500).send('Erro ao remover amigo.');
    if (result.affectedRows === 0) return res.status(404).send('Amigo não encontrado.');
    res.send('Amigo removido com sucesso.');
  });
});

// Rotas administrativas (admin.html)
app.get('/admin/categories', checkAdmin, (req, res) => {
  const sql = 'SELECT * FROM categories ORDER BY id DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('Erro ao buscar categorias');
    res.json(results);
  });
});

app.post('/admin/categories', checkAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).send('Nome obrigatório');
  const sql = 'INSERT INTO categories (name, description) VALUES (?, ?)';
  db.query(sql, [name, description || null], err => {
    if (err) return res.status(500).send('Erro ao inserir categoria');
    res.sendStatus(201);
  });
});

app.get('/admin/questions', checkAdmin, (req, res) => {
  const sql = `SELECT q.id, q.text, c.name AS category_name FROM questions q JOIN categories c ON q.category_id = c.id ORDER BY q.id DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('Erro ao buscar perguntas');
    res.json(results);
  });
});

app.post('/admin/questions', checkAdmin, (req, res) => {
  const { category_id, text, answers } = req.body;
  if (!category_id || !text || !answers || !answers.length) return res.status(400).send('Dados inválidos');

  const sqlInsertQuestion = 'INSERT INTO questions (text, category_id) VALUES (?, ?)';
  db.query(sqlInsertQuestion, [text, category_id], (err, result) => {
    if (err) return res.status(500).send('Erro ao inserir pergunta');

    const questionId = result.insertId;
    const sqlInsertAnswer = 'INSERT INTO question_answer (question_id, text, is_correct) VALUES ?';
    const values = answers.map(a => [questionId, a.text, a.is_correct]);
    db.query(sqlInsertAnswer, [values], err2 => {
      if (err2) return res.status(500).send('Erro ao inserir respostas');
      res.sendStatus(201);
    });
  });
});

app.get('/admin/users', checkAdmin, (req, res) => {
  const sql = 'SELECT id, nome, email, role FROM users ORDER BY id DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('Erro ao buscar usuários');
    res.json(results);
  });
});

app.put('/admin/users/:id/role', checkAdmin, (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).send('Role inválida');
  const sql = 'UPDATE users SET role = ? WHERE id = ?';
  db.query(sql, [role, id], err => {
    if (err) return res.status(500).send('Erro ao atualizar role');
    res.sendStatus(200);
  });
});

// Sessões de quiz
app.post('/quiz_sessions/start', checkAuthApi, (req, res) => {
  const userId = req.session.userId;
  const { game_mode_name } = req.body;

  if (!game_mode_name) return res.status(400).send('Modo de jogo obrigatório.');

  const sqlFindGameMode = 'SELECT id FROM game_modes WHERE name = ? LIMIT 1';
  db.query(sqlFindGameMode, [game_mode_name], (err, results) => {
    if (err) return res.status(500).send('Erro ao buscar modo de jogo.');
    if (results.length === 0) return res.status(404).send('Modo de jogo não encontrado.');

    const gameModeId = results[0].id;
    const sqlInsertSession = 'INSERT INTO quiz_sessions (user_id, game_mode_id) VALUES (?, ?)';
    db.query(sqlInsertSession, [userId, gameModeId], (err2, result) => {
      if (err2) return res.status(500).send('Erro ao iniciar sessão do quiz.');
      res.json({ session_id: result.insertId });
    });
  });
});

app.post('/quiz_sessions/:sessionId/end', checkAuthApi, (req, res) => {
  const userId = req.session.userId;
  const sessionId = parseInt(req.params.sessionId);

  const sqlUpdateEndTime = 'UPDATE quiz_sessions SET end_time = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?';
  db.query(sqlUpdateEndTime, [sessionId, userId], (err, result) => {
    if (err) return res.status(500).send('Erro ao finalizar sessão do quiz.');
    if (result.affectedRows === 0) return res.status(404).send('Sessão não encontrada ou não pertence ao usuário.');

    res.send('Sessão finalizada com sucesso.');
  });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});
