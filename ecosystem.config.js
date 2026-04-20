module.exports = {
  apps: [
    {
      name: "gouv-api",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      cwd: "/home/deploy/apps/gouv-api",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      error_file: "/home/deploy/logs/gouv-api-error.log",
      out_file: "/home/deploy/logs/gouv-api-out.log",
    },
  ],
};
