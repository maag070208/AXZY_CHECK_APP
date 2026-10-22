# CheckApp APP — Offline para GUARD y MAINT

> **Estado:** propuesta de diseño · v0.1 · 2026-10-21  
> **Alcance:** APP móvil, roles `GUARD` y `MAINT`.  
> **No implementar hasta aprobar este documento.**

---

## 1. Objetivo

Permitir que guardias y personal de mantenimiento trabajen aunque la red falle o no
haya señal:

- Iniciar/terminar una ronda.
- Escanear puntos y capturar su reporte.
- Crear reportes de incidencia, mantenimiento y Casa Club.
- Adjuntar fotos/videos y subirlos después.
- Ver sus rutas/asignaciones y reportes recientes cacheados.

La app debe ser **local-first** para estas operaciones: primero guarda en el
dispositivo, después sincroniza. El servidor sigue siendo la fuente de verdad para
la operación global (dashboard, historial, administración).

---

## 2. Alcance

### 2.1 Roles

| Rol | Offline |
|---|---|
| `GUARD` | Sí, completo para operación de ronda y reportes. |
| `MAINT` | Sí, para sus reportes, rutas/rutinas y mantenimiento. |
| `ADMIN`, `SHIFT`, `RESDN` | No. Se mantiene el comportamiento online actual. |

Si el usuario autenticado no es `GUARD`/`MAINT`, el modo offline no se activa y la
app muestra el estado de “Sin conexión” existente.

### 2.2 Funcionalidades offline incluidas

| Módulo | Lectura offline | Escritura offline |
|---|---:|---:|
| Home de guardia/mantenimiento | Sí (último snapshot) | — |
| Rutas, puntos y tareas asignadas | Sí | — |
| Ronda actual | Sí | Iniciar, terminar |
| Escaneo de punto | Sí (validación local de ruta) | Crear reporte, marcar incompleto |
| Evidencias foto/video | Sí (archivos locales) | Capturar y encolar |
| Incidencias | Catálogo cacheado | Crear |
| Mantenimiento (reporte) | Catálogo cacheado | Crear |
| Casa Club | Catálogo cacheado | Crear |
| Mantenimiento (lista/detalle) | Última copia | Resolver (fase 2) |
| Mis asignaciones | Última copia | — |

### 2.3 Fuera de alcance

- Verificación de pases en Caseta: **siempre online** (seguridad).
- Chat, notificaciones push en tiempo real y alertas del dashboard.
- Administración, residentes, propiedades, usuarios y horarios.
- Descarga de reportes/historial completo.
- Resolución de conflictos automática sin intervención cuando el servidor
  contradice la operación local.

---

## 3. Principios

1. **Local-first, server-authoritative.** La UI nunca espera a la red para
   confirmar una captura; el servidor manda al sincronizar.
2. **Nada se pierde.** Toda escritura se guarda en SQLite + outbox antes de
   mostrarse como completada.
3. **Idempotencia.** Reintentar una operación nunca debe duplicar reportes,
   rondas, escaneos ni evidencias.
4. **Dependencias explícitas.** La cola respeta el orden ronda → escaneos →
   terminar ronda y evidencia → reporte.
5. **Conflicto visible.** Si el servidor rechaza o contradice algo, no se
   sobrescribe en silencio: se marca `CONFLICT` y se muestra al usuario.
6. **Sin datos sensibles innecesarios.** No se guardan tokens de pases, datos de
   residentes ni credenciales en el almacenamiento offline.
7. **El modo offline solo aplica a los roles definidos.** No se encola nada de
   ADMIN/SHIFT/RESDN.

---

## 4. Decisiones técnicas propuestas

