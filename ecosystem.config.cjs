module.exports = {
  apps: [{
    name: 'domclaw',
    script: 'npx',
    args: 'tsx src/interfaces/daemon.ts',
    cwd: __dirname,
    interpreter: 'none',
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
    },
  }],
}
