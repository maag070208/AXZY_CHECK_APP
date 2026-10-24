# CheckApp APP — Design System

> Fuente de verdad del diseño de la aplicación móvil (React Native + React Native Paper).
> Última actualización: **2026-10-23 · v2.40**
>
> Antes de modificar cualquier pantalla, lee este documento. Si introduces un patrón nuevo,
> actualízalo aquí en el mismo cambio (ver “Cómo mantener este documento”).

---

## 1. Principios

1. **Aire antes que densidad.** Las pantallas se sienten amplias: padding base de 16, separación
   entre secciones de 22–24 y tarjetas con padding interno de 12–16.
2. **Una sola jerarquía visual.** Fondo claro, tarjetas blancas, bordes suaves y un único verde
   de marca. El color fuerte se reserva para acciones y estados, no para bloques completos.
3. **Consistencia sobre creatividad local.** Header, tab bar, botones, tarjetas, chips y estados
   vacíos salen de los componentes/tokens de este documento.
4. **Móvil primero.** Zonas táctiles mínimas de 36×36 (ideal 44×44), textos legibles sin zoom,
   tab bar con safe area.
5. **Estados completos.** Toda lista o consulta tiene **loading (skeleton), empty y error**.

---

## 2. Color

### 2.1 Marca

| Token | Hex | Uso |
|---|---|---|
| `primary` | `#065911` | Acciones principales, tab activo, énfasis |
| `brand` | `#12A36F` | Acentos, iconos, marca, detalles |
| `primarySoft` | `#E8F7EF` | Fondos de iconos/estados positivos |
| `primaryBorder` | `#C7F0DF` | Bordes de elementos verdes suaves |

### 2.2 Superficies

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#F4F9F6` | Fondo de pantalla |
| `surface` | `#FFFFFF` | Tarjetas, header, tab bar |
| `line` | `#E6EEE9` | Bordes de tarjetas y separadores |
| `lineSoft` | `#F1F5F9` | Separadores internos |

### 2.3 Texto

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#0F172A` | Títulos y valores |
| `muted` | `#64748B` | Texto secundario |
| `soft` | `#94A3B8` | Labels, hints, placeholders |

### 2.4 Semánticos

| Token | Hex | Uso |
|---|---|---|
| `danger` | `#E53935` | Errores, incidencias, badge de alertas |
| `warning` | `#F59E0B` | Rondas estancadas, advertencias |
| `info` | `#0EA5E9` | Guardias en turno, datos informativos |
| `violet` | `#8B5CF6` | Chat, uniformes, entregas de turno |
| `success` | `#12A36F` | Confirmaciones / estados OK |

**Reglas**
- Nunca uses bordes negros ni `border` sin color sobre fondos tintados.
- No uses bloques de color saturado de más de **3 acciones**. Tres accesos rápidos compactos en
  una sola fila (alto 44) sí pueden ir coloreados; para 4+ usa tarjeta blanca con icono tintado
  (fondo `color + 14` alpha) y texto `ink`.
- El color de un estado debe repetirse en icono, texto y borde suave; nunca solo en el fondo.

---

## 3. Tipografía

Fuente del sistema (sin fuente custom por ahora). Pesos permitidos: `600`, `700`, `800`, `900`.

| Rol | Tamaño | Peso | Ejemplo |
|---|---:|---:|---|
| Display / saludo | 25–30 | 900 | “Buenas tardes, Asael” |
| Título de pantalla | 20–24 | 900 | “Iniciar sesión”, “Dashboard” |
| Título de tarjeta | 14–16 | 800 | “RONDAS ACTIVAS”, nombre de ruta |
| Cuerpo | 12–13 | 600/700 | Mensajes, descripciones |
| Label de sección | 10 | 900 | `RESUMEN`, `AHORA MISMO` — mayúsculas, `letterSpacing: 1.1` |
| Caption / hint | 9–10 | 600/700 | “3 estancadas”, “hace 2 días” |
| Valor KPI | 21–24 | 900 | `3`, `20`, `3/4` |

**Reglas**
- Labels de sección siempre en mayúsculas con tracking; nunca como título grande.
- Un solo `900` por bloque (el valor o el título). No compitas pesos.
- No uses menos de 9 px.

