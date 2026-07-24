// G5 — PM2 chạy production local (Windows). Trước khi start: npm run build.
// Cài PM2 1 lần: npm i -g pm2
//   pm2 start ecosystem.config.js   → chạy app cổng 4000 + bot Telegram
//   pm2 save                        → lưu danh sách process
//   pm2 logs seryn-ops              → xem log web
//   pm2 logs seryn-telegram-bot     → xem log bot (Giai đoạn I)
// Log đặt ngoài OneDrive (cùng chỗ DB) để tránh sync liên tục.

module.exports = {
  apps: [
    {
      name: "seryn-ops",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 4000",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      out_file: "C:/SerynOps/logs/seryn-ops.out.log",
      error_file: "C:/SerynOps/logs/seryn-ops.err.log",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      // Giai đoạn I — bot Telegram 2 chiều, long-polling (không cần domain/HTTPS).
      // Cần TELEGRAM_BOT_TOKEN trong .env, nếu không sẽ thoát ngay (autorestart
      // sẽ liên tục thử lại — sếp cần điền .env trước khi start app này).
      name: "seryn-telegram-bot",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "scripts/telegram-bot.mts",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "256M",
      out_file: "C:/SerynOps/logs/seryn-telegram-bot.out.log",
      error_file: "C:/SerynOps/logs/seryn-telegram-bot.err.log",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
