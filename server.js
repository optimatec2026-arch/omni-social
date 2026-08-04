const express = require('express');
const Database = require('better-sqlite3');
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadDir));

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

// Conexão segura com Better-SQLite3 (Evita crash com status 1)
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS disparos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rede TEXT NOT NULL,
        destino TEXT NOT NULL,
        mensagem TEXT NOT NULL,
        midia TEXT,
        status TEXT NOT NULL,
        hora TEXT NOT NULL
    )
`);

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
            <title>Login - Omni-Social Estável</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
            <style>${cleanStyle} body { height: 100vh; display: flex; align-items: center; justify-content: center; }</style>
        </head>
        <body>
            <div class="card card-corporate p-5" style="width: 100%; max-width: 420px;">
                <div class="text-center mb-4">
                    <div class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 60px; height: 60px; font-size: 24px;">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>
                    <h4 class="fw-bold mt-3 mb-1">Omni-Social</h4>
                    <span class="text-muted-custom small">Ambiente Protegido & Estável</span>
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
    try {
        const busca = req.query.busca || '';
        let rows = [];

        if (busca) {
            const stmt = db.prepare(`SELECT * FROM disparos WHERE destino LIKE ? OR rede LIKE ? ORDER BY id DESC LIMIT 20`);
            rows = stmt.all(`%${busca}%`, `%${busca}%`);
        } else {
            rows = db.prepare(`SELECT * FROM disparos ORDER BY id DESC LIMIT 20`).all();
        }

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
                <title>Omni-Social - Painel Estável</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
                <style>${cleanStyle}</style>
            </head>
            <body>
                <nav class="navbar navbar-corporate px-4 py-3 mb-4">
                    <div class="container-fluid">
                        <span class="navbar-brand mb-0 h1 fw-bold text-dark d-flex align-items-center">
                            <i class="fa-solid fa-shield-halved text-primary me-2 fs-4"></i> OMNI-SOCIAL <span class="text-muted-custom fs-6 fw-normal ms-2">| Cloud Stable</span>
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
                                <h5 class="fw-bold mb-3"><i class="fa-solid fa-wand-magic-sparkles text-primary me-2"></i> Parser & Fila Contínua</h5>
                                <p class="text-muted-custom small">Cole os dados brutos ou anexe um arquivo `.txt`. O parser processará os contatos de forma segura e gerará a fila sem risco de falhas.</p>
                                
                                <form id="formDisparo" action="/iniciar-parser-fila" method="POST" enctype="multipart/form-data">
                                    <div class="mb-3">
                                        <label class="form-label">Bloco de Dados Brutos</label>
                                        <textarea class="form-control" name="textoBruto" id="campoTextoBruto" rows="5" placeholder="Cole aqui os dados bagunçados..." required></textarea>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">Mensagem Padrão da Campanha</label>
                                        <textarea class="form-control" name="mensagem" rows="3" placeholder="Digite a mensagem..." required></textarea>
                                    </div>

                                    <div class="mb-4">
                                        <label class="form-label">Anexar Arquivo `.txt` (Opcional)</label>
                                        <input type="file" class="form-control" name="arquivo" id="inputArquivo">
                                    </div>

                                    <button type="submit" class="btn btn-corporate w-100 py-3">
                                        <i class="fa-solid fa-network-wired me-2"></i> Executar Parser com Segurança
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div class="col-lg-7">
                            <div class="card card-corporate p-4 h-100">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h5 class="fw-bold m-0"><i class="fa-solid fa-database text-primary me-2"></i> Auditoria de Envios</h5>
                                    <form method="GET" action="/" class="d-flex gap-2">
                                        <input type="text" class="form-control form-control-sm" name="busca" value="${busca}" placeholder="Filtrar...">
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

                <!-- MODAL CONFIG -->
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
                    document.getElementById('inputArquivo').addEventListener('change', function(e) {
                        const file = e.target.files[0];
                        if (file && (file.type.includes('text') || file.name.endsWith('.txt'))) {
                            const reader = new FileReader();
                            reader.onload = function(event) {
                                document.getElementById('campoTextoBruto').value = event.target.result;
                            };
                            reader.readAsText(file);
                        }
                    });
                </script>
            </body>
            </html>
        `);
    } catch (e) {
        console.error('[ERRO ROTA RAIZ]', e);
        res.status(500).send('Erro interno no servidor.');
    }
});

app.post('/configuracoes', verificarAuth, (req, res) => {
    const { novoUser, novaSenha } = req.body;
    if (novoUser) ADMIN_USER = novoUser;
    if (novaSenha && novaSenha.trim() !== '') ADMIN_PASS = novaSenha;
    res.send(`<script>alert('Configurações atualizadas!'); window.location.href='/';</script>`);
});

