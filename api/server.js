const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

// ==== CONFIG ====
const TOKEN = '8202346696:AAG2I28nxL0qGatWEre6IJL_y63yXXeuJMc';
const OWNER_ID = 6629230649;
const ACCESS_KEY = '123RJhTtApALhaT';

// ==== SIMPLE BOT SETUP ====
console.log('🚀 Starting bot...');
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('✅ Bot initialized');
console.log('👤 Owner ID:', OWNER_ID);

// ==== SIMPLE STORAGE ====
let authorizedUsers = [OWNER_ID];
let attacks = {};

// ==== SIMPLE COMMANDS ====
bot.on('message', (msg) => {
  console.log(`📩 From ${msg.from.id}: ${msg.text}`);
});

bot.onText(/\/start/, (msg) => {
  const userId = msg.from.id;
  const isAuthorized = authorizedUsers.includes(userId);
  
  let response = `🤖 BLACKBOX BOT\n`;
  response += `Your ID: ${userId}\n`;
  response += `Status: ${isAuthorized ? '✅ AUTHORIZED' : '🔒 LOCKED'}\n\n`;
  
  if (userId === OWNER_ID) {
    response += `👑 OWNER COMMANDS:\n`;
    response += `/ping - Test bot\n`;
    response += `/attack url seconds - Start attack\n`;
    response += `/stop id - Stop attack\n`;
    response += `/adduser id - Add user\n`;
    response += `/users - List users\n`;
  } else if (isAuthorized) {
    response += `✅ USER COMMANDS:\n`;
    response += `/ping - Test bot\n`;
    response += `/attack url seconds - Start attack\n`;
    response += `/stop id - Stop attack\n`;
  } else {
    response += `🔐 Use /key ${ACCESS_KEY} to unlock`;
  }
  
  bot.sendMessage(msg.chat.id, response);
});

bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, '🏓 PONG! Bot is working!');
});

bot.onText(/\/key (.+)/, (msg, match) => {
  const userId = msg.from.id;
  const inputKey = match[1];
  
  if (userId === OWNER_ID) {
    bot.sendMessage(msg.chat.id, '👑 Owner tidak perlu key');
    return;
  }
  
  if (inputKey === ACCESS_KEY) {
    if (!authorizedUsers.includes(userId)) {
      authorizedUsers.push(userId);
    }
    bot.sendMessage(msg.chat.id, `✅ UNLOCKED! Now you can use /attack`);
  } else {
    bot.sendMessage(msg.chat.id, '❌ Wrong key');
  }
});

bot.onText(/\/attack (.+?) (\d+)/, (msg, match) => {
  const userId = msg.from.id;
  
  if (!authorizedUsers.includes(userId) && userId !== OWNER_ID) {
    bot.sendMessage(msg.chat.id, '❌ Not authorized. Use /key first');
    return;
  }
  
  const url = match[1];
  const seconds = parseInt(match[2]);
  
  if (!url.startsWith('http')) {
    bot.sendMessage(msg.chat.id, '❌ Invalid URL. Use http:// or https://');
    return;
  }
  
  if (seconds < 1 || seconds > 300) {
    bot.sendMessage(msg.chat.id, '❌ Duration: 1-300 seconds');
    return;
  }
  
  const attackId = Math.random().toString(36).substring(2, 6);
  
  bot.sendMessage(msg.chat.id,
    `🚀 ATTACK STARTED\n` +
    `ID: ${attackId}\n` +
    `Target: ${url}\n` +
    `Duration: ${seconds}s\n\n` +
    `Will auto-stop after ${seconds} seconds`
  );
  
  // Simulate attack (simple timeout)
  attacks[attackId] = {
    timer: setTimeout(() => {
      delete attacks[attackId];
      bot.sendMessage(msg.chat.id, `✅ Attack ${attackId} finished`);
    }, seconds * 1000),
    userId: userId,
    chatId: msg.chat.id
  };
});

bot.onText(/\/stop (.+)/, (msg, match) => {
  const attackId = match[1];
  const attack = attacks[attackId];
  
  if (!attack) {
    bot.sendMessage(msg.chat.id, '❌ Attack not found');
    return;
  }
  
  if (attack.userId !== msg.from.id && msg.from.id !== OWNER_ID) {
    bot.sendMessage(msg.chat.id, '❌ You can only stop your own attacks');
    return;
  }
  
  clearTimeout(attack.timer);
  delete attacks[attackId];
  bot.sendMessage(msg.chat.id, `🛑 Stopped attack ${attackId}`);
});

