# E2E Maestro — guardia `marcoh`

Flujo: login → incidencia → mantenimiento → casa club → iniciar/terminar ronda.
Los tres reportes se envían **sin foto y sin video**, usando solo el tipo.

## Ejecutar

```bash
cd APP
JAVA_OPTS="-Duser.home=$PWD/.maestro-home" ~/.maestro/bin/maestro test e2e/maestro/guard-full.yaml
```

El `user.home` alterno evita que el sandbox de escritura bloquee `~/.maestro/deps`.
El dispositivo ADB debe estar conectado (`adb devices`).
