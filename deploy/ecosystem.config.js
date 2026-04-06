// deploy/ecosystem.config.js
// Start:   pm2 start deploy/ecosystem.config.js --env production
// Reload:  pm2 reload sponsor --env production   (zero-downtime)
// Logs:    pm2 logs sponsor
// Monitor: pm2 monit

module.exports = {
  apps: [
    {
      name: "sponsor",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/var/www/ggsasponsor",
      instances: 1,
      exec_mode: "fork",
      listen_timeout: 10000,
      kill_timeout: 5000,
      env_production: {
        NODE_ENV: "production",
        PORT: 3008,
        HOSTNAME: "127.0.0.1",
      },
      max_memory_restart: "512M",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/pm2/ggsa-error.log",
      out_file: "/var/log/pm2/ggsa-out.log",
    },
  ],
};
