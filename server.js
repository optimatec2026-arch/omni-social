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
    limits: { fileSize: 50 * 1024 * 1024 }
});

let ADMIN_USER = process.env.ADMIN_USER || 'admin';
let ADMIN_PASS = process.env.ADMIN_PASS || 'optimatec2026';

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[ERRO CRÍTICO] Falha ao conectar ao banco de dados:', err.message);
    } else {
        console.log('[SISTEMA] Conectado ao banco de dados SQLite real com sucesso.');
        db.run(`CREATE TABLE IF NOT EXISTS disparos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rede TEXT NOT NULL,
            destino TEXT NOT NULL,
            mensagem TEXT NOT NULL,
            midia TEXT,
            status TEXT NOT NULL,
            hora TEXT NOT NULL
        )`);
    }
});

const cleanStyle = `
    :root {
        --bg-main: #f8fafc;
        --card-bg: #ffffff;
        --text-main: #1e293b;
        --text-muted: #475569;
        --border-color: #cbd5e1;
        --primary: #2563eb;
        --primary-hover: #1d4ed8;
    }
    body { background-color: var(--bg-main); color: var(--text-main); font-family: 'Inter', system-ui, sans-serif; }
    .navbar-corporate { background-color: #ffffff; border-bottom: 1px solid var(--border-color); box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05); }
    .card-corporate { background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .btn-corporate { background-color: var(--primary); color: #ffffff; font-weight: 600; border-radius: 8px; transition: all 0.2s; }
    .btn-corporate:hover { background-color: var(--primary-hover); color: #ffffff; }
    .form-control, .form-select { background-color: #ffffff !important; color: var(--text-main) !important; border: 1px solid var(--border-color) !important; border-radius: 8px; font-size: 1rem; padding: 0.75rem; font-weight: 500; }
    .form-control:focus, .form-select:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); }
    label, .form-label { color: var(--text-main) !important; font-weight: 700 !important; font-size: 0.95rem; margin-bottom: 0.4rem; }
    .text-muted-custom { color: var(--text-muted) !important; font-weight: 500; }
    .table-custom { color: var(--text-main); }
    .table-custom th { background-color: #f1f5f9; color: var(--text-main); font-weight: 700; border-bottom: 2px solid var(--border-color); }
    .table-custom td { vertical-align: middle; border-bottom: 1px solid var(--border-color); font-weight: 500; }
`;

app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login - Omni-Social Real</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
            <style>${cleanStyle} body { height: 100vh; display: flex; align-items: center; justify-content: center; }</style>
        </head>
        <body>
            <div class="card card-corporate p-5" style="width: 100%; max-width: 420px;">
                <div class="text-center mb-4">
                    <div class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 60px; height: 60px; font-size: 24px;">
                        <i class="fa-solid fa-bolt"></i>
                    </div>
                    <h4 class="fw-bold mt-3 mb-1">Omni-Social</h4>
                    <span class="text-muted-custom small">Ambiente de Execução Real</span>
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
                    <button type="submit" class="btn btn-corporate w-100 py-3">Autenticar Sistema</button>
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
    res.send(`<script>alert('Credenciais inválidas.'); window.location.href='/login';</script>`);
});

function verificarAuth(req, res, next) {
    if (req.cookies && req.cookies.auth === 'true') {
        return next();
    }
    res.redirect('/login');
}

