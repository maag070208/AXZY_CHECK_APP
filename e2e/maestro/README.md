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
