const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const P = require("pino")
const fs = require("fs")

const comandosPath = "./comandos.json"

if (!fs.existsSync(comandosPath)) {
  fs.writeFileSync(comandosPath, JSON.stringify({}, null, 2))
}

function carregarComandos() {
  return JSON.parse(fs.readFileSync(comandosPath))
}

function salvarComandos(data) {
  fs.writeFileSync(comandosPath, JSON.stringify(data, null, 2))
}

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

  sock.ev.on("messages.upsert", async ({ messages }) => {

    const msg = messages[0]

    if (!msg.message) return

    const from = msg.key.remoteJid

    const texto =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text

    if (!texto) return

    const comandos = carregarComandos()

    // PING
    if (texto === "!ping") {

  const inicio = Date.now()

  const grupos = Object.keys(sock.chats)
    .filter(id => id.endsWith("@g.us")).length

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

    // CRIAR COMANDO
    // Exemplo:
    // !criar oi|Olá!

    if (texto.startsWith("!criar ")) {

      const dados = texto.slice(8)

      if (!dados.includes("|")) {
        return sock.sendMessage(from, {
          text: "Use: !criar nome|resposta"
        })
      }

      const [nome, resposta] = dados.split("|")

      comandos[nome.trim()] = resposta.trim()

      salvarComandos(comandos)

      return sock.sendMessage(from, {
        text: `✅ Comando ${nome} criado!`
      })
    }

    // APAGAR COMANDO
    // !apagar oi

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

    // LISTAR COMANDOS

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

    // EXECUTAR COMANDO

    if (comandos[texto]) {

      return sock.sendMessage(from, {
        text: comandos[texto]
      })
    }
  })
}

iniciarBot()
