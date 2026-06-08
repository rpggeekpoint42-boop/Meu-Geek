const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const P = require("pino")
const fs = require("fs")
const express = require("express")

const app = express()
const comandosPath = "./comandos.json"
const configPath = "./config_rpg.json"

// Função utilitária para dar um tempo entre mensagens simultâneas
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// =========================
// UTILITÁRIOS
// =========================

function normalizarTexto(texto) {
    return texto ? texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : ""
}

if (!fs.existsSync(comandosPath)) fs.writeFileSync(comandosPath, JSON.stringify({}, null, 2))
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
        recompensa1: "Não definida",
        recompensa2: "Não definida",
        grupoPermitido: "",
        palavraChave: ""
    }, null, 2))
}

function carregarComandos() { try { return JSON.parse(fs.readFileSync(comandosPath)) } catch { return {} } }
function salvarComandos(data) { fs.writeFileSync(comandosPath, JSON.stringify(data, null, 2)) }
function carregarConfig() { return JSON.parse(fs.readFileSync(configPath)) }
function salvarConfig(data) { fs.writeFileSync(configPath, JSON.stringify(data, null, 2)) }

// =========================
// INICIAR BOT
// =========================

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth")
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: "silent" }),
        browser: ["Render", "Chrome", "1.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update
        if (connection === "connecting") console.log("🔄 Conectando ao WhatsApp...")
        if (connection === "open") console.log("✅ Bot Conectado com Sucesso!")
        if (connection === "close") {
            const motivo = lastDisconnect?.error?.output?.statusCode
            if (motivo !== DisconnectReason.loggedOut) {
                console.log("⚠️ Conexão perdida. Reconectando...")
                iniciarBot()
            } else {
                console.log("❌ Sessão encerrada. Delete a pasta 'auth' e escaneie o QR Code novamente.")
            }
        }
    })

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        const from = msg.key.remoteJid
        const texto = msg.message?.conversation ||
                      msg.message?.extendedTextMessage?.text ||
                      msg.message?.imageMessage?.caption ||
                      msg.message?.videoMessage?.caption

        if (!texto || typeof texto !== "string") return

        const textoNormalizado = normalizarTexto(texto)
        const comandos = carregarComandos()
        const config = carregarConfig()

        // =========================
        // PING
        // =========================
        if (textoNormalizado === "!ping") {
            const inicio = Date.now()
            let gruposCount = 0
            try {
                const chats = await sock.groupFetchAllParticipating()
                gruposCount = Object.keys(chats).length
            } catch { gruposCount = 0 }

            const ping = Date.now() - inicio
            return sock.sendMessage(from, {
                text: `🏓 *Pong!*\n\n⚡ Velocidade: ${ping}ms\n👥 Grupos: ${gruposCount}\n🕒 Horário: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
            })
        }

        // =========================
        // CONFIGURAÇÃO RPG
        // =========================
        if (texto.startsWith("!setpremios ")) {
            const partes = texto.slice(12).split("|")
            if (partes.length < 2) return sock.sendMessage(from, { text: "❌ Use: !setpremios Rec1 | Rec2" })
            config.recompensa1 = partes[0].trim()
            config.recompensa2 = partes[1].trim()
            salvarConfig(config)
            return sock.sendMessage(from, { text: "✅ Recompensas salvas com sucesso!" })
        }

        if (texto.startsWith("$CriaPalavra|")) {
            const palavra = texto.split("|")[1]
            if (!palavra) return
            config.palavraChave = normalizarTexto(palavra.trim())
            salvarConfig(config)
            return sock.sendMessage(from, { text: `🔑 Palavra-chave definida: ${palavra.trim()}` })
        }

        if (texto === "!setgrupo") {
            config.grupoPermitido = from
            salvarConfig(config)
            return sock.sendMessage(from, { text: "📍 Grupo oficial do RPG definido aqui!" })
        }

        if (texto === "!painel") {
            return sock.sendMessage(from, { text: `⚙️ *PAINEL RPG*\n\n📍 Grupo: ${config.grupoPermitido || "Não definido"}\n🔑 Palavra: ${config.palavraChave || "Não definida"}\n🎁 Rec 1: ${config.recompensa1}\n🎁 Rec 2: ${config.recompensa2}` })
        }

        // =========================
        // TODAS AS QUESTS (LISTA COMPLETA)
        // =========================
        if (textoNormalizado === "$quest") {
            const quests = [
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
            const sorteada = quests[Math.floor(Math.random() * quests.length)];
            return sock.sendMessage(from, { text: sorteada });
        }

        // =========================
        // GANHAR TESOURO (MARCAÇÃO)
        // =========================
        const botNumero = sock.user.id.split(":")[0];
        const mencaoBot = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.some(m => m.includes(botNumero));

        if (mencaoBot && config.palavraChave && textoNormalizado.includes(config.palavraChave)) {
            if (config.grupoPermitido && from !== config.grupoPermitido) return;

            const molde = `*➖ ᯓ 👾❝ Geek'Point RPG ❞🎯 ᯓ ➖*\n\n*👾•'- Caça ao Tesouro -'•🎯*\n\nVocê ganhou ${config.recompensa1}\nAgora Responda a Pergunta Correta para um Bônus a Mais de: ${config.recompensa2}\nQual o Nome do Povo que Cuidava Do Grande Sino de Ouro que foi Parar Em Skypiea ?\n\n*➖ ᯓ 👾❝ Geek'Point RPG ❞🎯 ᯓ ➖*`;
            return sock.sendMessage(from, { text: molde });
        }

        // =========================
        // COMANDOS DINÂMICOS
        // =========================
        if (texto.startsWith("!criar ")) {
            const dados = texto.slice(7);
            if (!dados.includes("|")) return sock.sendMessage(from, { text: "❌ Use: !criar nome|resposta" });
            const [nome, resposta] = dados.split("|");
            comandos[normalizarTexto(nome.trim())] = resposta.trim();
            salvarComandos(comandos);
            return sock.sendMessage(from, { text: `✅ Comando *!${nome.trim()}* criado com sucesso!` });
        }

        if (texto.startsWith("!apagar ")) {
            const nome = normalizarTexto(texto.slice(8).trim());
            if (!comandos[nome]) return sock.sendMessage(from, { text: "❌ Esse comando não existe." });
            delete comandos[nome];
            salvarComandos(comandos);
            return sock.sendMessage(from, { text: `🗑️ Comando apagado!` });
        }

        // Execução dos comandos dinâmicos (Verifica se possui múltiplas mensagens ou números aleatórios)
        if (comandos[textoNormalizado]) {
            let respostaCompleta = comandos[textoNormalizado];
            
            // Lógica para detectar "randow MIN%MAX" e gerar o número dinamicamente
            const regexRandow = /randow\s+(\d+)%(\d+)/gi;
            respostaCompleta = respostaCompleta.replace(regexRandow, (match, min, max) => {
                const minimo = parseInt(min);
                const maximo = parseInt(max);
                // Gera o número aleatório incluindo os limites fornecidos
                return Math.floor(Math.random() * (maximo - minimo + 1)) + minimo;
            });

            if (respostaCompleta.includes("//")) {
                const partes = respostaCompleta.split("//");
                for (const parte of partes) {
                    if (parte.trim()) {
                        await sock.sendMessage(from, { text: parte.trim() });
                        await delay(1500); 
                    }
                }
                return;
            } else {
                return sock.sendMessage(from, { text: respostaCompleta });
            }
        }
    })
}

iniciarBot()

app.get("/", (req, res) => res.send("Bot RPG Online e Operante!"))
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 Servidor Express rodando na porta ${PORT}`))

