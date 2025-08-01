# Q5K Deployment Guide

This guide covers various deployment options for Q5K, from local development to production environments.

## Quick Local Setup

### Prerequisites
- Node.js 14.x or higher
- npm or yarn package manager
- Git (optional)

### Installation
```bash
# Clone or download the project
git clone <repository-url> q5k
cd q5k

# Install dependencies
npm install

# Start the development server
npm start
```

The application will be available at `http://localhost:3000`.

## Development Environment

### Environment Variables
Create a `.env` file in the project root:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_PATH=./codeshare.db

# Security Configuration
SESSION_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Code Execution
CODE_EXECUTION_TIMEOUT=5000
MAX_CODE_SIZE=1048576

# Admin Configuration
ADMIN_PASSWORD=your-admin-password
```

### Development Scripts
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "lint": "eslint *.js",
    "lint:fix": "eslint *.js --fix"
  }
}
```

## Docker Deployment

### Single Container Setup

**Dockerfile**:
```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S q5k -u 1001

# Change ownership of the app directory
RUN chown -R q5k:nodejs /usr/src/app
USER q5k

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD [ "node", "server.js" ]
```

**Build and run**:
```bash
# Build the image
docker build -t q5k:latest .

# Run the container
docker run -d \
  --name q5k-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_PATH=/data/codeshare.db \
  -v q5k-data:/data \
  q5k:latest
```

### Docker Compose Setup

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/codeshare.db
      - REDIS_URL=redis://redis:6379
    volumes:
      - app-data:/data
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  app-data:
  redis-data:
```

**Start the stack**:
```bash
docker-compose up -d
```

## Production Deployment

### PM2 Process Manager

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'q5k',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_PATH: '/var/lib/q5k/codeshare.db'
    },
    error_file: '/var/log/q5k/error.log',
    out_file: '/var/log/q5k/output.log',
    log_file: '/var/log/q5k/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

**Deployment commands**:
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

# Monitor applications
pm2 monit
```

### Systemd Service

**q5k.service**:
```ini
[Unit]
Description=Q5K Collaborative Code Editor
After=network.target

[Service]
Type=simple
User=q5k
WorkingDirectory=/opt/q5k
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=q5k
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_PATH=/var/lib/q5k/codeshare.db

[Install]
WantedBy=multi-user.target
```

**Installation**:
```bash
# Copy service file
sudo cp q5k.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable q5k
sudo systemctl start q5k

# Check status
sudo systemctl status q5k
```

## Reverse Proxy Configuration

### Nginx Configuration

**nginx.conf**:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream q5k_backend {
        least_conn;
        server app:3000;
        # Add more backend servers for load balancing
        # server app2:3000;
        # server app3:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=websocket:10m rate=5r/s;

    server {
        listen 80;
        server_name your-domain.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # WebSocket configuration
        location /ws {
            limit_req zone=websocket burst=10 nodelay;
            
            proxy_pass http://q5k_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket timeout settings
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;
        }

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://q5k_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Admin endpoints (restrict access)
        location /admin/ {
            allow 192.168.1.0/24;  # Allow local network
            allow 10.0.0.0/8;       # Allow private networks
            deny all;               # Deny all others
            
            proxy_pass http://q5k_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location / {
            proxy_pass http://q5k_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Caching for static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
    }
}
```

### Apache Configuration

**q5k.conf**:
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/cert.pem
    SSLCertificateKeyFile /etc/ssl/private/key.pem
    
    # Security Headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    
    # WebSocket Proxy
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:3000/$1" [P,L]
    
    # Regular HTTP Proxy
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
</VirtualHost>
```

## Cloud Platform Deployment

### AWS Deployment

**Using AWS ECS with Fargate**:

```yaml
# docker-compose.aws.yml
version: '3.8'
services:
  app:
    image: your-account.dkr.ecr.region.amazonaws.com/q5k:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/codeshare.db
    volumes:
      - type: bind
        source: /efs/q5k-data
        target: /data
    logging:
      driver: awslogs
      options:
        awslogs-group: q5k-logs
        awslogs-region: us-east-1
```

**ECS Task Definition**:
```json
{
  "family": "q5k-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "q5k-container",
      "image": "your-account.dkr.ecr.region.amazonaws.com/q5k:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "q5k-logs",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Platform

**app.yaml** (App Engine):
```yaml
runtime: nodejs18

env_variables:
  NODE_ENV: production
  DATABASE_PATH: /tmp/codeshare.db

automatic_scaling:
  min_instances: 1
  max_instances: 10
  target_cpu_utilization: 0.6

resources:
  cpu: 1
  memory_gb: 1
  disk_size_gb: 10

handlers:
- url: /.*
  script: auto
  secure: always
```

### Heroku Deployment

**Procfile**:
```
web: node server.js
```

**heroku.yml**:
```yaml
build:
  docker:
    web: Dockerfile
run:
  web: node server.js
```

**Deployment commands**:
```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-q5k-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DATABASE_PATH=/tmp/codeshare.db

# Deploy
git push heroku main

# Scale
heroku ps:scale web=1
```

## Database Configuration

### SQLite (Default)
```javascript
// server.js - SQLite configuration
const Database = require('better-sqlite3');
const db = new Database(process.env.DATABASE_PATH || './codeshare.db');

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
```

### PostgreSQL (Production)
```javascript
// PostgreSQL configuration
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Redis Session Store
```javascript
// Redis configuration for session storage
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

await client.connect();
```

## Monitoring and Logging

### Application Monitoring

**Winston Logger Setup**:
```javascript
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'q5k' },
  transports: [
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### Health Check Endpoint

**healthcheck.js**:
```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: 2000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
```

## Security Considerations

### Production Security Checklist

- [ ] Enable HTTPS with valid SSL certificates
- [ ] Set up proper CORS configuration
- [ ] Implement rate limiting
- [ ] Configure security headers
- [ ] Set up firewall rules
- [ ] Enable request logging
- [ ] Implement admin authentication
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Monitor for vulnerabilities

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/q5k
REDIS_URL=redis://user:pass@host:6379
SESSION_SECRET=your-very-secure-random-string
CORS_ORIGIN=https://your-domain.com
ADMIN_PASSWORD=secure-admin-password
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check firewall settings
   - Verify proxy configuration
   - Ensure correct WebSocket URL

2. **Database Locked Error**
   - Enable WAL mode for SQLite
   - Check file permissions
   - Consider switching to PostgreSQL

3. **Memory Issues**
   - Monitor memory usage
   - Implement room cleanup
   - Set memory limits in Docker

4. **Performance Issues**
   - Enable Redis for session storage
   - Implement connection pooling
   - Use process clustering

### Log Analysis
```bash
# Check application logs
tail -f logs/combined-*.log

# Monitor system resources
htop

# Check Docker container logs
docker logs q5k-app

# Monitor WebSocket connections
netstat -an | grep :3000
```

This deployment guide provides comprehensive instructions for deploying Q5K in various environments, from development to production-scale deployments.
