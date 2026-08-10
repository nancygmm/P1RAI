# Semana 2 — Runbook

## 1. Habilitar Places API (legacy)

Consola GCP → APIs & Services → **Places API** (la clásica). Ya la tenés
habilitada.

## 2. API key restringida

APIs & Services → Credentials → tu key `ProyectoRAI`:
- **API restrictions**: **Places API** (legacy).
- **Application restrictions**: IPs del equipo (durante desarrollo local,
  agregá tu IP pública actual: `curl ifconfig.me`).

## 3. Setear cuota diaria

APIs & Services → Places API → Quotas → **500 requests/día** o el máximo
que aguante tu presupuesto.

## 4. Variables de entorno para el emulador

Creá `functions/.secret.local` (ya está en .gitignore por `*.local`):

```
PLACES_API_KEY=TU_KEY_REAL
```

Y `functions/.env.local` con la whitelist de IPs (para emulador solo
hacen falta las locales; el middleware hace bypass en modo emulador
pero igual leemos el env):

```
ALLOWED_IPS=127.0.0.1,::1
```

## 5. Producción (cuando toque desplegar)

```bash
firebase functions:secrets:set PLACES_API_KEY
```

Y las IPs del equipo van como env var de la function. Se declaran en
un archivo `functions/.env` (o al deployar). Ejemplo `.env`:

```
ALLOWED_IPS=190.14.129.177,2803:d100:ec40:f19:f52c:1531:4246:56a1
```

## 6. Probar en emulador

Terminal 1:
```bash
cd /Users/nancymazariegos/Documents/Repos/P1RAI/functions
export PLACES_API_KEY="tu_key_real"
export ALLOWED_IPS="127.0.0.1,::1"
npm run serve
```

Verificá que arrancan las 2 funciones: `helloWorld` y `recolectar`.

Terminal 2 — smoke test rápido (gratis, no llega a Places):
```bash
curl http://127.0.0.1:5001/p1raigabyfb/us-central1/helloWorld
```

## 7. Recolección: smoke test con 3 combos (~$1)

Con el emulador arriba, en Terminal 2:
```bash
cd /Users/nancymazariegos/Documents/Repos/P1RAI/functions
MAX=3 npm run recolectar
```

Output esperado:
```
Endpoint : http://127.0.0.1:5001/p1raigabyfb/us-central1/recolectar
Combos   : 3 de 240
Delay    : 1500 ms
---
[1/3] cardiólogo zona 1 ✓ total=20 nuevos=20 upd=0
[2/3] clínica cardiológica zona 1 ✓ total=15 nuevos=8 upd=7
[3/3] cardiólogo zona 9 ✓ total=18 nuevos=18 upd=0
---
OK: 3   ERR: 0   Total documentos escritos: 53
```

## 8. Verificar Firestore

Abrí: **http://127.0.0.1:4000/firestore** → colección `medicos`.
Cada doc con ID = `place_id` y los 9 campos del PDF.

## 9. Recolección completa (opcional, ~$88)

Sin `MAX` corre los 240 combos:
```bash
npm run recolectar
```

Con delay bajo se puede ajustar: `DELAY_MS=500 npm run recolectar`
(cuidado con rate limits de Places).

Contra producción:
```bash
ENDPOINT="https://us-central1-p1raigabyfb.cloudfunctions.net/recolectar" \
  npm run recolectar
```
