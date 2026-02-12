# CallDoc Deployment Guide

Self-hosted call center reporting for Avaya IP Office 11.

---

## Quick Start

```bash
# 1. Clone and configure
git clone <repo-url> calldoc && cd calldoc
cp .env.example .env   # Edit with your settings

# 2. Start all services
docker compose up -d

# 3. Run database migrations
docker compose exec app npm run db:migrate
```

Open http://localhost:3000 and log in with the default admin account.

---

## Prerequisites

| Requirement          | Minimum         | Recommended     |
|----------------------|-----------------|-----------------|
| Docker               | 24.0+           | 25.0+           |
| Docker Compose       | 2.20+           | 2.24+           |
| RAM                  | 4 GB            | 8 GB            |
| Disk                 | 20 GB           | 100 GB+         |
| CPU                  | 2 cores         | 4 cores         |
| Avaya IP Office      | 11.0            | 11.1+           |
| Network              | TCP 50797, 1150 | -               |

---

## Architecture

```
                                 +-----------------------------+
                                 |     Avaya IP Office 11      |
                                 |                             |
                                 |  DevLink3 :50797  SMDR TCP  |
                                 +------+-------------+--------+
                                        |             |
                           Binary TCP    |             | CSV over TCP
                                        v             v
+-------------------+          +---------+-------------+---------+
|                   |          |         CallDoc App (:3000)     |
|   Browser Client  | <-----  |                                 |
|   (Next.js SSR +  |  HTTP/  |  DevLink3     SMDR    Correlation|
|    Socket.io)     |  WS     |  Connector   Writer   Engine    |
|                   |         |                                 |
+-------------------+         +-----+---+---+-----------+------+
                                    |   |   |           |
                                    v   |   v           v
                          +---------+   |  +--------+  +---------+
                          |PostgreSQL|  |  | Redis  |  |  MinIO  |
                          |   :5432  |  |  | :6379  |  |  :9000  |
                          +----------+  |  +--------+  +---------+
                                        |
                                        v
                                  +----------+
                                  | Socket.io|
                                  | (pub/sub)|
                                  +----------+
```

**Data flow:**
1. DevLink3 binary TCP connector receives real-time call/agent events
2. SMDR writer receives CSV call detail records after call completion
3. Correlation engine matches DevLink3 and SMDR records by callId or timestamp+extension
4. Events are published to Redis pub/sub channels
5. Socket.io pushes real-time updates to connected browsers
6. Zustand stores in the browser update React components
7. Recordings are stored in MinIO (S3-compatible) with Opus codec

---

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://calldoc:secret@postgres:5432/calldoc` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `SESSION_SECRET` | Secret for iron-session cookies (32+ chars) | `your-random-32-char-secret-here` |
| `NEXTAUTH_URL` | Public URL of the CallDoc instance | `https://calldoc.example.com` |
| `NEXTAUTH_SECRET` | Secret for JWT signing (32+ chars) | `another-random-secret` |

### Avaya IP Office Connection

| Variable | Description | Default |
|----------|-------------|---------|
| `DEVLINK3_HOST` | IP/hostname of the IP Office system | `devlink3-sim` |
| `DEVLINK3_PORT` | DevLink3 TCP port | `50797` |
| `DEVLINK3_USERNAME` | DevLink3 application user | `admin` |
| `DEVLINK3_PASSWORD` | DevLink3 application password | `admin` |
| `DEVLINK3_USE_TLS` | Enable TLS for DevLink3 (port 50796) | `false` |
| `SMDR_HOST` | Bind address for SMDR listener | `0.0.0.0` |
| `SMDR_PORT` | SMDR TCP listener port | `1150` |

### SAML SSO

| Variable | Description | Default |
|----------|-------------|---------|
| `SAML_ENTRY_POINT` | IdP SSO URL | - |
| `SAML_ISSUER` | SP entity ID | `calldoc` |
| `SAML_CALLBACK_URL` | SAML callback URL | `{NEXTAUTH_URL}/api/auth/callback/saml` |
| `SAML_CERT` | IdP signing certificate (PEM) | - |

