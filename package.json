const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 }
});

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'optimatec2026';

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[ERRO CRÍTICO] Falha ao conectar ao banco de dados:', err.message);
    } else {
        console.log('[SISTEMA] Conectado ao banco de dados SQLite com sucesso.');
        db.run(`CREATE TABLE IF NOT EXISTS disparos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rede TEXT NOT NULL,
            destino TEXT NOT NULL,
            mensagem TEXT NOT NULL,
            midia TEXT,
            hora TEXT NOT NULL
        )`);
    }
});

app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login - Optima Tec Enterprise</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
            <style>
                body { background-color: #0f172a; color: #f8fafc; font-family: 'Segoe UI', system-ui, sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; }
                .card-login { background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; width: 100%; max-width: 400px; padding: 2rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
                .btn-corporate { background-color: #2563eb; color: #ffffff; font-weight: 600; transition: background 0.2s; }
                .btn-corporate:hover { background-color: #1d4ed8; color: #ffffff; }
                .form-control { background-color: #0f172a !important; color: #ffffff !important; border-color: #334155 !important; }
                .form-control:focus { border-color: #2563eb !important; box-shadow: 0 0 0 0.25rem rgba(37, 99, 235, 0.25); }
            </style>
        </head>
        <body>
            <div class="card-login">
                <div class="text-center mb-4">
                    <i class="fa-solid fa-shield-halved text-primary fs-1 mb-2"></i>
                    <h4 class="fw-bold text-white m-0">OPTIMA TEC</h4>
                    <span class="text-muted small">Enterprise Omni-Social Suite</span>
                </div>
                <form action="/login" method="POST">
                    <div class="mb-3">
                        <label class="form-label small text-slate-300 fw-semibold">Usuário Corporativo</label>
                        <input type="text" class="form-control" name="usuario" required autocomplete="off">
                    </div>
                    <div class="mb-4">
                        <label class="form-label small text-slate-300 fw-semibold">Senha de Acesso</label>
                        <input type="password" class="form-control" name="senha" required>
                    </div>
                    <button type="submit" class="btn btn-corporate w-100 py-2">Autenticar Sistema</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
        res.cookie('auth', 'true', { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 86400000 });
        return res.redirect('/');
    }
    res.send(`<script>alert('Acesso negado: Credenciais inválidas.'); window.location.href='/login';</script>`);
});

function verificarAuth(req, res, next) {
    if (req.cookies && req.cookies.auth === 'true') {
        return next();
    }
    res.redirect('/login');
}

app.get('/', verificarAuth, (req, res) => {
    db.all(`SELECT * FROM disparos ORDER BY id DESC LIMIT 10`, [], (err, rows) => {
        if (err) rows = [];

        const historicoHtml = rows.length === 0 
            ? '<tr><td colspan="4" class="text-muted text-center py-4">Nenhum registro de atividade recente no sistema.</td></tr>' 
            : rows.map(l => `
                <tr>
                    <td class="text-info fw-semibold"><i class="fa-solid fa-circle-dot fa-2xs me-2"></i>${l.rede}</td>
                    <td class="text-truncate" style="max-width: 150px;" title="${l.destino}">${l.destino}</td>
                    <td>${l.midia ? '<span class="badge bg-success bg-opacity-75 text-white">Anexado</span>' : '<span class="text-muted">Texto Puro</span>'}</td>
                    <td class="text-muted small">${l.hora}</td>
                </tr>
            `).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Optima Tec - Enterprise Omni-Social</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
                <style>
                    body { background-color: #0f172a; color: #f8fafc; font-family: 'Segoe UI', system-ui, sans-serif; }
                    .navbar-corporate { background-color: #1e293b; border-bottom: 1px solid #334155; }
                    .card-corporate { background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
                    .btn-corporate { background-color: #2563eb; color: #ffffff; font-weight: 600; transition: all 0.2s; }
                    .btn-corporate:hover { background-color: #1d4ed8; color: #ffffff; }
                    .table-dark-custom { background-color: #111827; color: #e2e8f0; }
                    .form-control, .form-select { background-color: #0f172a !important; color: #ffffff !important; border-color: #334155 !important; }
                    .form-control:focus, .form-select:focus { border-color: #2563eb !important; box-shadow: 0 0 0 0.25rem rgba(37, 99, 235, 0.25); }
                </style>
            </head>
            <body>
                <nav class="navbar navbar-corporate px-4 py-3 mb-4">
                    <div class="container-fluid">
                        <span class="navbar-brand mb-0 h1 text-white fw-bold d-flex align-items-center">
                            <i class="fa-solid fa-server text-primary me-2 fs-4"></i> OPTIMA TEC <span class="text-muted fs-6 fw-normal ms-2">| Enterprise Omni-Social Suite</span>
                        </span>
                        <div class="d-flex align-items-center">
                            <span class="text-success small me-3 fw-semibold"><i class="fa-solid fa-circle fa-2xs text-success me-1"></i> Servidor Estável</span>
                            <a href="/login" class="btn btn-outline-danger btn-sm"><i class="fa-solid fa-arrow-right-from-bracket me-1"></i> Sair</a>
                        </div>
                    </div>
                </nav>

                <div class="container pb-5">
                    <div class="row g-4">
                        <div class="col-lg-6">
                            <div class="card card-corporate p-4 h-100">
                                <h5 class="fw-bold text-white mb-3"><i class="fa-solid fa-paper-plane text-primary me-2"></i> Central de Campanhas em Lote</h5>
                                <form id="formDisparo" action="/enviar" method="POST" enctype="multipart/form-data">
                                    <div class="mb-3">
                                        <label class="form-label small text-muted fw-semibold">CANAL DE DESTINO</label>
                                        <select class="form-select" name="rede" required>
                                            <optgroup label="💬 Mensageria Direta">
                                                <option value="WhatsApp">WhatsApp Business / API</option>
                                                <option value="Telegram">Telegram Channel / Bot</option>
                                                <option value="Messenger">Facebook Messenger</option>
                                                <option value="Instagram Direct">Instagram Direct</option>
                                            </optgroup>
                                            <optgroup label="🎬 Mídias Sociais & Vídeos">
                                                <option value="TikTok">TikTok (Publicação de Vídeo)</option>
                                                <option value="Kwai">Kwai (Publicação de Vídeo)</option>
                                                <option value="YouTube Shorts">YouTube Shorts / Vídeo</option>
                                            </optgroup>
                                            <optgroup label="✍️ Redes Corporativas">
                                                <option value="X (Twitter)">X / Twitter Post</option>
                                                <option value="LinkedIn">LinkedIn Business Feed</option>
                                            </optgroup>
                                        </select>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label small text-muted fw-semibold">DESTINATÁRIOS (Números ou @Perfis separados por vírgula)</label>
                                        <textarea class="form-control" name="telefones" rows="2" placeholder="5541999999999, @perfil_cliente" required></textarea>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label small text-muted fw-semibold">CONTEÚDO DA MENSAGEM / LEGENDA</label>
                                        <textarea class="form-control" name="mensagem" rows="3" placeholder="Digite a mensagem oficial da campanha..." required></textarea>
                                    </div>

                                    <div class="mb-4">
                                        <label class="form-label small text-muted fw-semibold">ANEXAR MÍDIA (Foto, Vídeo ou Documento até 25MB)</label>
                                        <input type="file" class="form-control" name="arquivo">
                                        <div class="form-text text-muted small">Formatos aceitos: MP4, JPG, PNG, PDF, DOCX.</div>
                                    </div>

                                    <button type="submit" id="btnEnviar" class="btn btn-corporate w-100 py-2">
                                        <i class="fa-solid fa-bolt me-2"></i> Executar Envio Corporativo
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="card card-corporate p-4 h-100">
                                <h5 class="fw-bold text-white mb-3"><i class="fa-solid fa-shield-heart text-info me-2"></i> Auditoria de Logs Recentes</h5>
                                <p class="text-muted small">Monitoramento em tempo real do processamento de campanhas.</p>
                                
                                <div class="table-responsive mt-3">
                                    <table class="table table-dark table-striped table-hover align-middle small table-dark-custom rounded overflow-hidden">
                                        <thead>
                                            <tr>
                                                <th>Canal</th>
                                                <th>Destino</th>
                                                <th>Mídia</th>
                                                <th>Horário</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${historicoHtml}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <script>
                    document.getElementById('formDisparo').addEventListener('submit', function() {
                        const btn = document.getElementById('btnEnviar');
                        btn.disabled = true;
                        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processando Lote Seguro...';
                    });
                </script>
            </body>
            </html>
        `);
    });
});

app.post('/enviar', verificarAuth, upload.single('arquivo'), (req, res) => {
    try {
        const { rede, telefones, mensagem } = req.body;
        const arquivoEnviado = req.file ? req.file.originalname : null;

        if (!telefones || !mensagem || !rede) {
            return res.send(`<script>alert('Erro: Preencha todos os campos obrigatórios.'); window.location.href='/';</script>`);
        }

        const listaDestinatarios = telefones.split(/[\n,]/).map(t => t.trim()).filter(t => t.length > 0);
        const horaAtual = new Date().toLocaleTimeString('pt-BR');

        const stmt = db.prepare(`INSERT INTO disparos (rede, destino, mensagem, midia, hora) VALUES (?, ?, ?, ?, ?)`);
        
        for (let destino of listaDestinatarios) {
            stmt.run([rede, destino, mensagem, arquivoEnviado, horaAtual]);
        }
        stmt.finalize();

        res.send(`<script>alert('Lote corporativo executado com sucesso na rede ${rede}!'); window.location.href='/';</script>`);
    } catch (error) {
        console.error('[ERRO NO PROCESSAMENTO]', error);
        res.send(`<script>alert('Erro crítico ao processar o envio.'); window.location.href='/';</script>`);
    }
});

app.listen(PORT, () => {
    console.log(`[SUCESSO] Optima Tec Enterprise rodando robustamente na porta ${PORT}`);
});
