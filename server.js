const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

async function main() {
  // 🔧 Conexão com MySQL
  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "19052008",
    database: "meubanco"
  });

  // 🧱 Criação das tabelas
  await db.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100),
      nascimento DATE,
      email VARCHAR(100) UNIQUE,
      senha VARCHAR(255)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS registros (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      texto TEXT,
      emocao VARCHAR(50),
      data DATETIME,
      FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `);

  // 🧩 Rotas de Usuário
  app.post("/api/register", async (req, res) => {
    const { nome, nascimento, email, senha } = req.body;
    if (!nome || !nascimento || !email || !senha)
      return res.status(400).json({ success: false, message: "Campos obrigatórios ausentes." });

    const [rows] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (rows.length) return res.status(409).json({ success: false, message: "E-mail já cadastrado." });

    const senhaHash = await bcrypt.hash(senha, 10);
    await db.query("INSERT INTO usuarios (nome, nascimento, email, senha) VALUES (?, ?, ?, ?)", [
      nome, nascimento, email, senhaHash
    ]);
    res.json({ success: true });
  });

  app.post("/api/login", async (req, res) => {
    const { email, senha } = req.body;
    const [rows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    const usuario = rows[0];
    if (!usuario) return res.json({ success: false, message: "Usuário não encontrado." });

    const senhaConfere = await bcrypt.compare(senha, usuario.senha);
    if (!senhaConfere) return res.json({ success: false, message: "Senha incorreta." });

    res.json({ success: true, userId: usuario.id, nome: usuario.nome });
  });

  app.get("/api/usuario/:id", async (req, res) => {
    const [rows] = await db.query("SELECT nome, email, nascimento FROM usuarios WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Usuário não encontrado." });
    res.json(rows[0]);
  });

  app.put("/api/usuario/:id", async (req, res) => {
    const { nome, email, nascimento } = req.body;
    await db.query("UPDATE usuarios SET nome=?, email=?, nascimento=? WHERE id=?", [
      nome, email, nascimento, req.params.id
    ]);
    res.json({ success: true });
  });

  // → Rota para salvar registros
app.post("/api/registro", async (req, res) => {
  const { userId, texto, emocao, outrasRespostas } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: "Usuário não informado." });

  await db.query(
    "INSERT INTO registros (user_id, texto, emocao, data) VALUES (?, ?, ?, NOW())",
    [userId, texto, emocao]
  );

  res.json({ success: true });
});

// → Rota opcional para listar registros de um usuário
app.get("/api/registros/:userId", async (req, res) => {
  const [rows] = await db.query(
    "SELECT * FROM registros WHERE user_id = ? ORDER BY data DESC",
    [req.params.userId]
  );
  res.json(rows);
});


  // 🧩 Rotas de Registros do Diário
  app.post("/api/registros", async (req, res) => {
    const { userId, texto, emocao } = req.body;
    if (!userId || !texto || !emocao) return res.status(400).json({ success: false, message: "Campos obrigatórios ausentes." });

    await db.query("INSERT INTO registros (user_id, texto, emocao, data) VALUES (?, ?, ?, NOW())", [
      userId, texto, emocao
    ]);
    res.json({ success: true });
  });

  app.get("/api/registros/:userId", async (req, res) => {
    const [rows] = await db.query("SELECT id, texto, emocao, data FROM registros WHERE user_id = ? ORDER BY data DESC", [
      req.params.userId
    ]);
    res.json(rows);
  });

  app.delete("/api/registro/:id", async (req, res) => {
    await db.query("DELETE FROM registros WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  });

  app.listen(3000, () => console.log("✅ Servidor rodando em http://localhost:3000"));
}

main().catch(err => console.error(err));