app.post('/iniciar-parser-fila', verificarAuth, upload.single('arquivo'), (req, res) => {
    try {
        let textoBruto = req.body.textoBruto || '';
        const mensagem = req.body.mensagem || '';
        const nomeOriginalArquivo = req.file ? req.file.originalname : null;

        if (req.file && !textoBruto.trim()) {
            try {
                const filePath = path.join(uploadDir, req.file.filename);
                if (fs.existsSync(filePath)) {
                    textoBruto = fs.readFileSync(filePath, 'utf8');
                }
            } catch (errFile) {
                console.error('Erro ao ler arquivo anexo:', errFile);
            }
        }

        if (!textoBruto.trim() || !mensagem.trim()) {
            return res.send(`<script>alert('Preencha os campos obrigatórios.'); window.location.href='/';</script>`);
        }

        const itensFila = [];

        const regexEmail = /[\w\.-]+@[\w\.-]+\.\w+/g;
        const emailsEncontrados = [...new Set(textoBruto.match(regexEmail) || [])];
        emailsEncontrados.forEach(email => {
            itensFila.push({ rede: 'E-mail Corporativo', destino: email });
        });

        const regexTelefone = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2}\)?[\s-]?)?\d{4,5}[\s-]?\d{4}/g;
        const telefonesEncontrados = [...new Set(textoBruto.match(regexTelefone) || [])];
        telefonesEncontrados.forEach(tel => {
            const limpo = tel.replace(/[^0-9]/g, '');
            if (limpo.length >= 10) {
                itensFila.push({ rede: 'WhatsApp', destino: tel });
            }
        });

        const regexPerfis = /@[\w_]+/g;
        const perfisEncontrados = [...new Set(textoBruto.match(regexPerfis) || [])];
        perfisEncontrados.forEach(perfil => {
            itensFila.push({ rede: 'Instagram', destino: perfil });
        });

        if (textoBruto.includes('t.me/') || textoBruto.includes('telegram')) {
            const regexTg = /t\.me\/[\w_]+/g;
            const tgs = textoBruto.match(regexTg) || [];
            tgs.forEach(t => itensFila.push({ rede: 'Telegram', destino: t }));
        }

        if (itensFila.length === 0) {
            return res.send(`<script>alert('Nenhum contato válido identificado pelo parser.'); window.location.href='/';</script>`);
        }

        const horaAtual = new Date().toLocaleTimeString('pt-BR');
        const insertStmt = db.prepare(`INSERT INTO disparos (rede, destino, mensagem, midia, status, hora) VALUES (?, ?, ?, ?, ?, ?)`);
        
        const insertMany = db.transaction((items) => {
            for (let item of items) {
                insertStmt.run(item.rede, item.destino, mensagem, nomeOriginalArquivo, 'Na Fila Multi-Rede', horaAtual);
            }
        });
        insertMany(itensFila);

        const filaJson = JSON.stringify(itensFila);
        res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Fila Multi-Rede Segura - Omni-Social</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
                <style>${cleanStyle}</style>
            </head>
            <body class="d-flex align-items-center justify-content-center" style="min-height: 100vh;">
                <div class="card card-corporate p-4 text-center" style="width: 100%; max-width: 580px;">
                    <div class="mb-3">
                        <span class="badge bg-primary px-3 py-2 fs-6">Fila Multi-Rede: <span id="indiceAtual">1</span> de ${itensFila.length}</span>
                    </div>
                    <div class="mb-2">
                        <span id="badgeRede" class="badge bg-success px-3 py-1 fs-5">Canal</span>
                    </div>
                    <h3 class="text-primary fw-bold mb-4" id="textoDestino">Carregando...</h3>
                    
                    <div class="p-3 bg-light rounded text-start mb-4 border">
                        <small class="text-muted-custom d-block mb-1"><b>Mensagem Configurada:</b></small>
                        <p class="mb-0 text-dark small" style="white-space: pre-wrap;">${mensagem}</p>
                        ${nomeOriginalArquivo ? `<hr><small class="text-success"><i class="fa-solid fa-file-arrow-down me-1"></i> Mídia Anexada: <b>${nomeOriginalArquivo}</b></small>` : ''}
                    </div>

                    <div class="d-grid gap-2">
                        <a id="btnDisparar" href="#" target="_blank" class="btn btn-corporate py-3 fw-bold fs-5" onclick="proximoContato()">
                            <i class="fa-solid fa-paper-plane me-2"></i> Disparar Nesta Rede & Avançar
                        </a>
                        <a href="/" class="btn btn-outline-secondary py-2 mt-2">Interromper e Voltar ao Painel</a>
                    </div>
                </div>

                <script>
                    const fila = ${filaJson};
                    let index = 0;
                    const mensagemCampanha = ${JSON.stringify(mensagem)};

                    function atualizarTela() {
                        if (index < fila.length) {
                            const item = fila[index];
                            document.getElementById('indiceAtual').innerText = index + 1;
                            document.getElementById('badgeRede').innerText = item.rede;
                            document.getElementById('textoDestino').innerText = item.destino;
                            
                            let linkHref = "#";
                            const destinoLimpo = item.destino.replace(/[^0-9]/g, '');

                            if (item.rede === 'WhatsApp' && destinoLimpo.length >= 10) {
                                linkHref = "https://wa.me/" + destinoLimpo + "?text=" + encodeURIComponent(mensagemCampanha);
                            } else if (item.rede === 'E-mail Corporativo') {
                                linkHref = "mailto:" + item.destino + "?subject=" + encodeURIComponent("Campanha Oficial") + "&body=" + encodeURIComponent(mensagemCampanha);
                            } else if (item.rede === 'Telegram') {
                                linkHref = "https://t.me/" + item.destino.replace('@','');
                            } else {
                                linkHref = "https://instagram.com/" + item.destino.replace('@','');
                            }

                            document.getElementById('btnDisparar').href = linkHref;
                        } else {
                            alert('Fila multi-rede concluída com sucesso!');
                            window.location.href = '/';
                        }
                    }

                    function proximoContato() {
                        index++;
                        setTimeout(atualizarTela, 500);
                    }

                    atualizarTela();
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('[ERRO NO PARSER CRÍTICO]', error);
        res.send(`<script>alert('Erro crítico ao processar os dados.'); window.location.href='/';</script>`);
    }
});

app.listen(PORT, () => {
    console.log(`[SUCESSO] Omni-Social Estável rodando na porta ${PORT}`);
});
