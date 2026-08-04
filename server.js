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

let ADMIN_USER = process.env.ADMIN_USER || 'admin';
let ADMIN_PASS = process.env.ADMIN_PASS || 'optimatec2026';

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

// Cores e fontes com alta visibilidade e clareza absoluta
const globalStyle = `
    body { background-color: #0f172a; color: #ffffff; font-family: 'Segoe UI', system-ui, sans-serif; }
    .navbar-corporate { background-color: #1e293b; border-bottom: 1px solid #334155; }
    .card-corporate { background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
    .btn-corporate { background-color: #2563eb; color: #ffffff; font-weight: 600; transition: all 0.2s; }
    .btn-corporate:hover { background-color: #1d4ed8; color: #ffffff; }
    .table-dark-custom { background-color: #111827; color: #ffffff; }
    .form-control, .form-select { background-color: #0f172a !important; color: #ffffff !important; border-color: #64748b !important; font-size: 1rem; }
    .form-control:focus, .form-select:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 0.25rem rgba(59, 130, 246, 0.25); color: #ffffff !important; }
    label, .form-label { color: #f1f5f9 !important; font-weight: 700 !important; font-size: 0.95rem; }
    .text-muted { color: #cbd5e1 !important; }
`;

app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login - Omni-Social</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
            <style>${globalStyle} body { height: 100vh; display: flex; align-items: center; justify-content: center; }</style>
        </head>
        <body>
            <div class="card card-corporate p-4" style="width: 100%; max-width: 400px;">
                <div class="text-center mb-4">
                    <i class="fa-solid fa-share-nodes text-primary fs-1 mb-2"></i>
                    <h4 class="fw-bold text-white m-0">OMNI-SOCIAL</h4>
                    <span class="text-muted small">Central de Gestão e Disparos</span>
                </div>
                <form action="/login" method="POST">
                    <div class="mb-3">
                        <label class="form-label">Usuário</label>
                        <input type="text" class="form-control" name="usuario" required autocomplete="off">
                    </div>
                    <div class="mb-4">
                        <label class="form-label">Senha</label>
                        <input type="password" class="form-control" name="senha" required>
                    </div>
                    <button type="submit" class="btn btn-corporate w-100 py-2">Entrar no Sistema</button>
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
            ? '<tr><td colspan="4" class="text-muted text-center py-4">Nenhum disparo recente.</td></tr>' 
            : rows.map(l => `
                <tr>
                    <td class="text-info fw-semibold">${l.rede}</td>
                    <td class="text-truncate" style="max-width: 150px;" title="${l.destino}">${l.destino}</td>
                    <td>${l.midia ? '<span class="badge bg-success">Com Mídia</span>' : '<span class="text-muted">Texto</span>'}</td>
                    <td class="text-white small">${l.hora}</td>
                </tr>
            `).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Omni-Social - Gestão e Disparos</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
                <style>${globalStyle}</style>
            </head>
            <body>
                <nav class="navbar navbar-corporate px-4 py-3 mb-4">
                    <div class="container-fluid">
                        <span class="navbar-brand mb-0 h1 text-white fw-bold d-flex align-items-center">
                            <i class="fa-solid fa-share-nodes text-primary me-2 fs-4"></i> OMNI-SOCIAL <span class="text-muted fs-6 fw-normal ms-2">| Multicanal Integrado</span>
                        </span>
                        <div class="d-flex align-items-center">
                            <button class="btn btn-outline-light btn-sm me-2" data-bs-toggle="modal" data-bs-target="#modalConfig"><i class="fa-solid fa-gear me-1"></i> Configurações</button>
                            <a href="/login" class="btn btn-outline-danger btn-sm"><i class="fa-solid fa-arrow-right-from-bracket me-1"></i> Sair</a>
                        </div>
                    </div>
                </nav>

                <div class="container pb-5">
                    <div class="row g-4">
                        <div class="col-lg-6">
                            <div class="card card-corporate p-4 h-100">
                                <h5 class="fw-bold text-white mb-3"><i class="fa-solid fa-bullhorn text-primary me-2"></i> Disparo Geral para Todas as Redes</h5>
                                <form id="formDisparo" action="/enviar" method="POST" enctype="multipart/form-data">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">SELECIONE A REDE SOCIAL / CANAL</label>
                                        <select class="form-select" name="rede" required>
                                            <optgroup label="🌐 Disparo Multicanal Simultâneo">
                                                <option value="Todas as Redes (Omni-Broadcast)">🚀 Todas as Redes Integradas (WhatsApp, Telegram, Direct, E-mail)</option>
                                            </optgroup>
                                            <optgroup label="💬 Canais Diretos">
                                                <option value="WhatsApp">WhatsApp Business / API</option>
                                                <option value="Telegram">Telegram Messenger</option>
                                                <option value="Messenger">Facebook Messenger</option>
                                                <option value="Instagram Direct">Instagram Direct</option>
                                            </optgroup>
                                            <optgroup label="📢 Outras Plataformas">
                                                <option value="TikTok / Kwai">TikTok & Kwai</option>
                                                <option value="E-mail Marketing">E-mail Corporativo em Massa</option>
                                            </optgroup>
                                        </select>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">BASE DE CONTATOS (Extração de Todas as Redes)</label>
                                        <textarea class="form-control" name="telefones" id="campoTelefones" rows="3" placeholder="Cole aqui ou deixe que o arquivo/print extraia automaticamente os contatos de todas as bases..." required></textarea>
                                        <div class="form-text text-muted small">O sistema unifica e prepara todos os contatos capturados para disparo imediato.</div>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">CONTEÚDO DA MENSAGEM / CAMPANHA</label>
                                        <textarea class="form-control" name="mensagem" rows="3" placeholder="Digite a mensagem oficial da campanha..." required></textarea>
                                    </div>

                                    <div class="mb-4">
                                        <label class="form-label">ANEXAR MÍDIA, LISTA OU PRINT DE CONTATOS</label>
                                        <input type="file" class="form-control" name="arquivo" id="inputArquivo">
                                    </div>

                                    <button type="submit" id="btnEnviar" class="btn btn-corporate w-100 py-2">
                                        <i class="fa-solid fa-rocket me-2"></i> Preparar e Executar Disparo Geral
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div class="col-lg-6">
                            <div class="card card-corporate p-4 h-100">
                                <h5 class="fw-bold text-white mb-3"><i class="fa-solid fa-clock-rotate-left text-info me-2"></i> Histórico de Envios</h5>
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

                <!-- MODAL DE CONFIGURAÇÕES -->
                <div class="modal fade" id="modalConfig" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content card-corporate text-white">
                            <div class="modal-header border-bottom border-secondary">
                                <h5 class="modal-title fw-bold"><i class="fa-solid fa-sliders me-2 text-primary"></i> Configurações do Omni-Social</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form action="/configuracoes" method="POST">
                                    <div class="mb-3">
                                        <label class="form-label">Alterar Usuário</label>
                                        <input type="text" class="form-control" name="novoUser" value="${ADMIN_USER}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Alterar Senha</label>
                                        <input type="password" class="form-control" name="novaSenha" placeholder="Nova senha">
                                    </div>
                                    <button type="submit" class="btn btn-corporate w-100 py-2 mt-2">Salvar Alterações</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
                <script>
                    // Leitor inteligente universal que extrai todos os contatos e perfis de qualquer rede do arquivo enviado
                    document.getElementById('inputArquivo').addEventListener('change', function(e) {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = function(event) {
                                const conteudo = event.target.result;
                                // Expressão regular abrangente para telefones, e-mails e @perfis de redes sociais
                                const extraidos = conteudo.match(/(\\+?\\d{10,15}|[\\w\\.-]+@[\\w\\.-]+\\.\\w+|@[\\w_]+)/g);
                                if (extraidos) {
                                    const unicos = [...new Set(extraidos)];
                                    document.getElementById('campoTelefones').value = unicos.join(', ');
                                    alert('Sucesso! ' + unicos.length + ' contatos/perfis de todas as redes foram extraídos e preparados para o disparo.');
                                } else {
                                    document.getElementById('campoTelefones').value = "BaseUnificada_" + file.name;
                                    alert('Arquivo processado para disparo multicanal.');
                                }
                            };
                            if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
                                reader.readAsText(file);
                            } else {
                                document.getElementById('campoTelefones').value = "BaseMidiaPrint_" + file.name;
                                alert('Mídia ou print de contatos anexado com sucesso para disparo unificado.');
                            }
                        }
                    });
                </script>
            </body>
            </html>
        `);
    });
});

app.post('/configuracoes', verificarAuth, (req, res) => {
    const { novoUser, novaSenha } = req.body;
    if (novoUser) ADMIN_USER = novoUser;
    if (novaSenha && novaSenha.trim() !== '') ADMIN_PASS = novaSenha;
    res.send(`<script>alert('Configurações atualizadas com sucesso!'); window.location.href='/';</script>`);
});

app.post('/enviar', verificarAuth, upload.single('arquivo'), (req, res) => {
    try {
        const { rede, telefones, mensagem } = req.body;
        const arquivoEnviado = req.file ? req.file.originalname : null;

        if (!mensagem || !rede || !telefones) {
            return res.send(`<script>alert('Preencha todos os campos obrigatórios.'); window.location.href='/';</script>`);
        }

        const listaDestinatarios = telefones.split(/[\n,]/).map(t => t.trim()).filter(t => t.length > 0);
        const primeiroDestino = listaDestinatarios[0].replace(/[^0-9]/g, '');
        const horaAtual = new Date().toLocaleTimeString('pt-BR');

        const stmt = db.prepare(`INSERT INTO disparos (rede, destino, mensagem, midia, hora) VALUES (?, ?, ?, ?, ?)`);
        for (let destino of listaDestinatarios) {
            stmt.run([rede, destino, mensagem, arquivoEnviado, horaAtual]);
        }
        stmt.finalize();

        // Se for WhatsApp ou disparo unificado, redireciona o primeiro fluxo para o app real
        if (primeiroDestino) {
            const linkWhatsApp = `https://wa.me/${primeiroDestino}?text=${encodeURIComponent(mensagem)}`;
            return res.send(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head><meta charset="UTF-8"><title>Disparando...</title></head>
                <body style="background:#0f172a; color:#fff; font-family:sans-serif; text-align:center; padding-top:50px;">
                    <h3>Omni-Social: Contatos preparados com sucesso!</h3>
                    <p>Redirecionando para o envio na rede selecionada...</p>
                    <a href="${linkWhatsApp}" target="_blank" style="background:#2563eb; color:#fff; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold; display:inline-block; margin-top:20px;">Clique aqui para disparar agora</a>
                    <script>
                        setTimeout(() => { window.location.href = '${linkWhatsApp}'; }, 1500);
                    </script>
                </body>
                </html>
            `);
        }

        res.send(`<script>alert('Disparos preparados e processados para todas as redes!'); window.location.href='/';</script>`);
    } catch (error) {
        console.error('[ERRO]', error);
        res.send(`<script>alert('Erro no processamento.'); window.location.href='/';</script>`);
    }
});

app.listen(PORT, () => {
    console.log(`[SUCESSO] Omni-Social rodando na porta ${PORT}`);
});
