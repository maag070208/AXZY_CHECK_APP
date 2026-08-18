# Casos de uso: Ciclo de vida de una ronda (round)

Documento de referencia para entender todos los flujos posibles de inicio,
operación, finalización y sincronización de rondas en la APP del guardia.
Cada caso describe el escenario, el comportamiento esperado y el estado actual
del código.

---

## Estado actual del código (resumen)

| Capa | Archivo | Rol |
|---|---|---|
| Pantalla | `APP/src/screens/home/screens/GuardDashboard.tsx` | Inicia/finaliza rondas, muestra checklist |
| Motor sync | `APP/src/core/offline/offline.sync.ts` | Procesa cola offline (push + pull) |
| Cola | `APP/src/core/offline/offline.queue.ts` | Persiste operaciones y datos en AsyncStorage |
| Operaciones | `APP/src/core/offline/offline.ops.ts` | Encola `queueStartRound` / `queueEndRound` / `queueScan` |
| Check | `APP/src/screens/check/screens/CheckScreen.tsx` | Registra escaneo (kardex) |
| API | `API/src/modules/rounds/` | `start` / `end` / `current` / `active` |

**Claves AsyncStorage relevantes:**
- `offline:queue` — operaciones pendientes
- `offline:localRound` — ronda local (offline) en curso
- `offline:cache:routes` — caché de rutas
- `offline:scanned` — mapa `roundLocalRef -> [locationIds]` (checklist offline)
- `offline:refs` — mapa `localRef -> serverId`

---

## Caso 1: Iniciar ronda con WiFi, se cae WiFi a la mitad, vuelve WiFi

**Escenario:**
1. Guardia inicia ronda A con WiFi → servidor crea la ronda (id=42)
2. A la mitad, se va el WiFi
3. Vuelve el WiFi al final

**Comportamiento esperado:**
- La ronda A debe seguir visible durante todo el proceso
- Los escaneos hechos sin WiFi deben encolarse y subirse al volver
- Al volver el WiFi, la ronda se mantiene activa (no se duplica)

**Estado actual (BUG corregido):**
- Antes: `loadData` borraba `activeRound` al fallar `getCurrentRound()`
- Ahora: se mantiene la ronda online previa en estado

**Pendiente:**
- Los escaneos durante el período sin WiFi deben encolarse con
  `roundId=42` (server id), no con `roundLocalRef=undefined` (ver Caso 6)

---

## Caso 2: Iniciar ronda sin WiFi, vuelve WiFi a la mitad

**Escenario:**
1. Guardia inicia ronda A sin WiFi → se encola `ROUND_START`, `localRef=abc`
2. Escanea puntos (se guardan bajo clave `abc` en `offline:scanned`)
3. Vuelve el WiFi → sync sube la ronda y los escaneos
4. El servidor crea la ronda con su id real, el cliente mapea `abc -> 42`

**Comportamiento esperado:**
- Tras sync, la ronda local debe "convertirse" en online
- Los puntos escaneados deben seguir apareciendo como completados
- Al finalizar, debe poder finalizar la ronda online

**Estado actual:**
- `saveRef(abc, 42)` se llama tras subir el `ROUND_START` ✅
- Pero `activeRound` sigue siendo `{local: true, localRef: abc}` en estado
- `localRoundRef` no se actualiza a null cuando se sincroniza

**Pendiente:**
- Al sincronizar el `ROUND_START`, refrescar `activeRound` con la respuesta
  del servidor (o al menos marcar `local=false` y dejar que `loadData` lo
  actualice en el próximo refresh)

---

## Caso 3: Iniciar y finalizar ronda con WiFi

**Escenario:**
1. Inicia ronda A con WiFi (id=42)
2. Escanea puntos (online)
3. Finaliza con WiFi

**Estado actual:** ✅ Funciona correctamente.

---

## Caso 4: Iniciar ronda con WiFi, se cae WiFi, finalizar offline, vuelve WiFi

**Escenario:**
1. Inicia ronda A con WiFi (id=42)
2. Se cae WiFi
3. Escanea puntos (deberían encolarse, ver Caso 6)
4. Finaliza la ronda offline → se encola `ROUND_END` con `roundId=42`
5. Vuelve WiFi → sync sube el `ROUND_END`

**Estado actual:**
- `queueEndRound` acepta `{roundId: activeRound.id}` ✅
- Pero los escaneos no se encolan (ver Caso 6)

