# Deployment Guide - Special Education Data Platform

## Prerequisites

### System Requirements
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn package manager
- SSL certificate for HTTPS (required for production)

### Required Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://username:password@hostname:port/database_name

# Session Security
SESSION_SECRET=generate_a_secure_32_character_random_string

# Application
NODE_ENV=production
PORT=5000
```

## Deployment Steps

### 1. Prepare the Server
```bash
# Clone/copy the application files
git clone <your-repository>
cd special-education-platform

# Install dependencies
npm install

# Build the application
npm run build
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb special_education_platform

# Set up database schema
npm run db:push
```

### 3. Configure Web Server

#### Option A: Direct Node.js (Development/Testing)
```bash
npm start
```

#### Option B: Production with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start dist/index.js --name "special-education-platform"

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Option C: Production with Nginx Reverse Proxy
Create `/etc/nginx/sites-available/special-education-platform`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket support for live features
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static file optimization
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/special-education-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Production Security Checklist

### Database Security
- [ ] Use strong database passwords
- [ ] Enable SSL connections to database
- [ ] Restrict database access to application server only
- [ ] Regular database backups configured

### Application Security
- [ ] Strong SESSION_SECRET (32+ random characters)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables secured
- [ ] Regular security updates
- [ ] File upload restrictions implemented
- [ ] Rate limiting configured

### Server Security
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] SSH key authentication (disable password auth)
- [ ] Regular system updates
- [ ] Log monitoring configured
- [ ] Backup strategy implemented

## Authentication Setup

### Option A: Disable Authentication (Internal Use)
For internal organizational use, authentication can be disabled by modifying `server/routes.ts`:

```javascript
// Comment out authentication middleware
// app.use(isAuthenticated);

// Use hardcoded user ID for all operations
const HARDCODED_USER_ID = "your_organization_id";
```

### Option B: Custom Authentication
Implement your own authentication system by replacing the OpenID Connect setup in `server/replitAuth.ts`.

### Option C: OpenID Connect Provider
Configure with your own OpenID Connect provider by updating environment variables.

## Monitoring and Maintenance

### Log Management
- Application logs: Check PM2 logs with `pm2 logs`
- Nginx logs: `/var/log/nginx/`
- Database logs: PostgreSQL log directory

### Database Maintenance
```bash
# Create database backups
pg_dump special_education_platform > backup_$(date +%Y%m%d).sql

# Monitor database size and performance
# Set up automated cleanup of old session data
```

### Application Updates
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Rebuild application
npm run build

# Restart application
pm2 restart special-education-platform
```

## Troubleshooting

### Common Issues
1. **Database Connection Issues**: Verify DATABASE_URL and PostgreSQL service status
2. **Session Issues**: Check SESSION_SECRET configuration and PostgreSQL sessions table
3. **File Permissions**: Ensure application has write permissions for uploads
4. **SSL Certificate Issues**: Verify certificate validity and nginx configuration

### Support
- Check application logs: `pm2 logs special-education-platform`
- Database status: `systemctl status postgresql`
- Web server status: `systemctl status nginx`

## Performance Optimization

### Database Optimization
- Regular VACUUM and ANALYZE operations
- Index optimization for frequent queries
- Connection pooling configuration

### Application Optimization
- Enable gzip compression in nginx
- Configure proper caching headers
- Monitor memory usage and optimize as needed
- Use CDN for static assets if needed

## Backup Strategy

### Automated Backups
```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump special_education_platform > /backups/db_backup_$DATE.sql
find /backups -name "db_backup_*.sql" -mtime +30 -delete

# Add to crontab for daily backups
0 2 * * * /path/to/backup_script.sh
```