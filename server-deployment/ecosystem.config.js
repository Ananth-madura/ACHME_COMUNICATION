module.exports = {
  apps: [{
    name: 'achme-backend',
    script: 'C:\\Deployment\\achme\\backend\\server.js', // Adjust if main file is index.js
    instances: 'max', // Scale across all available CPU cores
    exec_mode: 'cluster',
    autorestart: true,
    watch: false, // Do not watch in production
    max_memory_restart: '1G', // Restart if process consumes more than 1GB RAM
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DB_HOST: '127.0.0.1',
      DB_USER: 'root', // Change to your dedicated production user
      DB_PASS: 'YOUR_SECURE_PASSWORD', // Change to your production password
      DB_NAME: 'achme_crm'
    },
    error_file: 'C:\\Deployment\\achme\\logs\\backend-error.log',
    out_file: 'C:\\Deployment\\achme\\logs\\backend-out.log',
    time: true
  }]
};