| # | Decisión | Elección | Motivo |
|---|---|---|---|
| D1 | Base local | **SQLite** (`@op-engineering/op-sqlite`) | Transacciones, índices, outbox y consultas por estado; AsyncStorage no es suficiente. |
| D2 | Archivos | **`react-native-file-access`** | Copiar/mover/borrar fotos y videos de forma confiable; los URIs de cámara suelen estar en caché. |
| D3 | Red | **`@react-native-community/netinfo`** (ya instalado) + intento real | `isConnected` por sí solo no garantiza que la API responda. |
| D4 | Cola | **Transactional outbox** en SQLite | Escritura local y encolado en la misma transacción. |
| D5 | Sync | **Push por entidad a los endpoints REST existentes** con `Idempotency-Key`; pull con GETs actuales (fase 1) y `/sync/pull` opcional después | Menos cambios iniciales; el backend debe aceptar idempotencia y `clientId`. |
| D6 | IDs | **UUID local** `clientId` + mapeo a `serverId` | Permite crear offline y reconciliar al volver la red. |
| D7 | Evidencias | Archivo local + `clientMediaId` | Se sube antes de crear el reporte; el reporte referencia URLs finales. |
| D8 | Conflictos | Servidor gana + bandeja de conflictos | Evita corrupción de datos globales. |
| D9 | Sesión offline | Token + ventana de gracia de 24 h desde la última autenticación online | Permite trabajar sin red sin crear sesiones eternas. |
| D10 | Cifrado | SQLCipher si `op-sqlite` lo permite; si no, datos mínimos y borrado al cerrar sesión | Protección en dispositivo perdido. |
| D11 | Background sync | No en fase 1; foreground/reconnect/manual | WorkManager/Headless JS se evalúa al final. |

> D1 y D2 agregan dependencias nativas; requieren rebuild del APK.

---

## 5. Arquitectura

```text
┌──────────────────────────── UI ────────────────────────────┐
│ GuardDashboard · CheckReport · ReportForm · Maintenance      │
└───────────────▲───────────────────────────────┬─────────────┘
                │                               │
        hooks/useOfflineState           comandos de dominio
                │                               │
┌───────────────┴───────────────────────────────▼─────────────┐
│ Repositorios (rounds, checks, reports, media, catalogs)     │
│  - lectura local primero                                    │
│  - escritura local + outbox en una transacción              │
└───────────────▲───────────────────────────────┬─────────────┘
                │                               │
          SQLite (op-sqlite)              File System (media)
                │                               │
┌───────────────┴───────────────────────────────▼─────────────┐
│ Sync Engine                                                 │
│  - worker único, dependencias topológicas                   │
│  - reintentos/backoff, idempotencia, conflictos             │
│  - NetInfo + AppState + triggers manuales                   │
└───────────────────────────────┬─────────────────────────────┘
                                │ HTTPS
                        API CheckApp existente
```

### Capas

- **Dominio:** reglas de ronda/punto/reporte, sin React ni red.
- **Repositorios:** única puerta a SQLite; la UI no escribe SQL directo.
- **Outbox/Sync Engine:** worker independiente de pantallas.
- **UI:** consume estado local y `syncState`; nunca bloquea por red.

No se guarda la cola en Redux. Redux solo mantiene sesión/UI; la durabilidad vive
en SQLite.

---

## 6. Modelo local

### 6.1 Tablas principales

```sql
-- Cola de operaciones pendientes
CREATE TABLE outbox (
  id                TEXT PRIMARY KEY,       -- UUID del intento
  entity_type       TEXT NOT NULL,          -- ROUND | CHECK | REPORT | MEDIA
  entity_client_id  TEXT NOT NULL,
  operation         TEXT NOT NULL,          -- ROUND_START | CHECK_CREATE | ...
  payload_json      TEXT NOT NULL,
  depends_on        TEXT,                   -- outbox.id o clientId padre
  status            TEXT NOT NULL,          -- QUEUED | SYNCING | FAILED | CONFLICT | DEAD_LETTER
  attempts          INTEGER NOT NULL DEFAULT 0,
  next_attempt_at   INTEGER,
  last_error        TEXT,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

-- Rondas locales
CREATE TABLE local_rounds (
  client_id         TEXT PRIMARY KEY,
  server_id         INTEGER,
  guard_id          INTEGER NOT NULL,
  route_id          INTEGER,
  route_title       TEXT,
  status            TEXT NOT NULL,          -- IN_PROGRESS_LOCAL | ENDED_PENDING | SYNCED | CONFLICT
  started_at        INTEGER NOT NULL,
  ended_at          INTEGER,
  sync_state        TEXT NOT NULL,
  last_error        TEXT
);

-- Puntos escaneados / reportes de check
CREATE TABLE local_checks (
  client_id         TEXT PRIMARY KEY,
  server_id         INTEGER,
  round_client_id   TEXT,
  location_id       INTEGER NOT NULL,
  location_name     TEXT,
  status            TEXT NOT NULL,          -- DRAFT | COMPLETED_LOCAL | INCOMPLETE_LOCAL | SYNCED | CONFLICT
  notes             TEXT,
  tasks_json        TEXT,
  scanned_at        INTEGER,
  completed_at      INTEGER,
  sync_state        TEXT NOT NULL,
  last_error        TEXT
);

-- Reportes (incidencia, mantenimiento, casa club)
CREATE TABLE local_reports (
  client_id         TEXT PRIMARY KEY,
  server_id         INTEGER,
  kind              TEXT NOT NULL,          -- INCIDENT | MAINTENANCE | CLUB
  type_id           INTEGER,
  category_id       INTEGER,
  title             TEXT,
  description       TEXT,
  latitude          REAL,
  longitude         REAL,
  created_at        INTEGER NOT NULL,
  sync_state        TEXT NOT NULL,
  last_error        TEXT
);

-- Evidencias
CREATE TABLE local_media (
  client_id         TEXT PRIMARY KEY,
  report_client_id  TEXT,
  check_client_id   TEXT,
  kind              TEXT NOT NULL,          -- IMAGE | VIDEO
  local_path        TEXT NOT NULL,
  mime_type         TEXT,
  bytes             INTEGER,
  server_url        TEXT,
  status            TEXT NOT NULL,          -- PENDING | UPLOADING | UPLOADED | FAILED
  attempts          INTEGER NOT NULL DEFAULT 0
);

-- Caché de catálogos/rutas y estado de sync
CREATE TABLE catalog_cache (
  cache_key         TEXT PRIMARY KEY,       -- routes | locations | incident_types | ...
  payload_json      TEXT NOT NULL,
  fetched_at        INTEGER NOT NULL,
  expires_at        INTEGER
);

CREATE TABLE sync_state (
  key               TEXT PRIMARY KEY,       -- last_pull_at | last_sync_at | device_id
  value             TEXT
);

CREATE TABLE sync_conflicts (
  id                TEXT PRIMARY KEY,
  entity_client_id  TEXT NOT NULL,
  entity_type       TEXT NOT NULL,
  server_message    TEXT,
  payload_json      TEXT,
  created_at        INTEGER NOT NULL,
  resolved_at       INTEGER
);
```

