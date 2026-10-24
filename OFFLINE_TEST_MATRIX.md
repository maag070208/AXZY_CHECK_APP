# Matriz de pruebas — Modo offline y ruta E2E de 8 puntos

**Versión:** 1.0  
**Alcance:** GUARD / MAINT  
**Objetivo:** validar rondas, escaneos, evidencias y sincronización cuando la red cambia a mitad del flujo, sin depender de un QR físico.

---

## 1. Decisión: escaneo E2E sin QR físico

### Problema

Maestro no puede apuntar la cámara a un QR físico de forma determinista. Eso bloquea las pruebas de:

- escanear y no guardar
- escanear, tomar foto y salir
- escanear, cerrar la APP y reabrir
- escanear dos veces el mismo punto
- escanear un punto de otra ruta

### Solución propuesta

Agregar un **modo E2E solo para builds debug**:

- En el Home aparece un botón pequeño: **“E2E: simular escaneo”**.
- Solo se renderiza si `__DEV__ === true`.
- Nunca aparece en release.
- Abre un selector con los puntos de la ronda activa.
- Al elegir un punto, ejecuta **el mismo flujo** que `handleCodeScanned`, sin parsear QR.
- Permite además elegir:
  - punto válido
  - punto de otra ruta
  - QR inválido

No se modifica la validación real de producción: el modo E2E solo reemplaza la entrada de cámara.

### Alternativa descartada

- Deep link con `locationId`: más frágil y expone una ruta de navegación.
- QR en pantalla externa: sigue dependiendo de enfoque/iluminación.
- Saltarse la cámara con `adb`: no ejercita el flujo real de check.

---

## 2. Fixture: ruta E2E de 8 puntos

### Datos

| Campo | Valor |
|---|---|
| Ruta | `E2E RONDA 8 PUNTOS` |
| Guardia | `marcoh` |
| Puntos | `E2E-01` … `E2E-08` |
| Tareas | 1 tarea por punto, sin foto obligatoria |
| Estado inicial | todos `PENDING` |
| Prefijo | `E2E-` para poder limpiar sin tocar datos reales |

### Reglas del fixture

- Seed **idempotente**: no duplica puntos ni ruta.
- Solo se ejecuta con `E2E_SEED=1`.
- Al terminar la suite se puede limpiar la ruta y sus checks.
- No se asigna a otros guardias.
- La ruta debe ser seleccionable desde el modal de rutas.

### Estados esperados

| Situación | Estado del punto | Check |
|---|---|---|
| Sin escanear | `PENDING` | no existe |
| Escaneó y salió sin guardar | `NOT_COMPLETED` | draft/incompleto |
| Escaneó, tomó foto y salió | `NOT_COMPLETED` | draft con evidencia, sin notas finales |
| Escaneó y guardó | `COMPLETED` | con notas/evidencia |
| Guardó offline | `COMPLETED` local, `QUEUED` | se sincroniza después |
| Cerró la APP tras escanear | `NOT_COMPLETED` al reabrir | draft recuperable |

---

## 3. Matriz E2E principal

### 3.1 Rondas y transición de red

| ID | Escenario | Preparación | Pasos | Resultado esperado | Test |
|---|---|---|---|---|---|
| E2E-R-01 | Iniciar ruta E2E con WiFi | sesión online | Iniciar `E2E RONDA 8 PUNTOS` + confirmar | 8 puntos `PENDING` | `e2e-route-start.yaml` |
| E2E-R-02 | Iniciar ronda sin WiFi | modo avión | Iniciar ruta + confirmar | ronda local `IN_PROGRESS` | `offline-route-start.yaml` |
| E2E-R-03 | Iniciar online y perder WiFi a mitad | WiFi → modo avión tras 2 puntos | escanear 2 puntos, apagar red, escanear 2 más | ronda sigue activa; checks locales | `offline-route-mid.yaml` |
| E2E-R-04 | Iniciar offline y recuperar WiFi | modo avión | iniciar, escanear, encender WiFi | push de ronda/checks | `offline-route-reconnect.yaml` |
| E2E-R-05 | Terminar ronda con puntos pendientes | ruta activa | terminar sin escanear todo | cierre permitido; puntos `PENDING` | `offline-route-end-pending.yaml` |
| E2E-R-06 | Terminar ronda offline | modo avión | escanear 2, terminar | `ROUND_END` en outbox | `offline-route-end.yaml` |
| E2E-R-07 | Nueva ronda no hereda estados | dos rondas | cerrar una, iniciar otra | 8 puntos `PENDING` | unit + `e2e-route-new.yaml` |
| E2E-R-08 | Doble toque en Iniciar | confirmación | tocar Iniciar dos veces | una sola ronda | `e2e-route-double-start.yaml` |

### 3.2 Escaneo sin guardar / cierre / evidencia