**Pendiente:**
- Resolver el encolado de escaneos en rondas online sin conexión

---

## Caso 5: Iniciar y finalizar ronda sin WiFi, vuelve WiFi

**Escenario:**
1. Inicia ronda A sin WiFi (`localRef=abc`)
2. Escanea puntos (clave `abc` en `offline:scanned`)
3. Finaliza sin WiFi → encola `ROUND_END` con `roundLocalRef=abc`
4. Vuelve WiFi → sync sube todo

**Comportamiento esperado:**
- Servidor crea la ronda, mapea `abc -> 42`, sube los kardex, finaliza
- En el siguiente `loadData`, la ronda ya no aparece como activa
- Los puntos escaneados se limpian del mapa tras finalizar ✅

**Estado actual:** ✅ Funciona (con el fix de limpieza del Caso anterior).

---

## Caso 6: Escanear puntos en una ronda online que se quedó sin WiFi

**Escenario:**
1. Inicia ronda A con WiFi (id=42)
2. Se cae WiFi
3. Escanea un punto QR

**Comportamiento esperado:**
- El escaneo debe encolarse con `roundId=42` y subirse al volver WiFi
- El checklist debe mostrar el punto como completado mientras esté offline

**Estado actual (BUG):**
- `handleCodeScanned` pasa `roundLocalRef: activeRound?.local ? activeRound?.localRef : undefined`
- Para rondas online, `activeRound.local` es false → `roundLocalRef=undefined`
- El check screen recibe `roundLocalRef=undefined` y no sabe a qué ronda
  pertenece el escaneo
- El escaneo se guarda bajo clave `'default'` en `offline:scanned` (mezclado)
- Si se intenta encolar, no se puede vincular a la ronda 42

**Pendiente:**
- Pasar `roundId: activeRound.id` además de (o en lugar de) `roundLocalRef`
- El check screen debe aceptar ambos: si hay `roundId`, usarlo; si hay
  `roundLocalRef`, esperar a que se mapee

---

## Caso 7: Reinicio de app con ronda online activa

**Escenario:**
1. Inicia ronda A con WiFi (id=42)
2. Cierra la app (sin finalizar la ronda)
3. Abre la app de nuevo

**Comportamiento esperado:**
- La ronda A debe seguir apareciendo como activa
- Se puede seguir escaneando

**Estado actual:** ✅ Funciona (`loadData` consulta `getCurrentRound()` al
montar y restaura desde el servidor).

---

## Caso 8: Reinicio de app con ronda local (offline) activa

**Escenario:**
1. Inicia ronda A sin WiFi (`localRef=abc`)
2. Cierra la app
3. Abre la app (sigue sin WiFi)

**Comportamiento esperado:**
- La ronda A debe seguir apareciendo como activa
- Se puede seguir escaneando (clave `abc`)

**Estado actual:** ✅ Funciona (`getLocalRound()` restaura desde
`offline:localRound`).

---

## Caso 9: Iniciar dos rondas seguidas (la que tenía el bug anterior)

**Escenario:**
1. Inicia y finaliza ronda A (offline)
2. Inicia ronda B (offline)

**Estado actual (BUG corregido):**
- Antes: los puntos de A aparecían como completados en B
- Ahora: `getScannedLocationsForRound(localRoundRef)` solo trae los de B ✅
- `clearScannedLocationsForRound` al finalizar A limpia sus puntos ✅

---

## Caso 10: Mismo guardia inicia la misma ruta dos veces sin finalizar

**Escenario:**
1. Inicia ronda A en ruta 1
2. Sin finalizar, intenta iniciar otra ronda en ruta 1 (no debería poder)

**Estado actual:**
- La API rechaza el segundo inicio si ya hay una activa ✅
- `loadData` filtra configs con rondas activas de otros guardias

---

## Caso 11: Dos guardias, misma ruta, el primero no ha finalizado

**Escenario:**
1. Guardia X inicia ruta 1
2. Guardia Y intenta iniciar ruta 1

**Estado actual:**
- La API rechaza el segundo inicio ✅
- El dashboard de Y muestra la ruta como "ocupada por otro guardia"
- Y puede ver el checklist de la ruta si ya tenía una activa propia

---

## Caso 12: Iniciar ronda con WiFi, cerrar la app, abrir sin WiFi

