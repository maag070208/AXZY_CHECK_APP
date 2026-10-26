# E2E Maestro — guardia `marcoh`

## Suites

- `guard-full.yaml` — login + incidencia + mantenimiento + casa club **sin foto/video** + ronda.
- `guard-full-photo.yaml` — igual, pero cada reporte toma **una foto** desde la cámara + ronda.

La ronda solo se **inicia y termina** (no escanea puntos).

## Ejecutar

```bash
cd APP

# Suite sin evidencia
JAVA_OPTS="-Duser.home=$PWD/.maestro-home" \
  ~/.maestro/bin/maestro test e2e/maestro/guard-full.yaml

# Suite con foto
JAVA_OPTS="-Duser.home=$PWD/.maestro-home" \
  ~/.maestro/bin/maestro test e2e/maestro/guard-full-photo.yaml
```

Antes de correr, asegura Metro y el reverse de ADB:

```bash
adb -s 192.168.10.103:5555 reverse tcp:8081 tcp:8081
```

El `user.home` alterno evita que el sandbox de escritura bloquee `~/.maestro/deps`.

## Suite offline

`offline-suite.sh` hace todo por USB (no por WiFi, para no perder ADB):

1. Login/setup online y caché de catálogos/snapshot.
2. Apaga WiFi y datos.
3. Mantenimiento offline (verifica que **no** inicie ronda).
4. Inicia/termina una ronda offline con confirmación.
5. Enciende WiFi y abre Sync; espera “Todo listo” y “Sin conflictos”.

```bash
DEVICE=R58YA0MM1TZ bash e2e/maestro/offline-suite.sh
```

Requiere Metro en `:8081`, API accesible y el teléfono por USB.


## Escenario mixto de evidencias

`mixed-suite.sh` prueba el caso real:

1. Incidencia con **foto 1 subida con WiFi**.
2. Se apaga WiFi/datos.
3. **Foto 2 se toma offline**.
4. Se envía la incidencia sin red.
5. Se enciende WiFi y se sincroniza.
6. Verifica en API:
   - la incidencia tiene **2 fotos** (no duplica la primera),
   - `createdOffline = true`.

```bash
DEVICE=R58YA0MM1TZ bash e2e/maestro/mixed-suite.sh
```


## RBAC y roles (2026-10-24)

Flujos nuevos:

- `admin-smoke.yaml` — login ADMIN (`isabel`), home, Roles y permisos y Notificaciones.
- `shift-smoke.yaml` — login SHIFT (`e2e_shift`), home del jefe, KPIs y pantalla de ronda compartida.
- `resident-smoke.yaml` — login RESDN (`e2e_resident`), home de autoservicio y Mi perfil.
- `guard-profile.yaml` — login GUARD (`e2e_guard`), actualización de datos personales y cambio de contraseña (ida y vuelta).

Usuarios de prueba creados en dev:

- `e2e_shift` / `123456` (SHIFT, horario Administración).
- `e2e_resident` / `123456` (RESDN).
- `e2e_guard` / `123456` (GUARD, horario Administración).

> El guardia sigue usando `marcoh` / `123456` y sus suites existentes.


## Fase 2A (nuevos flujos)

- `resident-access.yaml` — avisos, clave peatonal, vehículos e historial del residente.
- `caseta-access.yaml` — consulta de vehículos y validación de PIN en caseta.
- `admin-access.yaml` — avisos, padrón de vehículos y bitácora.

Requieren que la migración `20261026160000_rbac_guard_report_views` esté aplicada y que el usuario de prueba tenga los permisos nuevos.

```bash
JAVA_OPTS="-Duser.home=$PWD/.maestro-home" \
  ~/.maestro/bin/maestro test e2e/maestro/resident-access.yaml
```
