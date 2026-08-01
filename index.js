Const {
    Default: makeWASocket,
    UseMultiFileAuthState,
    DisconnectReason,
    FetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

Const P = require("pino")
Const fs = require("fs")
Const express = require("express")

Const app = express()
Const comandosPath = "./comandos.json"
Const configPath = "./config_rpg.json"

// Função utilitária para dar um tempo entre mensagens simultâneas
Const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// =========================
// UTILITÁRIOS
// =========================

Function normalizarTexto(texto) {
    Return texto ? Texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : ""
}

If (!fs.existsSync(comandosPath)) fs.writeFileSync(comandosPath, JSON.stringify({}, null, 2))
If (!fs.existsSync(configPath)) {
    Fs.writeFileSync(configPath, JSON.stringify({
        Recompensa1: "Não definida",
        Recompensa2: "Não definida",
        GrupoPermitido: "",
        PalavraChave: ""
    }, null, 2))
}

Function carregarComandos() { try { return JSON.parse(fs.readFileSync(comandosPath)) } catch { return {} } }
Function salvarComandos(data) { fs.writeFileSync(comandosPath, JSON.stringify(data, null, 2)) }
Function carregarConfig() { return JSON.parse(fs.readFileSync(configPath)) }
Function salvarConfig(data) { fs.writeFileSync(configPath, JSON.stringify(data, null, 2)) }

// =========================
// INICIAR BOT
// =========================

Async function iniciarBot() {
    Const { state, saveCreds } = await useMultiFileAuthState("auth")
    Const { version } = await fetchLatestBaileysVersion()

    Const sock = makeWASocket({
        Version,
        Auth: state,
        Logger: P({ level: "silent" }),
        Browser: ["Render", "Chrome", "1.0"]
    })

    Sock.ev.on("creds.update", saveCreds)

    Sock.ev.on("connection.update", (update) => {
        Const { connection, lastDisconnect } = update
        If (connection === "connecting") console.log("🔄 Conectando ao WhatsApp...")
        If (connection === "open") console.log("✅ Bot Conectado com Sucesso!")
        If (connection === "close") {
            Const motivo = lastDisconnect?.error?.output?.statusCode
            If (motivo !== DisconnectReason.loggedOut) {
                Console.log("⚠️ Conexão perdida. Reconectando...")
                IniciarBot()
            } else {
                Console.log("❌ Sessão encerrada. Delete a pasta 'auth' e escaneie o QR Code novamente.")
            }
        }
    })

    Sock.ev.on("messages.upsert", async ({ messages }) => {
        Const msg = messages[0]
        If (!msg.message || msg.key.fromMe) return

        Const from = msg.key.remoteJid
        Const texto = msg.message?.conversation ||
                      Msg.message?.extendedTextMessage?.text ||
                      Msg.message?.imageMessage?.caption ||
                      Msg.message?.videoMessage?.caption

        If (!texto || typeof texto !== "string") return

        Const textoNormalizado = normalizarTexto(texto)
        Const comandos = carregarComandos()
        Const config = carregarConfig()

        // =========================
        // PING
        // =========================
        If (textoNormalizado === "!ping") {
            Const inicio = Date.now()
            Let gruposCount = 0
            Try {
                Const chats = await sock.groupFetchAllParticipating()
                GruposCount = Object.keys(chats).length
            } catch { gruposCount = 0 }

            Const ping = Date.now() - inicio
            Return sock.sendMessage(from, {
                Text: `🏓 *Pong!*\n\n⚡ Velocidade: ${ping}ms\n👥 Grupos: ${gruposCount}\n🕒 Horário: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
            })
        }

        // =========================
        // CONFIGURAÇÃO RPG
        // =========================
        If (texto.startsWith("!setpremios ")) {
            Const partes = texto.slice(12).split("|")
            If (partes.length < 2) return sock.sendMessage(from, { text: "❌ Use: !setpremios Rec1 | Rec2" })
            Config.recompensa1 = partes[0].trim()
            Config.recompensa2 = partes[1].trim()
            SalvarConfig(config)
            Return sock.sendMessage(from, { text: "✅ Recompensas salvas com sucesso!" })
        }

        If (texto.startsWith("$CriaPalavra|")) {
            Const palavra = texto.split("|")[1]
            If (!palavra) return
            Config.palavraChave = normalizarTexto(palavra.trim())
            SalvarConfig(config)
            Return sock.sendMessage(from, { text: `🔑 Palavra-chave definida: ${palavra.trim()}` })
        }

        If (texto === "!setgrupo") {
            Config.grupoPermitido = from
            SalvarConfig(config)
            Return sock.sendMessage(from, { text: "📍 Grupo oficial do RPG definido aqui!" })
        }

        If (texto === "!painel") {
            Return sock.sendMessage(from, { text: `⚙️ *PAINEL RPG*\n\n📍 Grupo: ${config.grupoPermitido || "Não definido"}\n🔑 Palavra: ${config.palavraChave || "Não definida"}\n🎁 Rec 1: ${config.recompensa1}\n🎁 Rec 2: ${config.recompensa2}` })
        }

        // =========================
        // TODAS AS QUESTS (LISTA COMPLETA)
        // =========================
        If (textoNormalizado === "$quest") {
            Const quests = [
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n❓ Pergunta\nQual é seu anime favorito?\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n❓ Pergunta\nQual Sua/Seu protagonista favorito?\n\n➖✦ ➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n❓ Pergunta\nQual A Diferença Entre Falha E Ilusão?\n\n ➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n❓ Pergunta\nQual a diferença Entre Golpes Avançado É Especial?\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n⚔️ Desafio\nDe bom dia/ tarde/Noite No Grupo Da Sua Raça Ou Classe\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n🎁Recompensa\nVOCÊ GANHOU:100🪙\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n🎁Recompensa\nVOCÊ GANHOU:200🪙\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n🎁Recompensa\nVOCÊ GANHOU:300🪙\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n🎁Recompensa\nVOCÊ GANHOU:400🪙\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n🎁Recompensa\nVOCÊ GANHOU:500🪙\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n🎁Recompensa\nVOCÊ GANHOU:10💎\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n🎁Recompensa\nVOCÊ GANHOU:20💎\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n🎁Recompensa\nVOCÊ GANHOU:30💎\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n❓ Pergunta\nQual habilidade pode matar o adversário de uma só vez?\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n❓ Pergunta\nQual a diferença entre ataques é golpes?\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n❓ Pergunta\nEntre paralisia com dano é paralisia sem dano qual vence?\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n⚔️ Desafio\nVá no chat Global é deseje Bom dia/Boa tarde/Boa noite\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n⚔️ Desafio\nEm uma batalha SR quem ganha: habilidade ou golpe?\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n⚔️ Desafio\nDesafie seu chefe de raça/mestre pra um duelo SR\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n❓ Pergunta\nOq você está achando do sistema de quest?\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n❓ Pergunta\nVocê está gostando do RPG?\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,
                `➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖\n📜 QUEST GEEKPOINT\n\n❓ Pergunta\nOq vc acha que poderia mudar no RPG?\n\n➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`
            ];
            Const sorteada = quests[Math.floor(Math.random() * quests.length)];
            Return sock.sendMessage(from, { text: sorteada });
        }

        // =========================
        // GANHAR TESOURO (MARCAÇÃO)
        // =========================
        Const botNumero = sock.user.id.split(":")[0];
        Const mencaoBot = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.some(m => m.includes(botNumero));

        If (mencaoBot && config.palavraChave && textoNormalizado.includes(config.palavraChave)) {
            If (config.grupoPermitido && from !== config.grupoPermitido) return;

            Const molde = `*➖ ᯓ 👾❝ Geek'Point RPG ❞🎯 ᯓ ➖*\n\n*👾•'- Caça ao Tesouro -'•🎯*\n\nVocê ganhou ${config.recompensa1}\nAgora Responda a Pergunta Correta para um Bônus a Mais de: ${config.recompensa2}\nQual o Nome do Povo que Cuidava Do Grande Sino de Ouro que foi Parar Em Skypiea ?\n\n*➖ ᯓ 👾❝ Geek'Point RPG ❞🎯 ᯓ ➖*`;
            Return sock.sendMessage(from, { text: molde });
        }

        // =========================
        // COMANDOS DINÂMICOS
        // =========================
        
        // Criar comando com !addcmd
        If (texto.startsWith("!addcmd ")) {
            Const dados = texto.slice(8).trim();
            
            // Aceita tanto "|" quanto " " como separador do nome e conteúdo
            Let nome = "";
            Let resposta = "";

            If (dados.includes("|")) {
                Const partes = dados.split("|");
                Nome = partes[0].trim();
                Resposta = partes.slice(1).join("|").trim();
            } else {
                Const primeiraEspaco = dados.indexOf(" ");
                If (primeiraEspaco === -1) {
                    Return sock.sendMessage(from, { text: "❌ Use: !addcmd <nome> <resposta ou opções com ~>" });
                }
                Nome = dados.slice(0, primeiraEspaco).trim();
                Resposta = dados.slice(primeiraEspaco).trim();
            }

            If (!nome || !resposta) {
                Return sock.sendMessage(from, { text: "❌ Formato inválido! Exemplo: !addcmd mensagem1 oi~Olá~Tudo bem" });
            }

            Comandos[normalizarTexto(nome)] = resposta;
            SalvarComandos(comandos);
            Return sock.sendMessage(from, { text: `✅ Comando *${nome}* criado com sucesso!` });
        }

        // Deletar comando com !delcmd
        If (texto.startsWith("!delcmd ")) {
            Const nome = normalizarTexto(texto.slice(8).trim());
            If (!comandos[nome]) return sock.sendMessage(from, { text: "❌ Esse comando não existe." });
            Delete comandos[nome];
            SalvarComandos(comandos);
            Return sock.sendMessage(from, { text: `🗑️ Comando apagado!` });
        }

        // Execução dos comandos dinâmicos
        If (comandos[textoNormalizado]) {
            Let respostaCompleta = comandos[textoNormalizado];
            
            // Lógica para sorteio aleatório usando "~"
            If (respostaCompleta.includes("~")) {
                Const opcoes = respostaCompleta.split("~").map(opt => opt.trim()).filter(Boolean);
                RespostaCompleta = opcoes[Math.floor(Math.random() * opcoes.length)];
            }

            // Lógica para detectar "randow MIN%MAX"
            Const regexRandow = /randow\s+(\d+)%(\d+)/gi;
            RespostaCompleta = respostaCompleta.replace(regexRandow, (match, min, max) => {
                Const minimo = parseInt(min);
                Const maximo = parseInt(max);
                Return Math.floor(Math.random() * (maximo - minimo + 1)) + minimo;
            });

            // Lógica de envio sequencial com "\"
            If (respostaCompleta.includes("\\")) {
                Const partes = respostaCompleta.split("\\");
                For (const parte of partes) {
                    If (parte.trim()) {
                        Await sock.sendMessage(from, { text: parte.trim() });
                        Await delay(1500); 
                    }
                }
                Return;
            } else {
                Return sock.sendMessage(from, { text: respostaCompleta });
            }
        }
    })
}

IniciarBot()

App.get("/", (req, res) => res.send("Bot RPG Online e Operante!"))
Const PORT = process.env.PORT || 3000
App.listen(PORT, () => console.log(`🚀 Servidor Express rodando na porta ${PORT}`))
               
