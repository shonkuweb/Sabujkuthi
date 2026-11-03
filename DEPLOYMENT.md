# SabujKuthi VPS Deployment Guide

This guide walks you through deploying **SabujKuthi Nursery** on a Linux VPS (Ubuntu/Debian) where other websites and Docker containers are already running.

---

## 1. Prerequisites on VPS

- **Docker** and **Docker Compose** installed.
- An existing reverse proxy (e.g. **Nginx**, **Caddy**, or **Nginx Proxy Manager**) handling ports 80/443 and SSL certificates (Let's Encrypt).
- A domain name (e.g. `sabujkuthi.com`) with DNS A records pointing to your VPS IP address.

---

## 2. Clone the Repository

On your VPS:

```bash
git clone https://github.com/shonkuweb/Sabujkuthi.git
cd Sabujkuthi
```

---

## 3. Configure Environment Variables

Create your production `.env` file from the example:

```bash
cp .env.example .env
nano .env
```

Ensure the following variables are set:

```ini
ADMIN_PASSWORD=your_strong_admin_password
ADMIN_SESSION_SECRET=long_random_session_secret_at_least_32_characters

# Persistent SQLite path inside Docker container
DATABASE_URL=file:/data/dev.db

# Razorpay Keys
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_long_random_webhook_secret

# Your live public site domain (HTTPS)
NEXT_PUBLIC_SITE_URL=https://sabujkuthi.com

# Port to expose on VPS localhost (change if 3005 is used by another app)
APP_PORT=3005

# Cloudflare R2 Image CDN
R2_ACCOUNT_ID=d098e896b8f7dc0403ad3a16f592dfe6
R2_ACCESS_KEY_ID=f95b6dce449f4bb721ce54aa3b2f4e2b
R2_SECRET_ACCESS_KEY=401cb76e46f0f908fcd78b5b2fbd75e92a4bbc1d26adbffbb3c37ef14fcc2ca1
R2_BUCKET_NAME=chf-media
R2_PUBLIC_URL=https://pub-ce8688bc6c654bcfb99716f7c9373bcd.r2.dev
```

---

## 4. Prepare Persistent Storage Folder

Docker mounts `./data` to `/data` in the container to store the SQLite database (`dev.db`).

Create the directory and ensure write permissions for the container's non-root user (UID 1001):

```bash
mkdir -p data
# Grant write permission so the node process inside Docker can update dev.db and write WAL files
chmod 775 data
```

---

## 5. Build and Start the Docker Container

Run:

```bash
docker compose up -d --build
```

To verify the container is running and healthy:

```bash
docker compose ps
docker compose logs -f
```

The app will be running and listening locally at `127.0.0.1:3005`.

---

## 6. Configure Reverse Proxy on Host

Because other projects are running on the VPS, your host's reverse proxy routes web traffic from your domain to `http://127.0.0.1:3005`.

### Option A: Host Nginx

Add a server block to `/etc/nginx/sites-available/sabujkuthi`:

```nginx
server {
    server_name sabujkuthi.com www.sabujkuthi.com;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it and obtain an SSL certificate:

```bash
sudo ln -s /etc/nginx/sites-available/sabujkuthi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d sabujkuthi.com -d www.sabujkuthi.com
```

### Option B: Nginx Proxy Manager (GUI)
1. Add a **Proxy Host**.
2. Domain Names: `sabujkuthi.com`, `www.sabujkuthi.com`
3. Scheme: `http`
4. Forward Hostname / IP: `host.docker.internal` (or your VPS local IP `172.17.0.1` / `127.0.0.1`)
5. Forward Port: `3005`
6. Under SSL, request a new Let's Encrypt certificate and enable **Force SSL**.

---

## 7. Useful Maintenance Commands

- **View Live Logs:** `docker compose logs -f`
- **Restart Container:** `docker compose restart`
- **Rebuild after Git Pull:**
  ```bash
  git pull
  docker compose up -d --build
  ```
- **Backup Database:**
  ```bash
  cp data/dev.db ~/backups/dev_$(date +%F).db
  ```