**Escenario:**
1. Inicia ronda A con WiFi (id=42)
2. Cierra la app
3. Abre la app sin WiFi

**Comportamiento esperado:**
- `getCurrentRound()` falla → no se puede restaurar desde el servidor
- Pero la ronda existe en el servidor

**Estado actual (BUG menor):**
- Con el fix del Caso 1, la ronda online se mantiene si ya estaba en estado
- Pero tras reinicio de app, no hay estado previo → se pierde
- La API `/rounds/current` debería ser consultable incluso con datos
  en caché

**Pendiente:**
- Considerar persistir el `serverRoundId` activo en AsyncStorage para
  poder mostrar la ronda aunque el servidor no responda

---

## Caso 13: Sincronizar mientras hay una ronda local activa

**Escenario:**
1. Inicia ronda A sin WiFi (`localRef=abc`)
2. Escanea puntos
3. Vuelve WiFi → presiona sincronizar
4. La ronda local se sube al servidor

**Comportamiento esperado:**
- Tras sync, `activeRound` debe seguir mostrando la ronda
- Los escaneos deben seguir apareciendo como completados
- Al finalizar, debe finalizar la ronda correcta (la del servidor)

**Estado actual (BUG menor):**
- `syncNow` procesa la cola y crea `ROUND_START` en el servidor
- Pero `activeRound` en el dashboard sigue siendo `{local: true, localRef: abc}`
- `localRoundRef` no se limpia
- Los escaneos se guardaron bajo `abc` → siguen funcionando ✅
- Al finalizar, se usa `roundLocalRef: abc` → `queueEndRound` lo procesa ✅

**Pendiente:**
- Tras subir el `ROUND_START`, refrescar `loadData()` para obtener la ronda
  desde el servidor con su id real

---

## Caso 14: Múltiples rondas locales simultáneas (no debería pasar)

**Escenario:**
1. Inicia ronda A sin WiFi
2. Cierra la app
3. Abre la app, inicia ronda B sin WiFi (sin haber finalizado A)

**Estado actual:**
- `getLocalRound()` solo devuelve UNA ronda local
- La segunda sobrescribe a la primera
- La primera queda huérfana en la cola

**Pendiente:**
- Validar que no haya ronda local activa antes de iniciar otra
- O soportar múltiples rondas locales simultáneas (poco probable)

---

## Resumen de bugs conocidos

| # | Bug | Estado |
|---|---|---|
| 1 | Ronda online se borra al caer WiFi | ✅ Corregido |
| 9 | Puntos de ronda anterior aparecen en la nueva | ✅ Corregido |
| 6 | Escaneos en ronda online sin WiFi no se encolan | ✅ Corregido |
| 2 | Ronda local no se "convierte" en online tras sync | ✅ Corregido |
| 4 | Finalizar ronda online sin WiFi | ✅ Corregido |
| 12 | Reinicio de app sin WiFi pierde ronda online | ✅ Corregido |
| 13 | UI no se refresca tras sync de ronda local | ✅ Corregido |
| 14 | Múltiples rondas locales simultáneas | ✅ Corregido |

---

## Cambios aplicados (plan ejecutado)

### API
- `prisma/schema.prisma`: `Kardex.roundId` opcional + relación a `Round`
- Migración: `20260807010000_add_kardex_round_relation`
- `kardex.controller.ts` + `kardex.service.ts`: aceptar y persistir `roundId`
- `swagger.yaml`: documentar `KardexCreate.roundId`

### APP
- `offline.queue.ts`: `LocalRoundData.serverId` + `getActiveRoundPersisted()`
- `offline.ops.ts`: `queueScan` acepta `roundId`
- `offline.sync.ts`: caso `SCAN` resuelve `roundId` desde payload o `dependsOn`
- `check.service.ts`: `registerCheck` acepta `roundId`
- `GuardDashboard.tsx`:
  - Inicio online: genera `localRef`, llama `saveLocalRound({localRef, serverId, ...})` y `saveRef`
  - Escaneo: SIEMPRE pasa `roundLocalRef` (online u offline)
  - `loadData`: restaura desde persistencia distinguiendo local vs online
  - `onEndRoundConfirmed`: encola con `roundId` para rondas online
  - Inicio: bloquea si ya hay ronda `IN_PROGRESS` (Caso 14)
- `CheckReportScreen.tsx`: pasa `roundId` al `registerCheck`/`queueScan`
