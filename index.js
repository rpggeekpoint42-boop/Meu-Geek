const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const P = require("pino")
const readline = require("readline")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const pergunta = (txt) =>
  new Promise((res) => rl.question(txt, res))

async function iniciarBot() {

  const { state, saveCreds } =
    await useMultiFileAuthState("auth")

  const { version } =
    await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    browser: ["Ubuntu", "Chrome", "20.0.04"]
  })

  sock.ev.on("creds.update", saveCreds)

  if (!sock.authState.creds.registered) {

    let numero = await pergunta(
      "Número com DDI: "
    )

    numero = numero.replace(/[^0-9]/g, "")

    const code =
      await sock.requestPairingCode(numero)

    console.log(`\nCódigo: ${code}\n`)
  }

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

    if (texto === "!ping") {

      await sock.sendMessage(from, {
        text: "pong 🏓"
      })
    }
  })
}

iniciarBot()
