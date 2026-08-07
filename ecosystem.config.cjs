// PM2 — giữ bot Telegram sống qua reboot/crash. Chạy tsx trực tiếp thay vì
// "npm run bot" vì pm2 trên Windows spawn npm.cmd không ổn định.
// Cài lần đầu:  pm2 start ecosystem.config.cjs && pm2 save
// Tự chạy khi mở máy: npm i -g pm2-windows-startup && pm2-startup install
module.exports = {
  apps: [
    {
      name: "seryn-bot",
      cwd: __dirname,
      script: "node_modules/tsx/dist/cli.mjs",
      args: "scripts/telegram-bot.mts",
      interpreter: "node",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // Không cần khai env: script tự import "dotenv/config" nạp .env theo cwd
    },
  ],
};