| ID | Escenario | Pasos | Resultado esperado | Test |
|---|---|---|---|---|
| E2E-S-01 | Escanea y no guarda | simular escaneo E2E-01, volver atrás | punto `NOT_COMPLETED`; no `COMPLETED` | `scan-without-save.yaml` |
| E2E-S-02 | Escanea y cierra la APP | escanear E2E-01, `stopApp`, reabrir | ronda activa; E2E-01 `NOT_COMPLETED`; draft recuperable | `scan-close-app.yaml` |
| E2E-S-03 | Escanea, toma foto y sale sin guardar | escanear E2E-02, foto, volver | evidencia conservada; punto `NOT_COMPLETED` | `scan-photo-exit.yaml` |
| E2E-S-04 | Escanea, graba video y sale | escanear E2E-03, video, volver | video conservado; punto `NOT_COMPLETED` | `scan-video-exit.yaml` |
| E2E-S-05 | Escanea y guarda sin evidencia | escanear E2E-04, guardar | punto `NOT_COMPLETED` según regla actual | `scan-save-no-evidence.yaml` |
| E2E-S-06 | Escanea, foto, notas y guarda | escanear E2E-05, foto, notas, guardar | `COMPLETED` con 1 evidencia | `scan-save-photo.yaml` |
| E2E-S-07 | Escanea dos veces el mismo punto | E2E-06 dos veces | un check/último check, sin duplicar | `scan-twice.yaml` |
| E2E-S-08 | Escanea punto de otra ruta | modo E2E punto inválido | rechazo; no crea check | `scan-wrong-route.yaml` |
| E2E-S-09 | QR inválido | modo E2E QR inválido | modal de error; no crea check | `scan-invalid-qr.yaml` |
| E2E-S-10 | Escanea, cierra APP y reabre offline | escanear, stopApp, modo avión, reabrir | borrador local/estado recuperado | `scan-close-offline.yaml` |

### 3.3 Evidencia mixta online/offline

| ID | Escenario | Pasos | Resultado esperado | Test |
|---|---|---|---|---|
| E2E-M-01 | Reporte foto 1 online + foto 2 offline | foto 1, apagar red, foto 2, enviar | 2 fotos finales; `createdOffline=true` | `mixed-suite.sh` |
| E2E-M-02 | Check foto 1 online + foto 2 offline | escanear, foto 1, apagar red, foto 2, guardar | `CHECK_UPDATE`; 2 evidencias | unit + `check-mixed.yaml` |
| E2E-M-03 | Video online + foto offline | grabar video con WiFi, foto offline | 2 evidencias; sin duplicados | `mixed-video.yaml` |
| E2E-M-04 | Reporte con URL existente no se re-sube | foto 1 online, foto 2 offline | 2 URLs, no 3 | `mixed-suite.sh` |

### 3.4 Sync y recuperación

| ID | Escenario | Pasos | Resultado esperado | Test |
|---|---|---|---|---|
| E2E-Y-01 | Sync manual con pendientes | apagar red, crear, encender, Sync | “Todo listo” / “Sin conflictos” | `guard-offline-sync.yaml` |
| E2E-Y-02 | Sync automático al reconectar | apagar, crear, encender sin tocar Sync | cola sube sola | `auto-sync.yaml` |
| E2E-Y-03 | Push OK, pull falla | simular fallo de `/sync/pull` | datos suben; pantalla indica error de actualización | `pull-fail.yaml` |
| E2E-Y-04 | Token expirado | token vencido + pendientes | pide reautenticación; no pierde cola | `token-expired.yaml` |
| E2E-Y-05 | Cierra APP con cola pendiente | crear offline, stopApp, reabrir online | sincroniza sin duplicar | `queue-after-restart.yaml` |
| E2E-Y-06 | Dos sync simultáneos | tocar Sync dos veces | una sola ejecución | `double-sync.yaml` |

---

## 4. Matriz de pruebas unitarias

| ID | Qué valida | Archivo | Estado |
|---|---|---|---|
| U-01 | Ronda nueva resetea estados | `__tests__/offline/roundStatus.test.ts` | ✅ |
| U-02 | Check local con evidencias | `__tests__/offline/roundStatus.test.ts` | ✅ |
| U-03 | No hereda `COMPLETED` anterior | `__tests__/offline/roundStatus.test.ts` | ✅ |
| U-04 | Ronda servidor conserva estados | `__tests__/offline/roundStatus.test.ts` | ✅ |
| U-05 | Catálogo offline con caché | `__tests__/offline/catalog.test.ts` | ✅ |
| U-06 | Sin caché devuelve error controlado | `__tests__/offline/catalog.test.ts` | ✅ |
| U-07 | Guarda catálogo exitoso | `__tests__/offline/catalog.test.ts` | ✅ |
| U-08 | `primeCatalogCache` | `__tests__/offline/catalog.test.ts` | ✅ |
| U-09 | `startRound` manda `confirmed:true` | `__tests__/offline/roundService.test.ts` | ✅ |
| U-10 | Check mixto no re-sube foto online | `__tests__/offline/checkMixed.test.ts` | ✅ |
| U-11 | Check sin serverId crea `CHECK_CREATE` | `__tests__/offline/checkMixed.test.ts` | ✅ |
| U-12 | QR parser válido/inválido | pendiente | ⬜ |
| U-13 | `createdOffline`/`syncedAt` | pendiente | ⬜ |