---

## 4. Espaciado, radios y sombras

### 4.1 Escala de espaciado
`4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 22 · 24 · 28 · 32`

- Padding horizontal de pantalla: **16**
- Separación entre secciones: **22–24**
- Padding de tarjeta: **12–16**
- Gap entre tarjetas de una grilla: **10**
- Gap entre icono y texto: **7–10**

### 4.2 Radios
`10 · 12 · 14 · 16 · 18 · 20 · 24 · 999`

- Botones: **12**
- Inputs: **12–16**
- Tarjetas: **14–18**
- Header / tab bar: **18 / 22**
- Chips / badges: **999**
- CTA central del tab bar: **16** (diamante rotado 45°)

### 4.3 Sombras
- Tarjetas: `shadowOpacity 0.06–0.10`, `radius 10–16`, `elevation 3–5`.
- Header / tab bar: `shadowOpacity 0.08–0.12`, `radius 10–16`, `elevation 4–10`.
- Nunca uses sombras duras ni bordes gruesos para separar; usa fondo + borde suave.

---

## 5. Layout y navegación

### 5.1 Pantalla
- Fondo: `bg`.
- Contenido: `padding: 16`, `paddingBottom: 120` si hay tab bar.
- Scroll vertical; no anidar listas virtualizadas dentro de `ScrollView`.

### 5.2 Header (`HeaderMain` / `HeaderBack`)
- Header **plano, full-width**: fondo blanco, alto **60**, padding horizontal **16**, borde inferior
  `line`. Sin radio, sin sombra y sin margen flotante.
- `HeaderMain`: menú (verde) + marca **CheckApp** + chat morado + campana con badge + avatar.
  El chat vive en el header, no como tile de contenido.
- `HeaderBack`: botón atrás circular verde suave (`primarySoft`, icono `primary`) + título.
- No agregues títulos gigantes dentro del contenido si el header ya comunica la pantalla.

### 5.2.1 Perfil
- Top row: back 40 + “Mi perfil” 18/900.
- Hero verde con avatar blanco, nombre, rol y pill @usuario.
- Dos stat cards blancas: Entrada y Cuenta.
- Form card con segmented Datos/Seguridad, inputs outlined suaves y `AppButton`.

### 5.2.2 Drawer
- Header verde `#065911` con radio inferior 24, logo CheckApp (Check blanco / App mint),
  saludo en pill translúcido, nombre 22/900 y meta “Entrada HH:mm · Rol”.
- Avatar blanco con inicial verde y botón de edición mint.
- Menú con caption “MENÚ”, items compactos sin cajas: icono directo 20, label 14 y activo
  en mint con texto/chevron verde.
- Footer con “Cerrar Sesión” en rojo suave y badge de entorno.

### 5.2.3 Aviso offline
- `OfflineHeaderNotice` se muestra debajo del header cuando NetInfo indica sin red.
- No bloquea: “Sin conexión · puedes trabajar offline; se guardará y sincronizará al volver”
  para GUARD/MAINT; “Sin conexión a internet” para el resto.
- Nunca usar un modal de pantalla completa para cortar el trabajo offline.

### 5.3 Tab bar (`AppTabBar`)
- Barra **plana, anclada y full-width**: fondo blanco, alto **60**, borde superior `line`.
  Sin radio, sin sombra y sin márgenes laterales (coherente con el header plano).
- El único elemento que sobresale es el CTA central (diamante).
- 4 accesos + CTA central:
  - ADMIN/SHIFT: Inicio · Historial · **◆ CTA** · Chat · Más.
  - GUARD: Inicio · **◆ QR** · Más.
- CTA central: cuadrado **50×50**, radio **16**, rotado 45°, icono rotado −45°.
  - ADMIN/SHIFT: inicia ronda (`play`) con label “Ronda”.
  - GUARD sin ronda: escanea entrada (`ticket-confirmation-outline`) con label “Entradas”.
  - GUARD con ronda: escanea ubicación (`map-marker-radius-outline`) con label “Ubicaciones”.
- Se oculta en pantallas full-screen (reportes, seguimiento, escáner de pase).
- “Más” abre el drawer. “Chat” navega a `CHAT_STACK`.