### Recording Storage (MinIO/S3)

| Variable | Description | Default |
|----------|-------------|---------|
| `MINIO_ENDPOINT` | MinIO/S3 endpoint URL | `http://minio:9000` |
| `MINIO_ACCESS_KEY` | Access key | `minioadmin` |
| `MINIO_SECRET_KEY` | Secret key | `minioadmin` |
| `MINIO_BUCKET` | Bucket name for recordings | `recordings` |

### Email (SMTP)

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | - |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `SMTP_FROM` | From address for emails | `noreply@calldoc.local` |

### Session

| Variable | Description | Default |
|----------|-------------|---------|
| `SESSION_MAX_AGE` | Max session age in seconds | `43200` (12h) |
| `SESSION_IDLE_TIMEOUT` | Idle timeout in seconds | `1800` (30m) |

---

## Avaya IP Office Setup

### DevLink3 Configuration

1. Open IP Office Manager and connect to the IP Office system
2. Navigate to **System > Telephony > TAPI/DevLink3**
3. Check **Enable DevLink3**
4. Set **Port** to `50797` (default)
5. For TLS, also enable port `50796`
6. Create an application user:
   - Go to **Security > Rights > Application Users**
   - Click **Add**
   - Set username and password (these become `DEVLINK3_USERNAME` and `DEVLINK3_PASSWORD`)
   - Grant **DevLink3** rights
7. Apply changes and reboot the IP Office if prompted

### SMDR Configuration

1. In IP Office Manager, navigate to **System > SMDR**
2. Check **Enable SMDR Output**
3. Set **Output** to **TCP**
4. Set **IP Address** to the CallDoc server IP address
5. Set **Port** to `1150` (matching `SMDR_PORT`)
6. Ensure **Account Code** and **Call Charge** fields are enabled
7. Apply changes

### Recording Configuration (Voicemail Pro)

1. Open Voicemail Pro client
2. Navigate to **System Preferences > Recording**
3. Configure automatic recording for desired extensions or groups
4. Set recording output to a network path or configure push to the CallDoc recording ingestion endpoint
5. Recordings are transcoded to Opus codec automatically by CallDoc

---

## Database

### Migrations

```bash
# Generate migration from schema changes
npm run db:generate

# Apply pending migrations
npm run db:migrate

# Interactive database browser
npm run db:studio
```

### Backup and Restore

```bash
# Backup
docker compose exec postgres pg_dump -U calldoc calldoc > backup.sql

# Restore
docker compose exec -T postgres psql -U calldoc calldoc < backup.sql
```

### Connection Pooling

For production with multiple app instances, use PgBouncer:

```yaml
# Add to docker-compose.prod.yml
pgbouncer:
  image: edoburu/pgbouncer
  environment:
    - DATABASE_URL=postgresql://calldoc:secret@postgres:5432/calldoc
    - POOL_MODE=transaction
    - MAX_CLIENT_CONN=200
    - DEFAULT_POOL_SIZE=25
  ports:
    - '6432:6432'
```

Then set `DATABASE_URL` to point to PgBouncer (port 6432).

---

## SSL/TLS

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name calldoc.example.com;

    ssl_certificate     /etc/ssl/calldoc.crt;
    ssl_certificate_key /etc/ssl/calldoc.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Traefik (Docker Labels)

```yaml
# Add to the app service in docker-compose.prod.yml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.calldoc.rule=Host(`calldoc.example.com`)"
  - "traefik.http.routers.calldoc.entrypoints=websecure"
  - "traefik.http.routers.calldoc.tls.certresolver=letsencrypt"
  - "traefik.http.services.calldoc.loadbalancer.server.port=3000"
  - "traefik.http.services.calldoc.loadbalancer.sticky.cookie=true"
```

---

## Scaling

### Multiple App Instances

CallDoc supports horizontal scaling with shared Redis:

```bash
# Scale to 3 instances
APP_REPLICAS=3 docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Requirements for multi-instance:
- **Shared Redis**: All instances must connect to the same Redis
- **Shared PostgreSQL**: All instances must share the same database
- **Sticky sessions**: Socket.io requires sticky sessions (configure in your load balancer)
- **Shared storage**: MinIO/S3 must be accessible from all instances

### Redis Configuration

For production, enable Redis persistence:

```bash
# redis.conf
appendonly yes
appendfsync everysec
maxmemory 512mb
maxmemory-policy allkeys-lru
```

---

## Monitoring

### Health Check

The `/api/health` endpoint returns the system status:

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 86400,
  "connections": {
    "database": "connected",
    "redis": "connected",
    "devlink3": "connected",
    "smdr": "listening"
  }
}
```

### Docker Health Checks

The Docker container includes a built-in health check that polls `/api/health` every 30 seconds.

### Log Aggregation

Container logs use the `json-file` driver with rotation. For centralized logging:

```yaml
# Use Loki driver
logging:
  driver: loki
  options:
    loki-url: "http://loki:3100/loki/api/v1/push"
    labels: "app=calldoc"
```

### Prometheus Metrics (Suggested)

For detailed metrics, add a `/api/metrics` endpoint exposing:
- Active call count
- Agent state distribution
- Request latency histograms
- WebSocket connection count
- Correlation engine match rate

---

## Troubleshooting

### DevLink3 Won't Connect

1. Verify IP Office is reachable: `telnet <IPO_IP> 50797`
2. Check application user credentials in IP Office Manager
3. Verify DevLink3 is enabled in System > Telephony settings
4. Check the app logs: `docker compose logs app | grep DevLink3`
5. Ensure firewall allows TCP 50797 outbound from the CallDoc server

### SMDR Not Receiving Records

1. Verify SMDR is enabled in IP Office Manager
2. Check SMDR is configured to output to the correct IP and port
3. Test connectivity: make a test call, then check `docker compose logs app | grep SMDR`
4. Ensure firewall allows TCP 1150 inbound to the CallDoc server
5. The SMDR writer creates records after call completion (30-60s delay is normal)

### Recordings Not Matching

1. Verify Voicemail Pro is recording to the correct output path
2. Check MinIO bucket exists and is accessible
3. Verify recording ingestion is running: `docker compose logs app | grep Recording`
4. Check the correlation engine stats: `GET /api/devlink3/status`

### Database Connection Issues

1. Check PostgreSQL is running: `docker compose ps postgres`
2. Verify connection string: `docker compose exec app env | grep DATABASE_URL`
3. Test direct connection: `docker compose exec postgres psql -U calldoc -d calldoc -c "SELECT 1;"`

### High Memory Usage

1. Check Redis memory: `docker compose exec redis redis-cli info memory`
2. Check PostgreSQL connections: `SELECT count(*) FROM pg_stat_activity;`
3. Consider increasing container memory limits in docker-compose.prod.yml

---

## Updating

```bash
# 1. Pull the latest image
docker compose pull

# 2. Run any new database migrations
docker compose exec app npm run db:migrate

# 3. Restart services
docker compose up -d

# 4. Verify health
curl http://localhost:3000/api/health
```

For zero-downtime updates with multiple instances:

```bash
# Rolling restart (one at a time)
docker compose up -d --no-deps --scale app=3 app
```

---

## Docker Commands Reference

```bash
# Development
docker compose up -d              # Start all services (dev mode)
docker compose logs -f app        # Follow app logs
docker compose exec app sh        # Shell into the app container

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Database
docker compose exec app npm run db:migrate   # Run migrations
docker compose exec app npm run db:seed      # Seed demo data
docker compose exec app npm run db:studio    # Open Drizzle Studio

# Rebuild
docker compose build --no-cache   # Full rebuild
docker compose down -v            # Stop and remove volumes (DESTRUCTIVE)
```