### 6.2 Estados que ve la UI

Separar **estado operativo** de **estado de sincronización**:

- Operativo del punto: `PENDING`, `NOT_COMPLETED`, `COMPLETED`.
- Sync: `LOCAL_DRAFT`, `QUEUED`, `SYNCING`, `SYNCED`, `FAILED`, `CONFLICT`.

Una card puede decir “Completada” y además “Pendiente de sincronizar”. No se
debe reutilizar `COMPLETED` para indicar que ya llegó al servidor.

### 6.3 Archivos

```text
Documents/checkapp/offline/{userId}/media/{clientMediaId}.jpg
Documents/checkapp/offline/{userId}/media/{clientMediaId}.mp4
```

- Las fotos se comprimen antes de persistir (1024 px, calidad 0.8).
- Los videos se guardan y comprimen antes de subir; límite actual 60 s.
- No se guardan archivos en `cache/`, porque Android puede borrarlos.
- Se eliminan después de que el reporte padre quede `SYNCED` + 24 h.
- Cuota sugerida: **250 MB por usuario**; aviso al 80 %, bloqueo de nuevas
  evidencias al 100 % con acción “Liberar espacio”.

---

## 7. Flujos UX

### 7.1 Indicador global

En el header/Home:

- `En línea` (verde, discreto).
- `Sin conexión · 3 pendientes` (ámbar).
- `Sincronizando 2/3…` (azul).
- `Error de sincronización` (rojo) → abre detalle/reintentar.
- `Todo sincronizado` (check verde, temporal).

No usar el modal `NoInternetScreen` para `GUARD`/`MAINT`: la app debe seguir
siendo usable. Para otros roles se conserva el bloqueo online.

### 7.2 Iniciar ronda offline

1. El guardia elige ruta (cacheada).
2. Se crea `local_round` con `clientId`.
3. Se muestra “Ronda en curso · pendiente de sincronizar”.
4. Al volver la red, se hace `ROUND_START`; el servidor devuelve `serverId`.
5. Se actualiza la ronda local y se disparan los checks dependientes.

Si el servidor responde que ya hay otra ronda activa:

- `CONFLICT`: “Ya existe una ronda activa en el servidor”.
- Opciones: **usar la del servidor** (descarta/archiva la local) o **cerrar la
  local y reintentar**; nunca se fusionan puntos automáticamente.

### 7.3 Escanear un punto offline

1. La validación del QR es local: payload firmado CheckApp + pertenencia a la
   ruta cacheada + no completado localmente.