---

## 6. Componentes

### 6.1 Botones — `AppButton`
Ruta: `src/shared/components/AppButton.tsx`.

- Alturas: **sm 38**, **md 46**.
- Radio 12, tipografía 12 / 13.5, peso 800, icono 16 / 18.
- Variantes: `primary` (verde), `outline` (blanco con borde `line`), `ghost`, `danger` (rojo).
- Usa `sm` en filas de acciones; `md` en formularios o CTA de pantalla.
- **No** uses `Button` de Paper para acciones nuevas; si necesitas una variante, extiende `AppButton`.
- Un máximo de **2 botones primarios** por pantalla; el resto `outline`/`ghost`.

### 6.2 Tarjetas
- Fondo `surface`, borde `line`, radio 14–18, padding 12–16.
- Título 14–16/800 `ink`; hint 9–10/600 `muted`/`soft`.
- Para KPI: label 9/900 `muted` en mayúsculas, valor 21–24/900 `ink`, hint 10/600, barra de progreso 5 px si aplica.
- No uses fondo tintado en toda la tarjeta salvo alertas semánticas.

### 6.3 Tarjetas de ruta (guardia)
- Cabecera: caja de icono 36, título 14/800, meta 11/600 y chip de estado 999.
- Ruta activa: fondo `#FBFEFC`, borde `#C7F0DF` (no borde grueso).
- Progreso: label 10/700, contador 10/800, track 6 px `#EEF3F0`, fill verde.
- Ruta disponible: preview de hasta 3 chips de ubicación, `+N más` y CTA
  “Toca para iniciar esta ruta” con chevron.
- Ruta ocupada: tarjeta atenuada con candado y quién la tiene.
- **Ubicaciones**: tarjeta con fondo/borde según estado (`PENDING` ámbar, `NOT_COMPLETED` rojo,
  `COMPLETED` verde), chip de estado, tareas y **Evidencias N** (media del kardex).
  `COMPLETED` solo si el reporte tiene notas **y al menos una foto/video**; guardar sin
  evidencias deja el punto en `NOT_COMPLETED`.

### 6.4 Alertas / avisos
- Tarjeta con fondo muy suave (`bg` semántico) + borde suave; sin borde izquierdo grueso.
- Fila superior: icono en caja 28, etiqueta de tipo 9/900 en color semántico, hora 9/600 a la derecha.
- Mensaje 12/700 `ink` debajo.
- Tipos: Ronda estancada (ámbar), Incidencia (rojo), Entrega de turno (violeta).

### 6.5 Chips / badges
- Radio 999, padding horizontal 8–10, vertical 3–5.
- Texto 8–10/800–900.
- Badge de alertas: círculo 16, fondo `danger`, borde blanco 1.5, texto 9+.

### 6.6 Inputs
- Fondo `#F8FAFC`, borde 1.5 `#E2E8F0`, radio 16, altura 56.
- Foco: borde `brand`, fondo `#F1FBF7`.
- Error: borde `danger`, fondo `#FEF2F2`, mensaje 12/600.
- Icono izquierdo 20, gap 12.

### 6.7 Estados
- **Loading**: skeleton compartido (`src/shared/components/Skeleton.tsx`) con pulso
  (`Animated` opacidad 0.45 ↔ 1, 700 ms) y la forma del contenido. También al refrescar.
- **Indicador global**: barra delgada no bloqueante en la parte superior (`LoaderComponent`).
  Nunca uses un modal que tape la pantalla para cargar.
- **Empty**: icono 28–30 `soft`, título 13/800, texto 11–12 `muted`, CTA opcional `sm`.
- **Error**: tarjeta `#FEF2F2`, icono `danger`, texto 12/600 `#B91C1C`, botón “Reintentar” `sm`.
- Nunca dejes una sección sin uno de los tres estados.

### 6.7.1 Caseta
- Header `HeaderBack` con menú cuando se abre desde el drawer; título “Caseta”.
- Cámara visible solo dentro de un marco blanco de 230×230, centrado, con línea de escaneo
  animada. Sin bloque negro alrededor ni texto sobre la cámara; ayuda debajo del marco.
