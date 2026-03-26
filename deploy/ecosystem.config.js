// deploy/ecosystem.config.js
// Start:   pm2 start deploy/ecosystem.config.js --env production
// Reload:  pm2 reload ggsa --env production   (zero-downtime)
// Logs:    pm2 logs ggsa
// Monitor: pm2 monit

module.exports = {
  apps: [
    {
      name: "ggsa",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/ggsa",
      instances: "max", // One worker per CPU core
      exec_mode: "cluster", // Enables zero-downtime reload
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "127.0.0.1", // Bind to loopback only; nginx is the gateway
      },
      max_memory_restart: "512M",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/pm2/ggsa-error.log",
      out_file: "/var/log/pm2/ggsa-out.log",
    },
  ],
};

