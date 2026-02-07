# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

**Required Environment Variables:**
- `SECRET_KEY`: Generate a secure random key (never use default!)
- `DEBUG`: Set to `False` in production
- `ALLOWED_HOSTS`: Comma-separated list of your domains
- `USE_POSTGRES`: Set to `True` for production
- Database credentials (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`)

**Security Variables (Production):**
```
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

### 2. Generate Secure SECRET_KEY

```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3. Database Setup

**PostgreSQL (Recommended for Production):**
```bash
# Install PostgreSQL
# Create database
createdb minitab

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Initialize RBAC
python manage.py init_rbac
```

### 4. Static Files

```bash
# Collect static files
python manage.py collectstatic --noinput
```

### 5. Production Readiness Check

```bash
# Run production check
python manage.py check_production

# Django system check
python manage.py check --deploy
```

## Deployment Options

### Option 1: Using Gunicorn + Nginx

**Install Gunicorn:**
```bash
pip install gunicorn
```

**Create Gunicorn service** (`/etc/systemd/system/minitab.service`):
```ini
[Unit]
Description=Minitab Gunicorn Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/minitab/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/gunicorn --workers 3 --bind unix:/tmp/minitab.sock config.wsgi:application

[Install]
WantedBy=multi-user.target
```

**Nginx Configuration** (`/etc/nginx/sites-available/minitab`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /static/ {
        alias /path/to/minitab/backend/staticfiles/;
    }

    location /media/ {
        alias /path/to/minitab/backend/media/;
    }

    location / {
        proxy_pass http://unix:/tmp/minitab.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Start Services:**
```bash
sudo systemctl start minitab
sudo systemctl enable minitab
sudo systemctl restart nginx
```

### Option 2: Using Docker (Recommended for containerized deployment)

See separate Docker documentation when needed.

## Post-Deployment

### 1. Health Checks

The application provides health check endpoints:
- `/health/` - Full health check (database, cache)
- `/health/ready/` - Readiness probe
- `/health/live/` - Liveness probe

### 2. Monitoring

**Check Logs:**
```bash
tail -f logs/django.log
```

**Monitor Gunicorn:**
```bash
sudo systemctl status minitab
```

### 3. Celery (If using background tasks)

**Start Celery worker:**
```bash
celery -A config worker -l info
```

**Create Celery service:**
```ini
[Unit]
Description=Minitab Celery Worker
After=network.target

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/path/to/minitab/backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/celery -A config worker --detach --loglevel=info

[Install]
WantedBy=multi-user.target
```

## Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Use strong SECRET_KEY** - Generate new one for production
3. **Enable HTTPS** - Use Let's Encrypt for free SSL
4. **Set proper file permissions:**
   ```bash
   chmod 600 .env
   chmod 755 logs/
   ```
5. **Keep dependencies updated:**
   ```bash
   pip install -U -r requirements.txt
   ```
6. **Regular backups** - Backup database and media files
7. **Monitor logs** - Check for suspicious activity

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
python manage.py dbshell
```

### Permission Errors
```bash
# Fix ownership
sudo chown -R www-data:www-data /path/to/minitab
```

### Static Files Not Loading
```bash
# Recollect static files
python manage.py collectstatic --clear --noinput
```

## Scaling Considerations

1. **Database Connection Pooling** - Use PgBouncer
2. **Caching** - Configure Redis for session storage
3. **CDN** - Serve static files via CDN
4. **Load Balancing** - Multiple Gunicorn workers
5. **Database Read Replicas** - For high read loads

## Maintenance

### Database Migrations
```bash
# Always backup before migrations
python manage.py migrate --plan  # Preview
python manage.py migrate          # Apply
```

### Backup Strategy
```bash
# Database backup
pg_dump minitab > backup_$(date +%Y%m%d).sql

# Media files backup
tar -czf media_backup_$(date +%Y%m%d).tar.gz media/
```

## Support

For issues or questions, contact the development team.