- Input de código con icono, chips Peatón/Vehículo (activo verde) y `AppButton` “Verificar pase”.
- Resultado en card semántica (verde/ámbar/rojo) y botón “Verificar otro pase”.

### 6.8 Reporte técnico
- Header en card blanca: icono 44, eyebrow verde, chip de nivel, título 21/900 y estado “En curso · Verificación en tiempo real”.
- Secciones con icono 30 y label 14/900 oscuro + hint 11 a la derecha.
- Card “Antes de guardar” en mint con recomendación breve.
- Observaciones en card blanca (radio 16, borde `line`, mínimo 124).
- Video compacto (72) y galería 3 columnas con tarjeta “Añadir” dashed mint.
- Checklist de tareas (asignaciones): label 13/900, contador N/M, card blanca, checkbox 22 con check verde y chip "Foto requerida".
- Footer fijo blanco con `AppButton` `md` (alto 52) y safe area; el contenido hace scroll por encima.
- **Público mayor**: en este reporte los labels de sección suben a 13/900 oscuro (no 10/900),
  textos 12–15 y el estado del botón explica qué falta (“Preparando reporte…”, “Faltan X fotos”).

### 6.8.1 Formularios de reporte (`ReportForm`)
- Header con back 36 y título centrado 18/900, borde inferior.
- Pasos numerados 1/2/3 en label 11/900.
- Tipos en grid de 2 columnas (48.5%), tarjetas blancas con radio de selección; la activa
  usa borde/fondo del accent. Labels de paso 12/900 + hint a la derecha.
- Al elegir un tipo: scroll automático a Evidencia y pulso en la tarjeta “Tomar foto”
  (no abre la cámara).
- Evidencia en filas “Tomar foto” / “Grabar video” (64, icono mint) como en el reporte de punto.
- Observaciones en card blanca con padding superior y **botón de micrófono** integrado para
dictado por voz (Android, permiso RECORD_AUDIO); el texto se transcribe en el campo.
- Footer fijo con `AppButton`.

### 6.8.2 Permisos
- Pantalla post-login bloqueante antes del Drawer.
- Cards para Cámara, Micrófono, Ubicación y Notificaciones con explicación y estado.
- Sin todos concedidos no hay “Continuar”; se ofrece “Permitir todos” y “Abrir ajustes”.
- Se revalida al volver del sistema (AppState) y respeta safe area.

### 6.8.3 Mis asignaciones
- Header plano de 56: flecha atrás 36 en caja mint, título 18/900 y refrescar a la derecha.
- Card por asignación: icono 38 tintado por estado, nombre 14/800, meta 11/600, chip 999 con color semántico, progreso de tareas y CTA “Escanear punto”.
- Estados: skeleton de 3 cards al cargar, empty “¡Todo listo!” y error con “Reintentar”.
- Pull-to-refresh conserva la lista; el refrescar del header también recarga.

### 6.8.4 Homes por rol
- ADMIN → `AdminDashboardScreen` (KPIs, alertas, mapa, rondas).
- SHIFT → `ShiftDashboard` (hero, KPIs, alertas, operaciones, rondas activas y equipo) + `ShiftRoundScreen`, que reutiliza `GuardDashboard` en modo ronda: misma pantalla que Guardia/Mantenimiento.
- GUARD y MAINT → `GuardDashboard` (mismo home: ronda, escaneo y reportes).
- RESDN → `ResidentHomeScreen` (hero de bienvenida, propiedad, perfil, contactos y pases).
- El home se elige por rol; dentro de cada uno, los accesos se filtran por permisos.

### 6.9.0 Listas operativas (estándar)
- Resumen compacto arriba: total, en turno y refrescar.
- Buscador de 42 px y filtros en chips (Todos / rol).
- Filas densas de 64–72 px: avatar 42, nombre 13/800, meta 10, chip de rol y estado a la derecha.
- Separadores suaves; sin cards gigantes por elemento.
- Skeleton de filas al cargar y estado vacío con icono.
- Paginación con “cargar más” silencioso.

