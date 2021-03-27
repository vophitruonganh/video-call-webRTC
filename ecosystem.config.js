module.exports = {
  apps: [
    {
      name: "API",
      script: "./index.js",
      watch: false,
      instances: -1, // 12 CPU - 1 = 11 CPU => 1 node instance
      exec_mode: "cluster",
      node_args: "--max_old_space_size=500",
      max_memory_restart: "2048M",
      env: {
        NODE_ENV: process.env.NODE_ENV || "local",
      },
    }
  ],
};