---

## 5. Datos que debe verificar cada prueba

### En SQLite

- `local_rounds.status`
- `local_checks.status`
- `local_checks.server_id`
- `local_media.status`
- `local_media.server_url`
- `outbox.operation` y `outbox.status`
- `local_reports.sync_state`

### En API

- `Round.createdOffline`
- `Round.syncedAt`
- `Kardex.createdOffline`
- `Kardex.syncedAt`
- `Incident.createdOffline`
- `Incident.media.length`
- `clientRef`

### Invariantes

1. Un mantenimiento/incidencia **nunca** crea `ROUND_START`.
2. Solo una ronda `IN_PROGRESS` por guardia.
3. Una ronda nueva no hereda checks de la anterior.
4. Una foto con URL no se vuelve a subir.
5. `CHECK_UPDATE` usa el mismo kardex cuando ya existe.
6. `createdOffline=true` implica `syncedAt != null` al llegar a API.
7. Cerrar la APP no pierde la cola.

---

## 6. Secuencia de ejecución propuesta

```text
1. Semilla E2E (8 puntos)
2. Login/setup online
3. E2E-R-01 iniciar ruta
4. E2E-S-01 escanear sin guardar
5. E2E-S-02 escanear y cerrar APP
6. E2E-S-03 foto y salir
7. E2E-S-06 guardar con foto
8. E2E-R-03 perder WiFi a mitad
9. E2E-S-10 cerrar offline
10. E2E-R-06 terminar offline
11. E2E-Y-01 sync manual
12. Verificación API
```

---

## 7. Criterios de aceptación

- La ruta E2E tiene exactamente 8 puntos.
- El modo E2E de escaneo **no existe en release**.
- Los flujos de cámara real no se rompen.
- Todos los escenarios P0 pasan.
- No hay evidencia duplicada.
- No hay rondas duplicadas.
- No hay reportes creados por accidente.
- La cola sobrevive cierre de APP.
- La API refleja `createdOffline` y `syncedAt`.

---

## 8. Riesgos

- El modo E2E no debe llegar a producción.
- La ruta E2E no debe mezclarse con rutas reales.
- Los tests que cierran la APP deben restaurar sesión.
- Maestro no puede validar la cámara real; se complementa con unit tests.
- La semilla debe ser limpiable.

---

## 9. Orden de implementación

1. Modo E2E de escaneo (debug only).
2. Semilla de ruta de 8 puntos.
3. Ajustar `CheckReport` para recuperar draft/estado al reabrir.
4. Implementar flujos Maestro P0.
5. Ejecutar y corregir.
6. Agregar verificación API.

---

## 10. Estado de ejecución (2026-10-21)

### Unitarias

```text
Test Suites: 4 passed
Tests:       14 passed
```

Archivos:

- `__tests__/offline/roundStatus.test.ts`
- `__tests__/offline/catalog.test.ts`
- `__tests__/offline/roundService.test.ts`
- `__tests__/offline/checkMixed.test.ts`

### E2E ejecutados y pasando

| Flujo | Resultado |
|---|---|
| `guard-offline-setup.yaml` | ✅ |
| `e2e-route-start.yaml` | ✅ ruta de 8 puntos |
| `scan-without-save.yaml` | ✅ E2E-01 queda `No completada` |
| `scan-photo-exit.yaml` | ✅ E2E-02 con foto queda `No completada` |
| `scan-close-app.yaml` | ✅ E2E-03 sobrevive cierre de APP |
| `scan-save-photo.yaml` | ✅ E2E-04 `Completada` con foto/nota |
| `scan-invalid-qr.yaml` | ✅ QR inválido no crea check |
| `offline-scan-draft.yaml` | ✅ E2E-05 borrador offline sobrevive cierre |
| `offline-scan-save.yaml` | ✅ E2E-06 check offline con foto |
| `guard-offline-sync.yaml` | ✅ “Todo listo” / “Sin conflictos” |
| `e2e-route-end.yaml` | ✅ cierre y limpieza de ronda |
| `mixed-suite.sh` | ✅ 2 fotos, `createdOffline=true` |

### Verificación API del check offline

Kardex E2E-06:

```text
notes: "Check guardado sin WiFi"
media: 1
createdOffline: true
clientRef: 89816407-...
```

### Scripts

```bash
# Semilla de la ruta E2E
cd API
npm run e2e:seed

# Suite de escaneo con ruta activa
cd APP
DEVICE=R58YA0MM1TZ bash e2e/maestro/offline-scan-suite.sh

# Evidencia mixta
DEVICE=R58YA0MM1TZ bash e2e/maestro/mixed-suite.sh

# Cerrar ronda E2E
JAVA_OPTS="-Duser.home=$PWD/.maestro-home" \
  ~/.maestro/bin/maestro --device R58YA0MM1TZ test e2e/maestro/e2e-route-end.yaml
```