2. Se crea `local_check` `DRAFT` y se abre el reporte.
3. Si el guardia sale sin terminar: `INCOMPLETE_LOCAL`, se encola el check con
   estado incompleto.
4. Si termina: `COMPLETED_LOCAL`, tareas/observaciones/evidencias locales.
5. Al sincronizar: primero media, luego `CHECK_CREATE`; respuesta `serverId` y
   `status` final. Si el servidor lo marca incompleto por falta de evidencia, se
   refleja con la regla actual (sin evidencia = `NOT_COMPLETED`).

### 7.4 Terminar ronda offline

- Se marca `ENDED_PENDING`; no se borra la ronda local.
- La cola espera a que todos los checks/media de esa ronda estén sincronizados.
- Se envía `ROUND_END`.
- Si el servidor ya la cerró: se marca `SYNCED` idempotente.
- Si falla la validación: `CONFLICT` con acción de revisar.

### 7.5 Reportes de incidencia/mantenimiento/Casa Club

1. Se elige tipo (catálogo cacheado).
2. Se crea `local_report` + media local en una transacción.
3. La UI muestra “Reporte guardado · pendiente de sincronizar”.
4. La cola sube media y luego crea el reporte.
5. Si no hay red al guardar, nunca se muestra error de envío; se muestra pendiente.

### 7.6 Cerrar sesión con pendientes

Diálogo:

- “Tienes 3 elementos sin sincronizar.”
- **Sincronizar ahora**.
- **Salir y conservar** (solo si el mismo usuario vuelve; datos cifrados/por usuario).
- **Descartar pendientes** (rojo, confirmación adicional).

Nunca borrar la cola en silencio.

---

## 8. Sincronización

### 8.1 Outbox

Cada operación se inserta en la misma transacción que el dato local:

```text
BEGIN;
  INSERT local_reports(...);
  INSERT outbox(...);  -- REPORT_CREATE
COMMIT;
```

El worker:

1. Toma operaciones `QUEUED` con `next_attempt_at <= now`.
2. Respeta dependencias (`depends_on`).
3. Procesa una escritura a la vez (media puede tener concurrencia 2).
4. Actualiza `sync_state` y notifica a la UI.
5. Al terminar, intenta la siguiente.

### 8.2 Tipos de operación y dependencias

| Operación | Depende de |
|---|---|
| `MEDIA_UPLOAD` | — |
| `ROUND_START` | — |
| `CHECK_CREATE` | `ROUND_START` + media del check |
| `ROUND_END` | `CHECK_CREATE` de sus puntos + media |
| `INCIDENT_CREATE` | media del reporte |
| `MAINTENANCE_CREATE` | media del reporte |
| `CLUB_CREATE` | media del reporte |
| `MAINTENANCE_RESOLVE` (fase 2) | — |

### 8.3 Idempotencia (obligatoria en backend)

- `clientId` UUID generado en el dispositivo.
- Header `Idempotency-Key: <clientId>` en cada POST/PUT.
- El backend debe:
  - Aceptar y persistir `clientId`.
  - Devolver la entidad existente si llega el mismo `clientId`.
  - Tener índice único por (`userId`, `clientId`, `entityType`).
- Los medios usan `clientMediaId` como clave de idempotencia.

Sin esto, un reintento puede duplicar reportes.

### 8.4 Push

Fase 1: una llamada por entidad a los endpoints actuales.

```text
POST /rounds/start            { clientId, recurringConfigId, startedAt }
PUT  /rounds/:id/end          { clientId, endedAt }
POST /kardex                  { clientId, roundClientId, locationId, notes, tasks, media, scannedAt }
POST /incidents               { clientId, ... }
POST /maintenance             { clientId, ... }
POST /club                    { clientId, ... }
POST /uploads                 (multipart, Idempotency-Key: clientMediaId)
```

El backend responde con `{ id, status, updatedAt }`; se guarda `serverId`.

### 8.5 Pull / caché

Fase 1 (sin endpoint nuevo):

- `GET /recurring/my-list`
- `GET /rounds/current`
- `GET /rounds?status=IN_PROGRESS`
- catálogos de tipos de incidencia/mantenimiento/club
- listas de mantenimiento/incidencias propias

Se guardan por `cache_key` con `fetched_at`.

- TTL de catálogos: **24 h**.
- TTL de rutas/asignaciones: **12 h**.
- Si el cache está vencido y no hay red: mostrar datos con etiqueta
  “Actualizado hace X” y permitir operar solo si la ruta pertenece al cache.
