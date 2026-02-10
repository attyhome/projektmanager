<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ProjektMester MVP - Projektkezelő Alkalmazás

Teljes körű projektmenedzsment rendszer építési és kivitelezési projektekhez.

## 🚀 Lokális Futtatás

### Előfeltételek
- Node.js (v18 vagy újabb)

### Telepítési Lépések

1. **Függőségek telepítése:**
   ```bash
   npm install
   ```

2. **Állítsd be a `GEMINI_API_KEY`-t** a [.env.local](.env.local) fájlban:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
   
   *API kulcs beszerzése:* https://aistudio.google.com/app/apikey

3. **Adatbázis inicializálása:**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Futtasd az alkalmazást:**
   ```bash
   npm run dev:all
   ```
   
   Az alkalmazás elérhető: http://localhost:5173

### Alternatív Indítási Módok

- **Csak frontend:** `npm run dev` (port 5173)
- **Csak backend:** `npm run dev:server` (port 3000)
- **Mindkettő:** `npm run dev:all`

## 🐳 Docker Használat

```bash
docker-compose up --build
```

Az alkalmazás elérhető: http://localhost:3000

## 📚 További Dokumentáció

- **Coolify Deploy:** Lásd a [COOLIFY_DEPLOY.md](COOLIFY_DEPLOY.md) fájlt
- **Javítások & Változások:** Lásd a [JAVITASOK.md](JAVITASOK.md) fájlt

## 🔧 Fejlesztői Parancsok

| Parancs | Leírás |
|---------|--------|
| `npm run dev` | Frontend fejlesztői szerver |
| `npm run dev:server` | Backend API szerver |
| `npm run dev:all` | Frontend + Backend egyszerre |
| `npm run build` | Production build |
| `npx prisma studio` | Adatbázis GUI |

## 🌟 Funkciók

- ✅ Projekt kezelés (létrehozás, szerkesztés, törlés)
- ✅ Feladat követés (státusz, határidők)
- ✅ Anyagköltség nyilvántartás
- ✅ Költségvetés kezelés
- ✅ Fájlfeltöltés
- ✅ PDF export
- ✅ Többfelhasználós rendszer
