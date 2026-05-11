const {
default: makeWASocket,
useMultiFileAuthState,
DisconnectReason,
fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const P = require("pino")
const fs = require("fs")

function normalizarTexto(texto) {
return texto
.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "")
}

const comandosPath = "./comandos.json"

// =========================
// CRIAR ARQUIVO DE COMANDOS
// =========================

if (!fs.existsSync(comandosPath)) {
fs.writeFileSync(comandosPath, JSON.stringify({}, null, 2))
}

// =========================
// CARREGAR COMANDOS
// =========================

function carregarComandos() {
try {
return JSON.parse(fs.readFileSync(comandosPath))
} catch {
return {}
}
}

// =========================
// SALVAR COMANDOS
// =========================

function salvarComandos(data) {
fs.writeFileSync(comandosPath, JSON.stringify(data, null, 2))
}

// =========================
// INICIAR BOT
// =========================

async function iniciarBot() {

const { state, saveCreds } =
await useMultiFileAuthState("auth")

const { version } =
await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
logger: P({ level: "silent" }),
browser: ["Render", "Chrome", "1.0"]
})

sock.ev.on("creds.update", saveCreds)

// =========================
// CONEXÃO
// =========================

sock.ev.on("connection.update", async (update) => {

const {
connection,
lastDisconnect
} = update

if (connection === "connecting") {
console.log("🔄 Conectando...")
}

if (connection === "open") {
console.log("✅ Conectado!")
}

if (connection === "close") {

const motivo =
lastDisconnect?.error?.output?.statusCode

console.log("❌ Conexão fechada:", motivo)

if (motivo !== DisconnectReason.loggedOut) {
iniciarBot()
}
}

})

// =========================
// MENSAGENS
// =========================

sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]

if (!msg.message) return

const from = msg.key.remoteJid

const texto =
msg.message?.conversation ||
msg.message?.extendedTextMessage?.text ||
msg.message?.imageMessage?.caption ||
msg.message?.videoMessage?.caption

console.log("CHAT:", from)
console.log("MSG:", texto)

if (!texto || typeof texto !== "string") return

const comandos = carregarComandos()

// =========================
// PING
// =========================

if (texto === "!ping") {

const inicio = Date.now()

let grupos = 0

try {
const chats = await sock.groupFetchAllParticipating()
grupos = Object.keys(chats).length
} catch {
grupos = 0
}

const comandosTotal =
Object.keys(comandos).length

const horario = new Date().toLocaleString("pt-BR", {
timeZone: "America/Sao_Paulo"
})

const ping = Date.now() - inicio

return sock.sendMessage(from, {
text:

`🏓 Pong!

⚡ Velocidade: ${ping}ms
👥 Grupos: ${grupos}
📜 Comandos: ${comandosTotal}
🕒 Horário Brasília:
${horario}`
})
}

// =========================
// CRIAR COMANDO
// !criar oi|Olá
// =========================

if (texto.startsWith("!criar ")) {

const dados = texto.slice(8)

if (!dados.includes("|")) {
return sock.sendMessage(from, {
text: "Use: !criar nome|resposta"
})
}

const [nome, resposta] = dados.split("|")

comandos[normalizarTexto(nome.trim())] = resposta.trim()

salvarComandos(comandos)

return sock.sendMessage(from, {
text: `✅ Comando ${nome} criado!`
})
}

// =========================
// APAGAR COMANDO
// !apagar oi
// =========================

if (texto.startsWith("!apagar ")) {

const nome = texto.slice(9).trim()

if (!comandos[nome]) {
return sock.sendMessage(from, {
text: "❌ Esse comando não existe"
})
}

delete comandos[nome]

salvarComandos(comandos)

return sock.sendMessage(from, {
text: `🗑️ Comando ${nome} apagado!`
})
}

// =========================
// LISTAR COMANDOS
// =========================

if (texto === "!comandos") {

const lista = Object.keys(comandos)

if (lista.length === 0) {
return sock.sendMessage(from, {
text: "Nenhum comando criado"
})
}

return sock.sendMessage(from, {
text:
"📜 Comandos:\n\n" +
lista.map(c => `• ${c}`).join("\n")
})
}

// =========================
// MARCAR SILÊNCIO
// =========================

if (texto.startsWith("$All ")) {

if (!from.endsWith("@g.us")) {
return sock.sendMessage(from, {
text: "❌ Esse comando só funciona em grupos"
})
}

const grupo = await sock.groupMetadata(from)

const participante = grupo.participants.find(
p => p.id === msg.key.participant
)

const isAdmin =
participante?.admin === "admin" ||
participante?.admin === "superadmin"

if (!isAdmin) {
return sock.sendMessage(from, {
text: "❌ Apenas administradores podem usar esse comando"
})
}

const mensagem = texto.slice(5)

const membros = grupo.participants
.map(p => p.id)

return sock.sendMessage(from, {
text: mensagem,
mentions: membros
})
}

// QUEST
if (texto === "$Quest") {

const quests = [
`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

❓ Pergunta

Qual é seu anime favorito?

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

❓ Pergunta

Qual Sua/Seu protagonista favorito?

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

❓ Pergunta

Qual A Diferença Entre Falha E Ilusão?

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

❓ Pergunta

Qual a diferença Entre Golpes Avançado É Especial?

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

⚔️ Desafio

De bom dia/ tarde/Noite No Grupo Da Sua Raça Ou Classe

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

🎁Recompensa

VOCÊ GANHOU:100🪙

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

🎁Recompensa

VOCÊ GANHOU:200🪙

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

🎁Recompensa

VOCÊ GANHOU:300🪙

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

🎁Recompensa

VOCÊ GANHOU:400🪙

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

🎁Recompensa

VOCÊ GANHOU:500🪙

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

🎁Recompensa

VOCÊ GANHOU:10💎

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

🎁Recompensa

VOCÊ GANHOU:20💎

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

🎁Recompensa

VOCÊ GANHOU:30💎

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

❓ Pergunta

Qual habilidade pode matar o adversário de uma só vez?

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

❓ Pergunta

Qual a diferença entre ataques é golpes?

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

❓ Pergunta

Entre paralisia com dano é paralisia sem dano qual vence?

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

⚔️ Desafio

Vá no chat Global é deseje Bom dia/Boa tarde/Boa noite

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

⚔️ Desafio

Em uma batalha SR quem ganha: habilidade ou golpe?

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

⚔️ Desafio

Desafie seu chefe de raça/mestre pra um duelo SR

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

❓ Pergunta

Oq você está achando do sistema de quest?

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

❓ Pergunta

Você está gostando do RPG?

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`,

`➖✦➖✦➖ ᯓ ᎒•' 👾'•᎒ ᯓ ➖✦➖✦➖
📜 QUEST GEEKPOINT

❓ Pergunta

Oq vc acha que poderia mudar no RPG?

➖✦➖✦➖ ᯓ ᎒•'🎯'•᎒ ᯓ ➖✦➖✦➖`

]

const sorteada = quests[Math.floor(Math.random() * quests.length)]

return sock.sendMessage(from, {
text: sorteada
})
}

// =========================
// EXECUTAR COMANDO
// =========================

const textoNormalizado = normalizarTexto(texto)

if (comandos[textoNormalizado]) {

return sock.sendMessage(from, {
text: comandos[textoNormalizado]
})
}

iniciarBot()

const express = require("express")
const app = express()

app.get("/", (req, res) => {
res.send("Bot online!")
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
console.log("Servidor rodando na porta " + PORT)
})
