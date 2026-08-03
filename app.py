import http.server
import socketserver
import urllib.parse
import threading
import time
import random
import re
import json
import os

PORT = 8080
CACHE_FILE = "cache_dados_global_v14.txt"

def carregar_dados():
    dados_padrao = {
        "usuario": "admin",
        "senha": "123",
        "lista": "",
        "msg": "Olá! {Tudo bem?|Passando para compartilhar nossas novidades!}"
    }
    
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                dados = json.load(f)
                return {
                    "usuario": dados.get("usuario", "admin"),
                    "senha": dados.get("senha", "123"),
                    "lista": dados.get("lista", ""),
                    "msg": dados.get("msg", dados_padrao["msg"])
                }
        except:
            pass
    return dados_padrao

def salvar_dados(usuario, senha, lista, msg):
    try:
        dados = {
            "usuario": usuario,
            "senha": senha,
            "lista": lista,
            "msg": msg
        }
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(dados, f, ensure_ascii=False)
    except:
        pass

def processar_dados_html(lista_raw, mensagem):
    filas_temp = {
        "whatsapp": "", "instagram": "", "facebook": "", 
        "tiktok": "", "kwai": "", "telegram": "", "email": ""
    }
    contadores = {k: 0 for k in filas_temp}
    
    linhas = lista_raw.splitlines()
    for linha in linhas:
        linha_limpa = linha.strip()
        
        if not linha_limpa or linha_limpa.startswith("#") or re.match(r'^[—\-\.\:\s\(\)]+$', linha_limpa) or "(espaço" in linha_limpa.lower():
            continue
        
        partes = re.split(r'\s*[-–—:|]\s*', linha_limpa, maxsplit=1)
        if len(partes) >= 2:
            nome = partes[0].strip()
            dado_cru = partes[1].strip()
        else:
            nome = "Contato"
            dado_cru = linha_limpa

        dado_lower = dado_cru.lower()

        def proc_spin(t):
            while "{" in t and "}" in t:
                i = t.rfind("{")
                f = t.find("}", i)
                if f == -1: break
                t = t[:i] + random.choice(t[i+1:f].split("|")) + t[f+1:]
            return t

        msg_v = proc_spin(mensagem)
        msg_json_safe = json.dumps(msg_v)

        # 1. Detecção de WhatsApp
        tel = re.sub(r'\D', '', dado_cru)
        if len(tel) >= 10 and not "http" in dado_lower and not "@" in dado_cru.split(".")[0]:
            contadores["whatsapp"] += 1
            link = f"https://api.whatsapp.com/send?phone={tel}&text={urllib.parse.quote(msg_v)}"
            cls_extra = " proximo-ativo" if contadores["whatsapp"] == 1 else " bloqueado"
            filas_temp["whatsapp"] += f'<div class="item-linha {cls_extra}" data-url="{link}" data-msg={msg_json_safe}><button type="button" onclick=\'dispararItemDirect(this)\' class="btn-item t-wa link-acao"><span class="badge">💬 WhatsApp</span><span class="detalhe">{nome} • {tel}</span></button></div>'

        # 2. Detecção Real de E-mail
        elif "@" in dado_cru and "." in dado_cru and not "http" in dado_lower and not "instagram" in dado_lower and not "tiktok" in dado_lower and not "kwai" in dado_lower and not "facebook" in dado_lower and not "t.me" in dado_lower and not dado_cru.startswith("@"):
            contadores["email"] += 1
            mail = dado_cru.strip()
            link = f"mailto:{mail}?subject={urllib.parse.quote('Contato Importante')}&body={urllib.parse.quote(msg_v)}"
            cls_extra = " proximo-ativo" if contadores["email"] == 1 else " bloqueado"
            filas_temp["email"] += f'<div class="item-linha {cls_extra}" data-url="{link}" data-msg={msg_json_safe}><button type="button" onclick=\'dispararItemDirect(this)\' class="btn-item t-email link-acao"><span class="badge">📧 E-mail</span><span class="detalhe">{nome} • {mail}</span></button></div>'

        # 3. Demais Redes Sociais
        else:
            if "instagram.com" in dado_lower or "insta" in dado_lower:
                user = dado_cru.split("/")[-1].replace("@", "").strip()
            elif "facebook.com" in dado_lower or "fb.com" in dado_lower:
                user = dado_cru.split("/")[-1].strip()
            elif "tiktok.com" in dado_lower:
                user = dado_cru.split("@")[-1].split("/")[0].strip()
            elif "kwai.com" in dado_lower:
                user = dado_cru.split("@")[-1].split("/")[0].strip()
            elif "youtube.com" in dado_lower:
                user = dado_cru.split("@")[-1].split("/")[0].strip()
            elif "t.me" in dado_lower or "telegram" in dado_lower:
                user = dado_cru.split("/")[-1].replace("@", "").strip()
            else:
                user = dado_cru.replace("@", "").strip()

            if user and not user.startswith("http") and len(user) > 1:
                if "tiktok" in dado_lower: r_key = "tiktok"
                elif "kwai" in dado_lower: r_key = "kwai"
                elif "facebook" in dado_lower: r_key = "facebook"
                elif "t.me" in dado_lower or "telegram" in dado_lower: r_key = "telegram"
                else: r_key = "instagram"

                contadores[r_key] += 1

                if r_key == "instagram":
                    link, cls, nome_rede = f"https://www.instagram.com/{user}/", "t-insta", "💬 Instagram"
                elif r_key == "facebook":
                    link, cls, nome_rede = f"https://www.facebook.com/{user}", "t-face", "💬 Facebook"
                elif r_key == "tiktok":
                    link, cls, nome_rede = f"https://www.tiktok.com/@{user}", "t-tk", "💬 TikTok"
                elif r_key == "kwai":
                    link, cls, nome_rede = f"https://m.kwai.com/user/@{user}", "t-kwai", "💬 Kwai"
                elif r_key == "telegram":
                    link, cls, nome_rede = f"https://t.me/{user}", "t-tg", "💬 Telegram"

                cls_extra = " proximo-ativo" if contadores[r_key] == 1 else " bloqueado"
                filas_temp[r_key] += f'<div class="item-linha {cls_extra}" data-url="{link}" data-msg={msg_json_safe}><button type="button" onclick=\'dispararItemDirect(this)\' class="btn-item {cls} link-acao"><span class="badge">{nome_rede}</span><span class="detalhe">{nome} • @{user}</span></button></div>'

    resultado_final = {}
    for k in filas_temp:
        if contadores[k] > 0:
            resultado_final[k] = f'<div class="contador-badge">{contadores[k]} contato(s) na fila inteligente</div>' + filas_temp[k]
        else:
            resultado_final[k] = "<p class='vazio'>Nenhum contato correspondente nesta categoria.</p>"
            
    return resultado_final

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Omni-Social Designer Edition</title>
    <style>
        :root {
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --border-color: #e2e8f0;
            --primary: #6366f1;
            --radius: 16px;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0;
            padding: 12px;
            padding-bottom: 95px;
            -webkit-font-smoothing: antialiased;
        }

        #tela-bloqueio {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #0f172a;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }

        .login-box {
            background: #ffffff;
            padding: 24px;
            border-radius: 16px;
            width: 100%;
            max-width: 360px;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }

        .login-box h3 {
            margin-top: 0;
            color: var(--text-main);
            font-size: 1.2rem;
        }

        .login-box input {
            width: 100%;
            padding: 12px;
            border: 1.5px solid var(--border-color);
            border-radius: 10px;
            box-sizing: border-box;
            font-size: 0.95rem;
            margin-bottom: 10px;
            outline: none;
        }

        .login-box button {
            width: 100%;
            padding: 12px;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 0.95rem;
            cursor: pointer;
            margin-top: 4px;
        }

        .erro-senha {
            color: #dc2626;
            font-size: 0.8rem;
            margin-top: 8px;
            display: none;
        }

        .container {
            max-width: 480px;
            margin: 0 auto;
            background: var(--card-bg);
            padding: 20px;
            border-radius: var(--radius);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        }

        .header-app {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 15px;
        }

        h2 {
            color: var(--text-main);
            font-size: 1.15rem;
            margin: 0;
            font-weight: 800;
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .btn-config-toggle, .btn-termos-toggle {
            background: #f1f5f9;
            border: 1px solid var(--border-color);
            padding: 6px 10px;
            border-radius: 8px;
            font-size: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            color: var(--text-muted);
        }

        .section-box {
            background: #fdfdfd;
            border: 1px solid var(--border-color);
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 16px;
        }

        #painel-config, #painel-termos {
            display: none;
            background: #f8fafc;
            border: 1px dashed var(--primary);
            padding: 14px;
            border-radius: 12px;
            margin-bottom: 16px;
            font-size: 0.8rem;
            line-height: 1.4;
            color: var(--text-muted);
        }

        #painel-termos {
            border-color: #eab308;
            background: #fefce8;
            color: #713f12;
        }

        label {
            font-size: 0.75rem;
            font-weight: 700;
            display: block;
            margin-bottom: 6px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        input[type="text"], input[type="password"], textarea {
            width: 100%;
            padding: 12px;
            border: 1.5px solid var(--border-color);
            border-radius: 10px;
            box-sizing: border-box;
            font-size: 0.9rem;
            background: #ffffff;
            color: var(--text-main);
            outline: none;
            transition: all 0.2s ease;
            margin-bottom: 10px;
        }

        textarea { resize: vertical; height: 100px; }

        .aviso-midia {
            background: #e0f2fe;
            color: #0369a1;
            padding: 12px;
            border-radius: 10px;
            font-size: 0.8rem;
            margin-bottom: 14px;
            border: 1px solid #bae6fd;
            line-height: 1.4;
            display: flex;
            gap: 8px;
            align-items: flex-start;
        }

        .btn {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 10px;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            color: white;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-sizing: border-box;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
        }

        .btn-processar {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        }

        .btn-salvar-cred {
            background: #0f172a;
            padding: 10px;
            font-size: 0.85rem;
            box-shadow: none;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            width: 100%;
        }

        .floating-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(12px);
            border-top: 1px solid var(--border-color);
            padding: 12px;
            display: flex;
            justify-content: center;
            box-sizing: border-box;
            z-index: 999;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
        }

        .btn-flutuante {
            max-width: 480px;
            width: 100%;
            background: linear-gradient(135deg, #16a34a, #15803d);
            color: white;
            border: none;
            padding: 14px;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 800;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 15px rgba(22, 163, 74, 0.35);
        }

        .bloco-rede {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 14px;
            margin-top: 14px;
        }

        .titulo-rede {
            font-weight: 700;
            font-size: 0.9rem;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .contador-badge {
            background: #f1f5f9;
            color: var(--text-muted);
            font-size: 0.7rem;
            padding: 2px 8px;
            border-radius: 20px;
            font-weight: 600;
            margin-bottom: 6px;
            display: inline-block;
        }

        .item-linha {
            margin-top: 8px;
        }

        .btn-item {
            width: 100%;
            border: none;
            padding: 11px 14px;
            border-radius: 10px;
            font-size: 0.85rem;
            font-weight: 600;
            color: white;
            text-decoration: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            text-align: left;
            transition: all 0.2s;
        }

        .badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 0.75rem;
        }

        .detalhe {
            font-weight: 400;
            font-size: 0.8rem;
            opacity: 0.95;
            text-align: right;
        }

        .t-wa { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .t-insta { background: linear-gradient(135deg, #ec4899, #db2777); }
        .t-face { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .t-tk { background: linear-gradient(135deg, #0f172a, #000000); }
        .t-kwai { background: linear-gradient(135deg, #f97316, #ea580c); }
        .t-tg { background: linear-gradient(135deg, #0ea5e9, #0284c7); }
        .t-email { background: linear-gradient(135deg, #ef4444, #dc2626); }

        .bloqueado {
            opacity: 0.4;
            filter: grayscale(80%);
        }

        .bloqueado .btn-item {
            cursor: not-allowed;
            box-shadow: none !important;
        }

        .proximo-ativo {
            animation: pulse-border 1.5s infinite;
        }

        .proximo-ativo .btn-item {
            border: 2px dashed #ffffff !important;
            transform: scale(1.01);
        }

        @keyframes pulse-border {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }

        .btn-enviado .btn-item {
            background: #cbd5e1 !important;
            color: #475569 !important;
            text-decoration: line-through;
            opacity: 0.7;
            box-shadow: none !important;
            transform: none !important;
        }

        .vazio {
            color: var(--text-muted);
            font-size: 0.8rem;
            margin: 4px 0;
            text-align: center;
            font-style: italic;
        }

        .help {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-bottom: 8px;
        }

        #loading-indicator {
            display: none;
            text-align: center;
            font-size: 0.8rem;
            color: var(--primary);
            margin-top: 6px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <!-- TELA DE LOGIN COM USUÁRIO E SENHA -->
    <div id="tela-bloqueio">
        <div class="login-box">
            <h3>🔒 Acesso Restrito</h3>
            <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 14px;">Entre com suas credenciais:</p>
            <input type="text" id="input-usuario" placeholder="Usuário" autocomplete="off">
            <input type="password" id="input-senha" placeholder="Senha" onkeypress="if(event.key === 'Enter') verificarLogin()">
            <button type="button" onclick="verificarLogin()">Entrar</button>
            <div id="erro-senha" class="erro-senha">Usuário ou senha incorretos!</div>
        </div>
    </div>

    <div class="container">
        <div class="header-app">
            <h2><span>✨</span> Omni-Social</h2>
            <div style="display: flex; gap: 6px;">
                <button type="button" onclick="alternarPainelTermos()" class="btn-termos-toggle">📜 Termos</button>
                <button type="button" onclick="alternarPainelConfig()" class="btn-config-toggle">⚙️ Acesso</button>
            </div>
        </div>
        
        <!-- TERMOS DE USO E ESPECIFICAÇÕES DO PROGRAMA -->
        <div id="painel-termos">
            <strong>⚠️ Termos de Uso e Diretrizes de Operação:</strong><br>
            1. <b>Natureza da Ferramenta:</b> Este software funciona como um organizador e disparador manual assistido por links diretos. Ele não realiza automação oculta ou robótica em servidores de terceiros.<br>
            2. <b>Conformidade e Spam:</b> O usuário é o único responsável pelas listas inseridas. O envio em massa para contatos frios ou desconhecidos pode resultar em penalidades ou banimento nas plataformas oficiais (WhatsApp, Instagram, etc.).<br>
            3. <b>Boas Práticas:</b> Recomendamos o envio exclusivo para leads engajados ou clientes que autorizaram o contato comercial.
        </div>

        <!-- PAINEL PARA ALTERAR CREDENCIAIS -->
        <div id="painel-config">
            <label>Alterar Dados de Acesso</label>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">Defina um novo usuário e senha e clique em salvar.</div>
            <input type="text" id="novo-usuario" placeholder="Novo Usuário" value="USER_PLACEHOLDER">
            <input type="text" id="nova-senha" placeholder="Nova Senha" value="SENHA_PLACEHOLDER">
            <button type="button" onclick="salvarNovasCredenciais()" class="btn-salvar-cred">Salvar Nova Senha / Usuário</button>
        </div>

        <form id="form-disparo">
            <div class="section-box">
                <div class="aviso-midia">
                    <span>⚡</span>
                    <div><b>Fila Inteligente:</b> Ao voltar do WhatsApp, toque no botão verde embaixo para disparar o próximo instantaneamente!</div>
                </div>

                <label>Lista Global de Contatos</label>
                <div class="help">Cole sua lista mista (Nomes, telefones e links sociais).</div>
                <textarea name="lista_contatos" placeholder="João Silva - +55 (11) 98765-4321&#10;Maria Souza | (5511977778888)" required>LISTA_PLACEHOLDER</textarea>
                
                <label style="margin-top: 8px;">Mensagem / Legenda Padrão (Spintax)</label>
                <textarea name="mensagem" style="height: 70px;" placeholder="{Oi|Olá}, confira nosso material...">MSG_PLACEHOLDER</textarea>
                
                <button type="button" onclick="enviarDados()" class="btn btn-processar">
                    <span>🚀</span> Processar Todas as Redes
                </button>
                <div id="loading-indicator">Processando contatos na fila...</div>
            </div>
        </form>

        <!-- WHATSAPP -->
        <div class="bloco-rede">
            <div class="titulo-rede" style="color: #16a34a;"><span>🟢 WhatsApp</span></div>
            <div id="res-whatsapp">RES_WHATSAPP</div>
        </div>

        <!-- INSTAGRAM -->
        <div class="bloco-rede">
            <div class="titulo-rede" style="color: #db2777;"><span>🟣 Instagram</span></div>
            <div id="res-instagram">RES_INSTAGRAM</div>
        </div>

        <!-- FACEBOOK -->
        <div class="bloco-rede">
            <div class="titulo-rede" style="color: #2563eb;"><span>🔵 Facebook</span></div>
            <div id="res-facebook">RES_FACEBOOK</div>
        </div>

        <!-- TIKTOK -->
        <div class="bloco-rede">
            <div class="titulo-rede" style="color: #000000;"><span>⬛ TikTok</span></div>
            <div id="res-tiktok">RES_TIKTOK</div>
        </div>

        <!-- KWAI -->
        <div class="bloco-rede">
            <div class="titulo-rede" style="color: #ea580c;"><span>🟠 Kwai</span></div>
            <div id="res-kwai">RES_KWAI</div>
        </div>

        <!-- TELEGRAM -->
        <div class="bloco-rede">
            <div class="titulo-rede" style="color: #0284c7;"><span>🔵 Telegram</span></div>
            <div id="res-telegram">RES_TELEGRAM</div>
        </div>

        <!-- E-MAIL -->
        <div class="bloco-rede">
            <div class="titulo-rede" style="color: #dc2626;"><span>📧 E-mail</span></div>
            <div id="res-email">RES_EMAIL</div>
        </div>
    </div>

    <!-- Barra Flutuante de Gatilho Direto no Rodapé -->
    <div class="floating-bar">
        <button type="button" onclick="dispararProximoGeral()" class="btn-flutuante">
            <span>⚡</span> Disparar Próximo da Fila
        </button>
    </div>

    <script>
        const USER_CORRETO = "USER_PLACEHOLDER";
        const SENHA_CORRETA = "SENHA_PLACEHOLDER";

        // Verifica se já está logado na sessão atual do navegador
        window.addEventListener('DOMContentLoaded', (event) => {
            if (sessionStorage.getItem('omni_logado') === 'true') {
                document.getElementById('tela-bloqueio').style.display = 'none';
            }
        });

        function verificarLogin() {
            let uDig = document.getElementById('input-usuario').value;
            let sDig = document.getElementById('input-senha').value;
            if (uDig === USER_CORRETO && sDig === SENHA_CORRETA) {
                sessionStorage.setItem('omni_logado', 'true');
                document.getElementById('tela-bloqueio').style.display = 'none';
            } else {
                let err = document.getElementById('erro-senha');
                err.style.display = 'block';
                document.getElementById('input-senha').value = '';
            }
        }

        function alternarPainelConfig() {
            let p = document.getElementById('painel-config');
            let t = document.getElementById('painel-termos');
            t.style.display = 'none';
            p.style.display = p.style.display === 'block' ? 'none' : 'block';
        }

        function alternarPainelTermos() {
            let t = document.getElementById('painel-termos');
            let p = document.getElementById('painel-config');
            p.style.display = 'none';
            t.style.display = t.style.display === 'block' ? 'none' : 'block';
        }

        function salvarNovasCredenciais() {
            let novoU = document.getElementById('novo-usuario').value.trim();
            let novoS = document.getElementById('nova-senha').value.trim();

            if (!novoU || !newoS) {
                alert('Preencha um usuário e senha válidos!');
                return;
            }

            let form = document.getElementById('form-disparo');
            let formData = new FormData(form);
            formData.append('novo_usuario', novoU);
            formData.append('nova_senha', novoS);

            fetch('/processar_ajax', {
                method: 'POST',
                body: new URLSearchParams(formData)
            })
            .then(response => response.json())
            .then(data => {
                alert('Credenciais atualizadas com sucesso!');
                location.reload();
            })
            .catch(error => {
                alert('Erro ao salvar credenciais.');
            });
        }

        function executarAbertura(url, mensagem, wrapperEl) {
            navigator.clipboard.writeText(mensagem).then(() => {
                console.log("Mensagem copiada!");
            }).catch(err => {
                console.log("Erro ao copiar.");
            });

            window.open(url, '_blank');

            wrapperEl.classList.remove('proximo-ativo');
            wrapperEl.classList.add('btn-enviado');
            let det = wrapperEl.querySelector('.detalhe');
            if (det) det.innerText = "✓ Concluído";

            let todosItens = document.querySelectorAll('.item-linha');
            for (let item of todosItens) {
                if (item.classList.contains('bloqueado')) {
                    item.classList.remove('bloqueado');
                    item.classList.add('proximo-ativo');
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    break;
                }
            }
        }

        function dispararItemDirect(btn) {
            let wrapper = btn.closest('.item-linha');
            if (wrapper.classList.contains('bloqueado') || wrapper.classList.contains('btn-enviado')) return;
            let url = wrapper.getAttribute('data-url');
            let msg = wrapper.getAttribute('data-msg');
            executarAbertura(url, msg, wrapper);
        }

        function dispararProximoGeral() {
            let proximoAtivo = document.querySelector('.item-linha.proximo-ativo');
            if (proximoAtivo) {
                let url = proximoAtivo.getAttribute('data-url');
                let msg = proximoAtivo.getAttribute('data-msg');
                executarAbertura(url, msg, proximoAtivo);
            } else {
                alert('Parabéns! Todos os contatos da lista já foram concluídos.');
            }
        }

        function enviarDados() {
            let form = document.getElementById('form-disparo');
            let formData = new FormData(form);

            let loader = document.getElementById('loading-indicator');
            loader.style.display = 'block';

            fetch('/processar_ajax', {
                method: 'POST',
                body: new URLSearchParams(formData)
            })
            .then(response => response.json())
            .then(data => {
                loader.style.display = 'none';
                document.getElementById('res-whatsapp').innerHTML = data.whatsapp;
                document.getElementById('res-instagram').innerHTML = data.instagram;
                document.getElementById('res-facebook').innerHTML = data.facebook;
                document.getElementById('res-tiktok').innerHTML = data.tiktok;
                document.getElementById('res-kwai').innerHTML = data.kwai;
                document.getElementById('res-telegram').innerHTML = data.telegram;
                document.getElementById('res-email').innerHTML = data.email;
            })
            .catch(error => {
                loader.style.display = 'none';
                alert('Erro ao processar dados.');
            });
        }
    </script>
</body>
</html>
"""

class CustomTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/'):
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            
            dados = carregar_dados()
            res_iniciais = processar_dados_html(dados["lista"], dados["msg"])
            
            pagina = HTML_TEMPLATE.replace("LISTA_PLACEHOLDER", dados["lista"])
            pagina = pagina.replace("MSG_PLACEHOLDER", dados["msg"])
            pagina = pagina.replace("USER_PLACEHOLDER", dados["usuario"])
            pagina = pagina.replace("SENHA_PLACEHOLDER", dados["senha"])

            pagina = pagina.replace("RES_WHATSAPP", res_iniciais["whatsapp"])
            pagina = pagina.replace("RES_INSTAGRAM", res_iniciais["instagram"])
            pagina = pagina.replace("RES_FACEBOOK", res_iniciais["facebook"])
            pagina = pagina.replace("RES_TIKTOK", res_iniciais["tiktok"])
            pagina = pagina.replace("RES_KWAI", res_iniciais["kwai"])
            pagina = pagina.replace("RES_TELEGRAM", res_iniciais["telegram"])
            pagina = pagina.replace("RES_EMAIL", res_iniciais["email"])
            
            self.wfile.write(pagina.encode("utf-8"))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/processar_ajax':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('utf-8')
            params = urllib.parse.parse_qs(post_data)
            
            dados_atuais = carregar_dados()
            
            novo_u = params.get('novo_usuario', [dados_atuais["usuario"]])[0].strip()
            novo_s = params.get('nova_senha', [dados_atuais["senha"]])[0].strip()
            
            lista_raw = params.get('lista_contatos', [dados_atuais["lista"]])[0]
            mensagem = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', params.get('mensagem', [dados_atuais["msg"]])[0]).strip()
            
            salvar_dados(novo_u, novo_s, lista_raw, mensagem)
            resultados = processar_dados_html(lista_raw, mensagem)
            
            resposta_json = json.dumps(resultados)
            self.send_response(200)
            self.send_header("Content-type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(resposta_json.encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def iniciar_servidor():
    with CustomTCPServer(("", PORT), MyHandler) as httpd:
        print(f"[Omni-Social Designer Edition] Rodando na porta {PORT}...")
        httpd.serve_forever()

if __name__ == "__main__":
    servidor_thread = threading.Thread(target=iniciar_servidor, daemon=True)
    servidor_thread.start()
    time.sleep(1)
    print(f"Abra no navegador do celular: http://localhost:{PORT}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