bot.onText(/\/adduser (\d+)/, (msg) => {
  if (msg.from.id !== OWNER_ID) return;
  
  const newUserId = parseInt(msg.text.split(' ')[1]);
  
  if (!authorizedUsers.includes(newUserId)) {
    authorizedUsers.push(newUserId);
    bot.sendMessage(msg.chat.id, `✅ Added user ${newUserId}`);
    
    // Notify new user
    bot.sendMessage(newUserId, `🎉 You've been added by owner!\nUse /start to see commands`);
  } else {
    bot.sendMessage(msg.chat.id, `⚠️ User ${newUserId} already added`);
  }
});

bot.onText(/\/users/, (msg) => {
  if (msg.from.id !== OWNER_ID) return;
  
  const userList = authorizedUsers.map(id => `• ${id}`).join('\n');
  bot.sendMessage(msg.chat.id, `👥 AUTHORIZED USERS (${authorizedUsers.length}):\n${userList}`);
});

// ==== WEB INTERFACE ====
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Simple Blackbox</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #0a0a0a;
          color: #00ff00;
          font-family: 'Courier New', monospace;
          padding: 20px;
          min-height: 100vh;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid #00ff00;
          padding: 20px;
          border-radius: 5px;
          background: rgba(0, 255, 0, 0.05);
        }
        h1 {
          color: #00ff00;
          margin-bottom: 20px;
          text-align: center;
        }
        .status {
          background: rgba(0, 255, 0, 0.1);
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
          border-left: 3px solid #00ff00;
        }
        .status-title {
          color: #00ff00;
          font-size: 14px;
          opacity: 0.8;
        }
        .status-value {
          color: #00ff00;
          font-size: 18px;
          font-weight: bold;
          margin-top: 5px;
        }
        .online {
          color: #00ff00;
          animation: blink 1s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .commands {
          margin-top: 25px;
          padding: 15px;
          background: rgba(0, 255, 0, 0.05);
          border-radius: 5px;
        }
        .command {
          margin: 8px 0;
          padding-left: 10px;
          border-left: 2px solid #00ff00;
        }
        footer {
          margin-top: 25px;
          text-align: center;
          color: #008800;
          font-size: 12px;
          opacity: 0.7;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚡ SIMPLE BLACKBOX</h1>
        
        <div class="status">
          <div class="status-title">SYSTEM STATUS</div>
          <div class="status-value online">● ONLINE</div>
        </div>
        
        <div class="status">
          <div class="status-title">AUTHORIZED USERS</div>
          <div class="status-value">${authorizedUsers.length}</div>
        </div>
        
        <div class="status">
          <div class="status-title">ACTIVE ATTACKS</div>
          <div class="status-value">${Object.keys(attacks).length}</div>
        </div>
        
        <div class="status">
          <div class="status-title">OWNER ID</div>
          <div class="status-value">${OWNER_ID}</div>
        </div>
        
        <div class="commands">
          <div style="color: #00ff00; margin-bottom: 10px;">📌 BOT COMMANDS:</div>
          <div class="command">/start - Show menu</div>
          <div class="command">/ping - Test response</div>
          <div class="command">/key [key] - Register user</div>
          <div class="command">/attack [url] [seconds] - Start attack</div>
          <div class="command">/stop [id] - Stop attack</div>
          ${msg.from && msg.from.id === OWNER_ID ? 
            `<div class="command">/adduser [id] - Add user (Owner only)</div>
             <div class="command">/users - List users (Owner only)</div>` : ''}
        </div>
        
        <footer>
          Simple Blackbox © ${new Date().getFullYear()}<br>
          Uptime: ${Math.floor(process.uptime() / 60)} minutes
        </footer>
      </div>
      
      <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
          location.reload();
        }, 30000);
      </script>
    </body>
    </html>
  `);
});

// ==== HEALTH CHECK ====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: 'running',
    users: authorizedUsers.length,
    attacks: Object.keys(attacks).length,
    uptime: process.uptime()
  });
});

// ==== START SERVER ====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════╗
  ║     SIMPLE BLACKBOX ACTIVE       ║
  ╠══════════════════════════════════╣
  ║  Port: ${PORT}                    ║
  ║  Owner: ${OWNER_ID}               ║
  ║  Key: ${ACCESS_KEY}               ║
  ╚══════════════════════════════════╝
  `);
  
  // Test bot connection
  bot.getMe()
    .then(me => {
      console.log(`✅ Bot connected: @${me.username}`);
      console.log(`✅ Send /ping to test`);
    })
    .catch(err => {
      console.log('❌ Bot connection error:', err.message);
    });
});

// ==== KEEP ALIVE ====
setInterval(() => {
  console.log(`[${new Date().toLocaleTimeString()}] Status: ${Object.keys(attacks).length} attacks`);
}, 60000);