### 6.9 RBAC en la APP
- `userState.permissions` guarda los permisos de `GET /users/me/permissions`; se hidratan al iniciar sesión y hay respaldo local por rol si no hay red.
- Drawer, Home y botones de acción usan `useCan()`; no se compara `role ===`.
- ADMIN tiene “Roles y permisos” en el drawer para editar la matriz (mismos endpoints que la WEB).
- El guardia conserva sus accesos: Inicio, Mis Asignaciones, Caseta y su dashboard de rondas.

### 6.9.1 Secciones
- Header de sección: label 10/900 `soft` mayúsculas + `letterSpacing 1.1`; a la derecha un aside 10/700
  `soft` o chip de conteo.
- Separación superior 22, inferior 10.

---

## 7. Movimiento

- Transiciones de 150–250 ms; `LayoutAnimation` suave en cambios de teclado/layout.
- Skeleton: 700 ms por sentido, en loop.
- Evita animaciones decorativas largas o rebotes.
- **Escáner QR**: marco cuadrado de 230×230 con borde blanco fino y radio 18, máscara oscura
  fuera del marco y línea de escaneo verde de 2 px (sin esquinas HUD ni banda grande).
  Hint arriba y “Cerrar cámara” blanco abajo.
- **Cámara**: barra superior con cerrar / estado (“CÁMARA LISTA”, “GRABANDO”, “PREPARANDO…”)
  y flash; cuadrícula + esquinas de encuadre en video; barra de progreso de grabación; panel
  inferior oscuro con shutter 78. Video listo: punto rojo; grabando: cuadro rojo centrado;
  timer/progreso solo mientras graba. Respeta safe area y muestra “Preparando cámara…”.
- **Validación**: solo se aceptan QRs con payload CheckApp firmado
  (`app`, `type: LOCATION`, `v: 1`, `id`, `sig`). Si el QR es ajeno o no pertenece a la ronda,
  se muestra un **modal propio** (no `Alert`) con “Volver a escanear”.
- **Salida de reporte**: modal propio (no `Alert`) que avisa que el punto quedará como
  `NOT_COMPLETED`; el borrador del kardex deja el rastro y el punto se pinta en rojo.
- **Cambios de ronda**: usa `LayoutAnimation` (easeInEaseOut) al iniciar, escanear, cerrar cámara
  y finalizar la ronda, para que el hero y la tarjeta se acomoden sin saltos.

---

## 8. Accesibilidad

- Todo control táctil: `accessibilityRole`, `accessibilityLabel`, hit area ≥ 36×36.
- Contraste mínimo AA sobre `surface` y `bg`.
- No comuniques estado solo por color: agrega texto/icono.
- Formularios: label/placeholder claro y mensaje de error asociado.
- **Público mayor**: instrucciones explícitas y cortas; nombra el botón entre comillas
  (“Toca ‘Escanear QR’…”). Botones de acción crítica (terminar ronda, cerrar cámara) siempre
  visibles, nunca debajo de una hoja/tarjeta que los tape.

---

## 9. Reglas rápidas (checklist)

- [ ] ¿Usé `bg`, `surface`, `line`, `ink`, `muted`, `soft` en lugar de colores sueltos?
- [ ] ¿El padding horizontal es 16 y hay aire entre secciones (22–24)?
- [ ] ¿Los botones nuevos son `AppButton` y del tamaño correcto?
- [ ] ¿Header y tab bar respetan `HeaderMain` / `HeaderBack` / `AppTabBar`?
- [ ] ¿La pantalla tiene loading (skeleton), empty y error?
- [ ] ¿Los labels de sección son 10/900 mayúsculas y no títulos gigantes?
- [ ] ¿Evité bloques de color saturado para acciones y bordes negros?
- [ ] ¿Agregué `paddingBottom` suficiente para la tab bar (110+)?
- [ ] ¿Actualicé este `DESIGN.md` si introduje un patrón nuevo?

---

## 10. Cómo mantener este documento

1. Si agregas/modificas un **token, componente o patrón visual**, actualiza `DESIGN.md` en el mismo PR.
2. Agrega una entrada en el **Changelog** con fecha, versión y archivos afectados.
3. Si el patrón es reutilizable, créalo en `src/shared/components` (p. ej. `AppButton`) y úsalo.
4. La regla de Cursor `checkapp-app-ui.mdc` obliga a leer y actualizar este documento.

