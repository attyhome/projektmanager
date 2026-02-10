# 🚀 ProjektMester MVP - Coolify Telepítési Útmutató

## 📦 Előkészületek

### 1. **Git Repository Létrehozása**
```bash
cd projektmester-mvp
git init
git add .
git commit -m "Initial commit - Coolify ready"
git remote add origin https://github.com/felhasznalonev/projektmester-mvp.git
git push -u origin main
```

---

## 🔧 Coolify Telepítés Lépésről Lépésre

### 1. **Új Projekt Létrehozása Coolify-ban**

1. Jelentkezz be a Coolify dashboard-ba
2. Kattints a **"+ New Resource"** gombra
3. Válaszd a **"Public Repository"** opciót
4. Add meg a GitHub/GitLab repository URL-t

---

### 2. **Build Beállítások**

A Coolify automatikusan felismeri a `Dockerfile`-t és `docker-compose.yml`-t.

**Build Pack:** `Docker Compose` vagy `Dockerfile`

**Build Command:** (üresen hagyható, a Dockerfile mindent kezel)
```bash
# Opcionális: ha külön akarod futtatni
npm run prisma:generate && npm run build
```

**Start Command:** (a Dockerfile CMD utasítása)
```bash
node --loader ts-node/esm server.ts
```

---

### 3. **Environment Variables Beállítása**

Coolify Dashboard → Project → Environment Variables:

```env
DATABASE_URL=file:/app/data/dev.db
GEMINI_API_KEY=YOUR_REAL_API_KEY_HERE
PORT=3000
NODE_ENV=production
STORAGE_PATH=/app/uploads
FRONTEND_URL=https://your-app.coolify.io
```

⚠️ **FONTOS:**
- A `GEMINI_API_KEY`-t MINDENKÉPPEN cseréld le a sajátodra!
- Szerezd be itt: https://aistudio.google.com/app/apikey
- A `FRONTEND_URL` legyen a Coolify által adott domain (pl. `https://projektmester.coolify.io`)

---

### 4. **Volumes/Storage Beállítása**

Coolify Dashboard → Storages fülön add hozzá:

**Volume 1 - Database:**
- **Source:** `/app/data`
- **Destination:** (automatikus persistent storage)
- **Purpose:** SQLite adatbázis megőrzése

**Volume 2 - Uploads:**
- **Source:** `/app/uploads`
- **Destination:** (automatikus persistent storage)
- **Purpose:** Feltöltött fájlok megőrzése

---

### 5. **Port Mapping**

- **Container Port:** `3000`
- **Public:** ✅ Igen
- **Coolify automatikusan** generál egy domain-t, pl: `https://projektmester-abc123.coolify.io`

---

### 6. **Health Check Beállítás**

Coolify Dashboard → Health Checks:

- **Path:** `/health`
- **Port:** `3000`
- **Method:** `GET`
- **Interval:** `30s`
- **Timeout:** `10s`
- **Retries:** `3`

---

### 7. **Deploy! 🎉**

1. Kattints a **"Deploy"** gombra
2. Várj kb. 2-5 percet (első build lassabb lehet)
3. Nézd a **Deployment Logs**-ot, hogy minden rendben megy-e

---

## ✅ Ellenőrzés

Deploy után látogass el a Coolify által adott URL-re:

```
https://your-app.coolify.io
```

Tesztelendő:
- ✅ Főoldal betöltődik
- ✅ Be tudsz lépni (regisztráció/login)
- ✅ Projektet tudsz létrehozni
- ✅ Fájlt tudsz feltölteni
- ✅ PDF export működik

---

## 🔍 Troubleshooting

### Probléma: "Application failed to start"

**Ellenőrizd a logokat:**
```bash
# Coolify Logs fülön nézd meg a build log-ot
```

**Gyakori okok:**
1. Hiányzó `GEMINI_API_KEY`
2. Port már használatban (ellenőrizd a port mapping-et)
3. Prisma migration nem futott le

**Megoldás:**
```bash
# Coolify Terminal-ján belül:
npx prisma migrate deploy
npx prisma generate
```

---

### Probléma: "Database locked" vagy "SQLITE_BUSY"

**Ok:** Volume nem persistent

**Megoldás:**
- Ellenőrizd, hogy a `/app/data` volume persistent storage-hoz van kötve
- Indítsd újra a konténert

---

### Probléma: Fájlfeltöltés nem működik

**Ok:** Upload volume hiányzik vagy nincs írási jog

**Megoldás:**
```bash
# Coolify Terminal:
mkdir -p /app/uploads
chmod 777 /app/uploads
```

---

### Probléma: CORS Error a frontend-ben

**Ok:** `FRONTEND_URL` nem megfelelő

**Megoldás:**
- Állítsd be a `FRONTEND_URL` environment változót a Coolify által adott domain-re
- Pl: `FRONTEND_URL=https://projektmester.coolify.io`

---

## 🔄 Auto-Deploy Beállítása

Coolify automatikusan újra-deploy-ol Git push esetén:

1. **Coolify Dashboard** → Settings → Git
2. Kapcsold be az **"Auto Deploy"** opciót
3. **Branch:** `main` vagy `master`
4. **Deploy Strategy:** `Rolling` (zero-downtime deploy)

Most minden `git push` automatikusan deploy-ol! 🚀

---

## 📊 Monitoring

Coolify beépített monitoring-ja:
- **CPU használat**
- **Memory használat**
- **Network I/O**
- **Logs** (real-time)

Coolify → Metrics fülön láthatod az összes statisztikát.

---

## 🔐 Backup

### Automatikus Backup Beállítása:

1. Coolify Dashboard → Backups
2. **Enable Scheduled Backups:** ✅
3. **Backup Frequency:** `Daily` vagy `Weekly`
4. **Retention:** `7 days` (vagy több)
5. **Include Volumes:** `/app/data` és `/app/uploads`

**Manuális backup:**
```bash
# Coolify Terminal:
cd /app/data
tar -czf backup-$(date +%Y%m%d).tar.gz dev.db
# Letölthető a Coolify Files fülön
```

---

## 🎯 Következő Lépések

Miután fut a Coolify-on:

1. **Custom Domain:** Kötsd hozzá saját domain-edet
2. **SSL:** Coolify automatikusan generál Let's Encrypt SSL-t
3. **Skálázás:** Növeld a resource limit-eket, ha szükséges
4. **CI/CD:** Állítsd be GitHub Actions-t automatikus tesztelésre

---

## 💡 Hasznos Tippek

### Performance Optimalizálás:
- Növeld a container memory limit-et 512MB-ról 1GB-ra nagy projektekhez
- Használj Redis cache-t (Coolify Redis service)

### Security:
- Változtasd meg az alapértelmezett admin jelszót azonnal
- Használj erős `JWT_SECRET`-et production-ben
- Korlátozd a rate limit-et (pl. `express-rate-limit`)

---

## 📞 Támogatás

Ha elakadtál:
1. Nézd meg a Coolify dokumentációt: https://coolify.io/docs
2. Discord community: https://coolify.io/discord
3. GitHub Issues: https://github.com/coollabsio/coolify

---

**Sikeres deploy-t! 🎉**