- Si no hay cache inicial: bloquear operación offline con mensaje
  “Conéctate una vez para descargar tus rutas”.

Fase 2 opcional: `GET /sync/pull?since=<timestamp>` con cambios incrementales.

### 8.6 Disparadores

- Al iniciar la app y al hacer login.
- Al recuperar conectividad (`NetInfo` + verificación real).
- Al volver a foreground (`AppState`).
- Después de cada escritura local (si hay red).
- Manual “Sincronizar ahora”.
- Cada 5 min mientras la app está activa y hay pendientes.
- No se promete sincronización en segundo plano en fase 1.

### 8.7 Reintentos y backoff

- Error de red / 5xx / timeout: reintentar.
- Backoff: 2 s, 10 s, 30 s, 2 min, 10 min (con jitter).
- Máximo 10 intentos → `DEAD_LETTER`, visible en “Problemas de sincronización”.
- 401: pausar cola, pedir re-login; no borrar pendientes.
- 409: `CONFLICT`, no reintentar automáticamente.
- 400/422: error de validación; guardar `last_error` y pedir corrección.
- Cada intento conserva el mismo `clientId`/`Idempotency-Key`.

### 8.8 Conflictos

| Caso | Regla |
|---|---|
| Ronda local + ronda activa del servidor | `CONFLICT`; el usuario elige. |
| Check duplicado | Idempotencia devuelve el existente; se mapea. |
| Check en punto ya completado en servidor | Marcar `CONFLICT`/duplicado; no crear otro. |
| Reporte ya creado | Devolver existente por `clientId`. |
| Media ya subida | Devolver URL existente. |
| Reloj del dispositivo desfasado | Enviar `occurredAt` y `receivedAt`; servidor valida ±10 min. |

No hay “last write wins” para rondas ni checks: son eventos operativos.

---

## 9. Cambios requeridos en API/DB

> **Bloqueante:** sin estos cambios no se puede garantizar la sincronización.

1. Middleware de **Idempotency-Key**.
2. Columnas `clientId` (UUID) + índices únicos en:
   - `Round`
   - `Kardex`
   - `Incident`
   - `Maintenance`
   - `ClubReport`
3. `Round` debe aceptar `clientId`, `startedAt` y `endedAt` del cliente.
4. `Kardex` debe aceptar `clientId`, `roundClientId` (o `roundId`) y `scannedAt`.
5. Endpoints de creación deben devolver la entidad existente si el `clientId`
   ya fue procesado.
6. Respuesta `409` tipada para ronda activa/duplicados.
7. `/uploads` debe aceptar `clientMediaId` y ser idempotente.
8. Opcional fase 2: `GET /sync/pull?since=...` y `POST /sync/push` batch.

---

## 10. Medios

- Captura → copiar a Documents → comprimir foto → registrar `local_media`.
- Video: guardar, comprimir antes de subir, mantener original hasta confirmar.
- Al crear un reporte/check, se crean registros `MEDIA_UPLOAD` y se enlazan por
  `depends_on`.
- Si una media falla, el reporte queda `QUEUED`; no se envía sin sus evidencias.
- La UI debe mostrar progreso por archivo (“Subiendo 1/3”).
- Política de reintento igual que la cola.
- Limpieza:
  - Éxito + reporte padre `SYNCED`: borrar archivo local tras 24 h.
  - Cancelación del usuario: borrar archivo y registros locales.
  - Logout con pendientes: no borrar; advertir.

---

## 11. Autenticación y sesión offline

- El login inicial requiere red.
- Se guarda el token actual (ya persistido por `redux-persist`).
- Ventana de gracia offline: **24 h** desde la última autenticación online.
- Mientras esté vigente: permitir operaciones offline.
- Si expira:
  - No borrar la cola.
  - Bloquear nuevas operaciones y mostrar “Conéctate para renovar sesión”.
  - Al reautenticar, reanudar la cola del mismo `userId`.
- No ejecutar el logout automático actual por expiración de token si el usuario
  está offline y tiene pendientes; solo pausar sync.
- Logout manual con pendientes: diálogo de la sección 7.6.

---

## 12. Seguridad y privacidad

- No guardar tokens de pases, QR de residentes ni datos de invitados.
- Datos offline mínimos: rutas/puntos asignados, reportes propios, fotos/videos.
- SQLite cifrado si la librería lo permite; si no, evaluar SQLCipher antes de
  producción.
- Archivos en el sandbox de la app; sin exportación pública.
- Borrado de datos operativos al cerrar sesión **solo** cuando no haya pendientes
  o el usuario confirme descartarlos.
