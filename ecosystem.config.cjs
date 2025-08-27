// PM2 Configuration for PyLearn Development Server

module.exports = {
  apps: [
    {
      name: 'pylearn',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=pylearn-production --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M'
    }
  ]
}