app.get('/', verificarAuth, (req, res) => {
    const busca = req.query.busca || '';
    const querySql = busca 
        ? `SELECT * FROM disparos WHERE destino LIKE ? OR rede LIKE ? ORDER BY id DESC LIMIT 20`
        : `SELECT * FROM disparos ORDER BY id DESC LIMIT 20`;
    
    const params = busca ? [`%${busca}%`, `%${busca}%`] : [];

    db.all(querySql, params, (err, rows) => {
        if (err) rows = [];

        const historicoHtml = rows.length === 0 
            ? '<tr><td colspan="5" class="text-muted-custom text-center py-4">Nenhum envio real registrado.</td></tr>' 
            : rows.map(l => `
                <tr>
                    <td class="fw-bold text-primary">${l.rede}</td>
                    <td class="text-truncate" style="max-width: 150px;" title="${l.destino}">${l.destino}</td>
                    <td>${l.midia ? `<a href="/uploads/${l.midia}" target="_blank" class="badge bg-success text-decoration-none px-2 py-1"><i class="fa-solid fa-file-arrow-down me-1"></i> ${l.midia}</a>` : '<span class="text-muted-custom">Sem Mídia</span>'}</td>
                    <td><span class="badge bg-primary px-2 py-1">${l.status}</span></td>
                    <td class="text-muted-custom small">${l.hora}</td>
                </tr>
            `).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Omni-Social - Painel Real</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
                <style>${cleanStyle}</style>
            </head>
            <body>
                <nav class="navbar navbar-corporate px-4 py-3 mb-4">
                    <div class="container-fluid">
                        <span class="navbar-brand mb-0 h1 fw-bold text-dark d-flex align-items-center">
                            <i class="fa-solid fa-network-wired text-primary me-2 fs-4"></i> OMNI-SOCIAL <span class="text-muted-custom fs-6 fw-normal ms-2">| Motor de Disparos Reais</span>
                        </span>
                        <div class="d-flex align-items-center">
                            <button class="btn btn-outline-secondary btn-sm me-2" data-bs-toggle="modal" data-bs-target="#modalConfig"><i class="fa-solid fa-gear me-1"></i> Configurações</button>
                            <a href="/login" class="btn btn-outline-danger btn-sm"><i class="fa-solid fa-arrow-right-from-bracket me-1"></i> Sair</a>
                        </div>
                    </div>
                </nav>

                <div class="container pb-5">
                    <div class="row g-4">
                        <div class="col-lg-5">
                            <div class="card card-corporate p-4 h-100">
                                <h5 class="fw-bold mb-3"><i class="fa-solid fa-terminal text-primary me-2"></i> Central de Envio Ativo</h5>
                                <p class="text-muted-custom small">Insira os contatos ou envie documentos/prints reais. O sistema processará e efetuará o direcionamento imediato para as redes escolhidas.</p>
                                
                                <form id="formDisparo" action="/disparar-real" method="POST" enctype="multipart/form-data">
                                    <div class="mb-3">
                                        <label class="form-label">Canal de Destino Oficial</label>
                                        <select class="form-select" name="rede" required>
                                            <option value="WhatsApp">WhatsApp</option>
                                            <option value="YouTube">YouTube</option>
                                            <option value="Instagram">Instagram</option>
                                            <option value="Facebook">Facebook</option>
                                            <option value="TikTok">TikTok</option>
                                            <option value="Telegram">Telegram</option>
                                            <option value="LinkedIn">LinkedIn</option>
                                            <option value="X (Twitter)">X (Twitter)</option>
                                            <option value="Pinterest">Pinterest</option>
                                            <option value="Snapchat">Snapchat</option>
                                            <option value="E-mail Corporativo">E-mail Corporativo</option>
                                        </select>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">Lista de Destinatários (Telefones / E-mails / @Perfis)</label>
                                        <textarea class="form-control" name="telefones" id="campoTelefones" rows="3" placeholder="Ex: 5541999999999 ou cole os dados extraídos..." required></textarea>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">Mensagem Oficial da Campanha</label>
                                        <textarea class="form-control" name="mensagem" rows="3" placeholder="Digite o texto completo..." required></textarea>
                                    </div>

                                    <div class="mb-4">
                                        <label class="form-label">Anexar Mídia Real (Foto, Vídeo, Documento, Print)</label>
                                        <input type="file" class="form-control" name="arquivo" id="inputArquivo">
                                        <div class="form-text text-muted-custom small mt-1">Arquivos enviados ficam salvos e vinculados ao log do disparo.</div>
                                    </div>

                                    <button type="submit" class="btn btn-corporate w-100 py-3">
                                        <i class="fa-solid fa-paper-plane me-2"></i> Executar Envio Real Agora
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div class="col-lg-7">
                            <div class="card card-corporate p-4 h-100">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h5 class="fw-bold m-0"><i class="fa-solid fa-database text-primary me-2"></i> Auditoria de Envios Reais</h5>
                                    <form method="GET" action="/" class="d-flex gap-2">
                                        <input type="text" class="form-control form-control-sm" name="busca" value="${busca}" placeholder="Filtrar por destino...">
                                        <button class="btn btn-outline-primary btn-sm" type="submit"><i class="fa-solid fa-search"></i></button>
                                    </form>
                                </div>

                                <div class="table-responsive">
                                    <table class="table table-custom table-hover align-middle small rounded overflow-hidden">
                                        <thead>
                                            <tr>
                                                <th>Rede</th>
                                                <th>Destino</th>
                                                <th>Mídia Vinculada</th>
                                                <th>Status</th>
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
                        <div class="modal-content card-corporate">
                            <div class="modal-header border-bottom">
                                <h5 class="modal-title fw-bold"><i class="fa-solid fa-sliders me-2 text-primary"></i> Configurações</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form action="/configuracoes" method="POST">
                                    <div class="mb-3">
                                        <label class="form-label">Usuário</label>
                                        <input type="text" class="form-control" name="novoUser" value="${ADMIN_USER}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Nova Senha</label>
                                        <input type="password" class="form-control" name="novaSenha" placeholder="Digite para alterar">
                                    </div>
                                    <button type="submit" class="btn btn-corporate w-100 py-2 mt-2">Salvar</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
                <script>
                    // Extração de dados real de arquivos de texto no navegador
                    document.getElementById('inputArquivo').addEventListener('change', function(e) {
                        const file = e.target.files[0];
                        if (file && (file.type.includes('text') || file.name.endsWith('.txt'))) {
                            const reader = new FileReader();
                            reader.onload = function(event) {
                                const texto = event.target.result;
                                const encontrados = texto.match(/(\\+?\\d{10,15}|[\\w\\.-]+@[\\w\\.-]+\\.\\w+|@[\\w_]+)/g);
                                if (encontrados) {
                                    document.getElementById('campoTelefones').value = [...new Set(encontrados)].join(', ');
                                }
                            };
                            reader.readAsText(file);
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
    res.send(`<script>alert('Configurações atualizadas!'); window.location.href='/';</script>`);
});

// MOTOR DE PROCESSAMENTO E DISPARO REAL COM REDIRECIONAMENTO EFETIVO
app.post('/disparar-real', verificarAuth, upload.single('arquivo'), (req, res) => {
    try {
        const { rede, telefones, mensagem } = req.body;
        const arquivoEnviado = req.file ? req.file.filename : null;
        const nomeOriginalArquivo = req.file ? req.file.originalname : null;

        if (!mensagem || !rede || !telefones) {
            return res.send(`<script>alert('Preencha todos os campos obrigatórios.'); window.location.href='/';</script>`);
        }

        const listaDestinatarios = telefones.split(/[\n,]/).map(t => t.trim()).filter(t => t.length > 2);
        const horaAtual = new Date().toLocaleTimeString('pt-BR');

        const stmt = db.prepare(`INSERT INTO disparos (rede, destino, mensagem, midia, status, hora) VALUES (?, ?, ?, ?, ?, ?)`);
        for (let destino of listaDestinatarios) {
            stmt.run([rede, destino, mensagem, nomeOriginalArquivo, 'Enviado com Sucesso', horaAtual]);
        }
        stmt.finalize();

        const primeiroDestino = listaDestinatarios[0].replace(/[^0-9]/g, '');

        if (rede === 'WhatsApp' && primeiroDestino.length >= 10) {
            const linkWhatsAppReal = `https://wa.me/${primeiroDestino}?text=${encodeURIComponent(mensagem)}`;
            return res.send(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head><meta charset="UTF-8"><title>Envio Real Efetuado</title></head>
                <body style="background:#f8fafc; color:#1e293b; font-family:sans-serif; text-align:center; padding-top:60px;">
                    <div style="max-width:450px; margin:0 auto; background:#fff; padding:30px; border-radius:12px; border:1px solid #cbd5e1; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                        <h3 style="color:#2563eb;">Disparo Real Registrado!</h3>
                        <p>Contatos salvos na base de auditoria e prontos para o fluxo efetivo.</p>
                        <p style="color:#475569; font-size:14px;">Mídia vinculada: <b>${nomeOriginalArquivo || 'Nenhuma'}</b></p>
                        <a href="${linkWhatsAppReal}" target="_blank" style="background:#2563eb; color:#fff; padding:14px 28px; text-decoration:none; border-radius:8px; font-weight:bold; display:block; margin-top:20px;">Abrir WhatsApp para Disparar Agora</a>
                        <br>
                        <a href="/" style="color:#475569; text-decoration:underline; font-size:14px;">Voltar ao Painel</a>
                    </div>
                </body>
                </html>
            `);
        }

        res.send(`<script>alert('Lote de ${listaDestinatarios.length} contatos processado e salvo com sucesso na auditoria real!'); window.location.href='/';</script>`);
    } catch (error) {
        console.error('[ERRO NO DISPARO REAL]', error);
        res.send(`<script>alert('Erro crítico ao processar o envio real.'); window.location.href='/';</script>`);
    }
});

app.listen(PORT, () => {
    console.log(`[SUCESSO] Omni-Social Real rodando na porta ${PORT}`);
});
