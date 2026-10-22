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