- Un usuario no debe ver la cola de otro: tablas y directorios por `userId`.
- Ofuscar/limpiar logs de payloads; no loggear tokens ni URLs firmadas.

---

## 13. Observabilidad y errores

- Pantalla “Sincronización” (accesible desde el indicador) con:
  - Pendientes por tipo.
  - Último intento/error.
  - Botón “Reintentar todo”.
  - “Problemas”/conflictos.
- Logs locales rotativos (máx. 7 días), sin PII.
- Métricas internas opcionales: duración de sync, reintentos, tasa de conflictos.
- No mostrar stack traces al guardia; mensajes en español y acción clara.

---

## 14. Plan de implementación

### Fase 0 — Aprobación (este documento)

- Confirmar decisiones D1–D11.
- Confirmar cambios de backend (sección 9).
- Definir si la ronda puede iniciarse offline (recomendado: sí, con clientId).

### Fase 1 — Infraestructura

- Instalar SQLite y file-access; migraciones.
- Repositorios y outbox transaccional.
- Sync engine con worker, backoff e idempotencia.
- Estado de red y banner; reemplazar el bloqueo global para GUARD/MAINT.
- Cache de catálogos/rutas.

### Fase 2 — Reportes + medios

- Incidencia, mantenimiento y Casa Club offline.
- Captura/compresión/copia de foto y video.
- Cola de media + creación de reportes.
- UI de pendientes y reintento.

### Fase 3 — Rondas

- Inicio/fin de ronda local.
- Check de punto offline, estados locales.
- Dependencias ronda → checks → fin.
- Conflictos de ronda activa.

### Fase 4 — Mantenimiento extendido

- Lista/detalle cacheado.
- Resolver mantenimiento offline (si el backend lo permite).

### Fase 5 — Hardening

- Cifrado, cuotas, background sync, métricas, pruebas de caos.

---

## 15. Pruebas

### Unitarias

- Máquina de estados de outbox y backoff.
- Dependencias y orden de operaciones.
- Mapeo `clientId` → `serverId`.
- Reglas de conflicto.
- Cuota/limpieza de media.

### Integración

- Repositorios con SQLite en memoria.
- Mock de API: éxito, 500, 401, 409, timeout, duplicado.
- Reinicio de app a mitad de sync.

### E2E (Maestro)

1. Login online.
2. Activar modo avión / deshabilitar Wi-Fi.
3. Crear reporte con foto y un check.
4. Matar y reabrir la app: los pendientes siguen.
5. Restaurar red.
6. Verificar sync y que el servidor tenga exactamente un registro.
7. Repetir con dos dispositivos/conflicto de ronda.

Comandos de red para el dispositivo de pruebas:

```bash
adb shell svc wifi disable
adb shell svc data disable
# restaurar
adb shell svc wifi enable
adb shell svc data enable
```

### Casos límite

- Token expirado offline.
- Almacenamiento lleno.
- Reloj desfasado.
- App cerrada durante upload.
- Servidor 500 persistente.
- Mismo guardia en dos dispositivos.
- Cambio de usuario con cola pendiente.

---

## 16. Criterios de aceptación

- [ ] Un GUARD/MAINT puede iniciar y terminar una ronda sin red.
- [ ] Puede escanear/completar un punto y adjuntar foto/video sin red.
- [ ] Puede crear incidencia/mantenimiento/Casa Club sin red.
- [ ] Cerrar y reabrir la app no pierde pendientes.
- [ ] Al volver la red, todo se sincroniza una sola vez (sin duplicados).
- [ ] Los conflictos se muestran y no se pierden datos.
- [ ] La UI indica claramente “pendiente” vs “sincronizado”.
- [ ] ADMIN/SHIFT/RESDN no usan la cola offline.
- [ ] Logout no borra pendientes sin confirmación.
- [ ] La verificación de pases sigue siendo online.

---

## 17. Decisiones abiertas para aprobar

1. ¿Se permite **iniciar ronda offline** desde el día 1? (Recomendado: sí.)
2. ¿SQLite + SQLCipher o SQLite sin cifrar en fase 1?
3. ¿Cuota de evidencias: 250 MB o 500 MB por usuario?
4. ¿Se permite resolver mantenimiento offline en fase 1 o fase 2?
5. ¿Ventana de gracia offline: 24 h o 12 h?
6. ¿El backend puede implementar `clientId` + `Idempotency-Key` antes del desarrollo?