### Changelog
| Fecha | Versión | Cambio |
|---|---|---|
| 2026-10-21 | 1.0 | Creación del design system móvil (tokens, header, tab bar, AppButton, skeletons, alertas). |
| 2026-10-21 | 1.1 | Refresh del dashboard del guardia: hero redondeado, acciones blancas 2×2, secciones y tarjetas estándar; variante `danger` en `AppButton`. |
| 2026-10-21 | 1.2 | Header plano (sin flotado) y chat movido al header como ícono morado; acciones del guardia sin el tile de chat. |
| 2026-10-21 | 1.3 | Tab bar plana y anclada (sin flotado), manteniendo el CTA central como único elemento que sobresale. |
| 2026-10-21 | 1.4 | Guardia: hero de ronda más compacto y solo 3 acciones coloreadas en una fila (Incidencia, Mantenimiento, Casa Club). |
| 2026-10-21 | 1.5 | Ronda activa: “Terminar ronda” y “Escanear QR” siempre visibles, textos claros para público mayor y CTA del tab bar que abre el escáner de la ronda activa. |
| 2026-10-21 | 1.6 | Escáner QR: marco con esquinas verdes, línea de escaneo animada, hint legible y botón “Cerrar cámara” visible. |
| 2026-10-21 | 1.7 | Loader global no bloqueante (barra superior), skeletons compartidos y animaciones de layout al iniciar/escanear/finalizar ronda. |
| 2026-10-21 | 1.8 | Skeleton visible en el primer arranque del guardia (mínimo 600 ms) y banda de escaneo animada con pulso en el marco QR. |
| 2026-10-21 | 1.9 | Tarjetas de “Mis recorridos” rediseñadas: icono/estado, progreso claro, preview de ubicaciones y CTA para iniciar. |
| 2026-10-21 | 2.0 | Ubicaciones del recorrido con color/borde por estado (PENDING/NOT_COMPLETED/COMPLETED) y conteo real de evidencias (`mediaCount` desde kardex). |
| 2026-10-21 | 2.1 | Escáner QR con máscara/enfoque y línea fina; validación de QRs firmados de CheckApp y rechazo de códigos ajenos. |
| 2026-10-21 | 2.2 | Escáner QR con marco cuadrado simple (sin esquinas HUD) y línea de escaneo fina. |
| 2026-10-21 | 2.3 | Errores de QR ajeno/fuera de ronda en modal propio con reintento, en lugar de Alert nativo. |
| 2026-10-21 | 2.4 | Salida del reporte con modal propio y puntos con borrador marcados como NOT_COMPLETED (iniciados sin terminar). |
| 2026-10-21 | 2.5 | Rediseño del reporte técnico: header, cards, video compacto, galería y footer fijo con AppButton. |
| 2026-10-21 | 2.6 | Reporte técnico más compacto y claro para guardias mayores: labels 13, textos más grandes, menos aire y footer con safe area. |
| 2026-10-21 | 2.7 | Reporte técnico con hero card, secciones con iconos y card “Antes de guardar”. |
| 2026-10-21 | 2.8 | “Añadir” foto abre la cámara directamente; se elimina el diálogo de anotación previa. |
| 2026-10-21 | 2.9 | Rediseño de la cámara: estado, cuadrícula, shutter claro, timer y safe area. |
| 2026-10-21 | 2.10 | Modal de éxito al finalizar la ronda: check verde, mensaje de guardado y botón Entendido. |
| 2026-10-21 | 2.11 | Un punto guardado sin evidencias queda NOT_COMPLETED (rojo), no COMPLETED. |
| 2026-10-21 | 2.12 | CTA central dinámico: Entradas/Ubicaciones con icono y texto según ronda activa. |
| 2026-10-21 | 2.13 | Drawer rediseñado con header verde, logo CheckApp, menú y footer actualizados. |
| 2026-10-21 | 2.14 | Items del drawer simplificados: sin cajas de icono, filas compactas y activo en mint. |
| 2026-10-21 | 2.15 | Perfil rediseñado: hero verde, stat cards, segmented y formulario con AppButton. |
| 2026-10-21 | 2.16 | Caseta con header, cámara en card, chips de acceso y resultado semántico. |
| 2026-10-21 | 2.17 | Caseta con marco/máscara y animación de escaneo igual a ubicaciones; sin hint sobre la cámara. |
| 2026-10-21 | 2.18 | Caseta simplificada: cámara solo dentro del marco blanco, sin bloque negro, y flujo más directo. |
| 2026-10-21 | 2.19 | Formularios de reporte: header CheckApp, evidencia en filas y footer fijo. |
| 2026-10-21 | 2.20 | Tipos de incidencia en grid de 2 columnas con selección tipo radio. |
| 2026-10-21 | 2.21 | Al seleccionar tipo, scroll a Evidencia y animación de pulso en “Tomar foto”. |
| 2026-10-21 | 2.22 | Grabación de video con guías de encuadre, progreso y botón de stop centrado. |
| 2026-10-21 | 2.23 | Botón de video en reposo como punto rojo; stop centrado y timer solo al grabar. |
| 2026-10-21 | 2.24 | Observaciones con padding y dictado por voz (módulo nativo Android SpeechRecognizer). |
| 2026-10-21 | 2.25 | Pantalla de permisos obligatorios post-login con bloqueo hasta conceder todo. |
| 2026-10-21 | 2.26 | Aviso de sin conexión en header para GUARD/MAINT; sin pantalla bloqueante. |
| 2026-10-23 | 2.27 | Reporte técnico: checklist de tareas con el diseño estándar (label 13/900, contador N/M, card blanca, checkbox verde y chip “Foto requerida”) y carga vía `/assignments/me` para guardias. |
| 2026-10-23 | 2.28 | Mis asignaciones: header plano con flecha atrás y refrescar, cards con estado/progreso/CTA, skeleton, empty y error. |
| 2026-10-23 | 2.29 | Header con separación 10 entre acciones; chat con estados de carga/error/reintento sobre `/chat/messages`. |
| 2026-10-23 | 2.30 | Campana de alertas solo para ADMIN y SHIFT; el badge cuenta las alertas de `/dashboard/live`. GUARD/MAINT ya no ven la campana. |
| 2026-10-23 | 2.31 | RBAC en APP: permisos del API, drawer/Home/acciones por permiso, módulos de Propiedades/Residentes/Invitaciones/Entrega/Uniforme y editor de Roles y permisos para ADMIN. |
| 2026-10-23 | 2.32 | Homes distintos por rol: Admin, Jefe, Guardia/Mantenimiento y Residente; nuevo home de autoservicio para residente con accesos por permiso. |
| 2026-10-23 | 2.33 | Home del Jefe de Guardias enriquecido: KPIs de supervisión, alertas, acciones en tarjetas blancas, rondas activas, mi ronda y guardias en turno. |
| 2026-10-23 | 2.34 | Campana = notificaciones de incidencias + mantenimiento + casa club, con pantalla propia; guardias en turno en verde; sin CTA duplicado de iniciar ronda en Mi recorrido. |
| 2026-10-23 | 2.35 | Rondas del Jefe unificadas en una sola tarjeta: en curso + mi ronda, sin secciones duplicadas; duración legible (d/h/min) y límite de 3 con “+N más”. |
| 2026-10-23 | 2.36 | Home y ronda separados para SHIFT: el dashboard solo muestra el resumen y “Mi ronda” abre `ShiftRoundScreen` para iniciar, escanear y terminar. |
| 2026-10-23 | 2.37 | La ronda del Jefe reutiliza la misma pantalla de ronda de Guardia/Mantenimiento (`GuardDashboard roundOnly`); sin variante visual propia. |
| 2026-10-23 | 2.38 | Estándar de listas operativas aplicado a Gestión de Guardias: resumen, búsqueda, filtros por rol, filas densas, skeleton y vacío. |
| 2026-10-23 | 2.39 | Mismo estándar de lista aplicado a Residentes, Usuarios, Propiedades y Ubicaciones: chips de resumen, búsqueda, filas densas y estados. |
| 2026-10-23 | 2.40 | Estándar aplicado a Invitaciones y Horarios: filas densas con estado, resumen, skeleton y vacío. |
