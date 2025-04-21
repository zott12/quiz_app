const express = require('express');
const mysql = require('mysql');
const path = require('path');

const app = express();
const port = 3000;

const session = require('express-session');
app.use(session({
  secret: 'umSegredoMuitoSecreto',
  resave: false,
  saveUninitialized: false
}));

// Conectar ao banco
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Gabuy741!!',
  database: 'quiz_app'
});

db.connect((err) => {
  if (err) throw err;
  console.log('✅ Conectado ao MySQL!');
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Rota de login
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    const sql = 'SELECT id FROM users WHERE email = ? AND senha = ?';
    db.query(sql, [email, senha], (err, results) => {
      if (err) return res.status(500).send('Erro no servidor.');
      if (results.length === 0) return res.status(400).send('Credenciais inválidas.');
      req.session.userId = results[0].id;
      res.send('OK');
    });
  });
  
// Rota de cadastro
app.post('/register', (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).send('Preencha todos os campos.');
  }

  const sql = 'INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)';
  db.query(sql, [nome, email, senha], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).send('Email já cadastrado.');
      }
      return res.status(500).send('Erro ao cadastrar: ' + err.message);
    }
    res.send('Usuário cadastrado com sucesso!');
  });
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});

// Salvar pontuação do usuário logado
app.post('/score', (req, res) => {
    const userId = req.session.userId;
    const { score } = req.body;
    if (!userId) return res.status(401).send('Não autenticado.');
    const sql = 'INSERT INTO scores (user_id, score) VALUES (?, ?)';
    db.query(sql, [userId, score], err => {
      if (err) return res.status(500).send('Erro ao salvar score.');
      res.send('Score salvo');
    });
  });

  app.get('/leaderboard', (req, res) => {
    const userId = req.session.userId;
    const { period = 'all', scope = 'global' } = req.query;
  
    // define filtro de data
    let dateCond = '1=1';
    if (period === 'day')  dateCond = 'created_at >= CURDATE()';
    if (period === 'week') dateCond = 'created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
  
    // escopo global
    let friendJoin = '';
    let whereScope = dateCond;
    if (scope === 'friends') {
      friendJoin = `JOIN friends f ON f.friend_id = s.user_id AND f.user_id = ?`;
      whereScope = `${dateCond}`;
    }
  
    const sql = `
      SELECT u.nome,
             SUM(s.score) AS total_score
        FROM scores s
        JOIN users u     ON u.id = s.user_id
        ${friendJoin}
       WHERE ${whereScope}
       GROUP BY s.user_id
       ORDER BY total_score DESC
       LIMIT 10
    `;
  
    const params = scope === 'friends' ? [userId] : [];
    db.query(sql, params, (err, rows) => {
      if (err) return res.status(500).send('Erro no leaderboard.');
      res.json(rows);
    });
  });
    