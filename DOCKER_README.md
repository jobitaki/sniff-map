# Sniff Pittsburgh - Docker Deployment Guide

This guide explains how to run your Sniff Pittsburgh application using Docker containers.

## 🐳 What Docker Gives You

- **No database setup hassles** - PostgreSQL runs in a container
- **Consistent environment** - Works the same everywhere
- **Easy deployment** - One command to start everything
- **Automatic database management** - Persistent data storage
- **Optional web database admin** - pgAdmin for database viewing

## 🚀 Quick Start

### 1. Install Docker
- **macOS**: Download Docker Desktop from https://docker.com
- **Linux**: `sudo apt-get install docker.io docker-compose`
- **Windows**: Download Docker Desktop from https://docker.com

### 2. Start Everything
```bash
# Clone/navigate to your project
cd sniff-map

# Start all services (database + app)
docker-compose up -d

# View logs
docker-compose logs -f app
```

That's it! Your application is now running at:
- **Flask App**: http://localhost:5000
- **Database**: Automatically created and connected
- **pgAdmin** (optional): http://localhost:8080

## 📋 What Gets Created

When you run `docker-compose up`, Docker creates:

1. **PostgreSQL Database Container**
   - Database: `sniff_pittsburgh`
   - User: `sniff_user`
   - Password: `sniff_password`
   - Port: 5432

2. **Flask App Container**
   - Your Python application
   - Automatically connects to database
   - Port: 5000

3. **pgAdmin Container** (optional)
   - Web-based database admin
   - Login: admin@sniffpittsburgh.com / admin
   - Port: 8080

## 🔧 Useful Commands

```bash
# Start everything in background
docker-compose up -d

# View logs
docker-compose logs -f app
docker-compose logs -f db

# Stop everything
docker-compose down

# Rebuild app after code changes
docker-compose build app
docker-compose up -d

# Access database directly
docker-compose exec db psql -U sniff_user -d sniff_pittsburgh

# View all containers
docker-compose ps

# Remove everything (including data!)
docker-compose down -v
```

## 🧪 Testing Your Setup

### 1. Health Check
```bash
curl http://localhost:5000/health
```

### 2. Send Test Data
```bash
curl -X POST http://localhost:5000/tts-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "end_device_ids": {"device_id": "test_sensor"},
    "received_at": "2024-10-30T15:30:00Z",
    "uplink_message": {
      "frm_payload": "test_data",
      "locations": {
        "user": {"latitude": 40.4406, "longitude": -79.9959}
      }
    }
  }'
```

### 3. View Data
```bash
curl http://localhost:5000/data
```

## 🌐 TTS Webhook Configuration

Point your TTS webhook to:
```
http://your-server-ip:5000/tts-webhook
```

For local testing:
```
http://localhost:5000/tts-webhook
```

## 🗄️ Database Management

### Option 1: pgAdmin Web Interface
1. Go to http://localhost:8080
2. Login: admin@sniffpittsburgh.com / admin
3. Add server:
   - Host: db
   - Port: 5432
   - Database: sniff_pittsburgh
   - Username: sniff_user
   - Password: sniff_password

### Option 2: Command Line
```bash
# Connect to database
docker-compose exec db psql -U sniff_user -d sniff_pittsburgh

psql -U postgres -d sniff_db -c "DELETE FROM air_quality_readings;"

# View tables
\dt

# View data
SELECT * FROM air_quality_readings;

# Exit
\q
```

## 📂 Data Persistence

Your database data is stored in Docker volumes, so it persists even when containers are stopped/restarted.

To backup your data:
```bash
docker-compose exec db pg_dump -U sniff_user sniff_pittsburgh > backup.sql
```

To restore data:
```bash
docker-compose exec -T db psql -U sniff_user sniff_pittsburgh < backup.sql
```

## 🔧 Production Deployment

For production deployment:

### 1. Update Environment
Edit `docker-compose.yml`:
```yaml
environment:
  POSTGRES_PASSWORD: your_secure_password_here
  DATABASE_URL: postgresql://sniff_user:your_secure_password_here@db:5432/sniff_pittsburgh
```

### 2. Remove Development Volume Mount
Remove this line from `docker-compose.yml`:
```yaml
volumes:
  - ./app.py:/app/app.py  # Remove this line
```

### 3. Use Production Server
Add to your `app.py`:
```python
if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
```

### 4. Deploy
```bash
docker-compose up -d
```

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Check if database is ready
docker-compose exec db pg_isready -U sniff_user

# View database logs
docker-compose logs db
```

### App Won't Start
```bash
# Check app logs
docker-compose logs app

# Rebuild and restart
docker-compose build app
docker-compose up -d app
```

### Port Already in Use
Change ports in `docker-compose.yml`:
```yaml
ports:
  - "5001:5000"  # Use port 5001 instead
```

## 🎯 Next Steps

1. **Test with real TTS data** - Configure your TTS webhook
2. **Monitor logs** - `docker-compose logs -f app`
3. **Set up production secrets** - Use proper passwords
4. **Deploy to cloud** - AWS, DigitalOcean, etc.

Your Sniff Pittsburgh application is now fully containerized and ready for deployment!