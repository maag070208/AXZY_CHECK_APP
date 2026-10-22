# Reglas para agentes — CheckApp APP

Antes de tocar `APP/src`:

1. Lee `APP/DESIGN.md` completo. Es la fuente de verdad del diseño móvil.
2. Revisa los componentes estándar:
   - `src/shared/components/AppButton.tsx` — botones.
   - `src/navigation/header/HeaderMain.tsx` / `HeaderBack.tsx` — headers.
   - `src/navigation/tabs/AppTabBar.tsx` — tab bar.
   - `src/screens/admin/screens/AdminDashboardScreen.tsx` — referencia de Home.
3. Sigue los tokens y el checklist de `DESIGN.md` (sección 9).

## Reglas cortas

- Nada de colores sueltos: usa los tokens del documento.
- Nada de pantallas amontonadas: padding 16, secciones 22–24, tarjetas 12–16.
- Botones nuevos: `AppButton` (`sm`/`md`), no `Button` de Paper.
- Headers y tab bar: usa los componentes existentes; no dupliques estilos.
- Tarjetas blancas con borde `line`; acciones con icono tintado, no bloques saturados.
- Toda lista: **loading (skeleton), empty y error**. El skeleton también al refrescar.
- Labels de sección: 10/900 mayúsculas con tracking.
- Accesibilidad: `accessibilityRole`, `accessibilityLabel`, hit area ≥ 36×36.
- Textos en español; no agregues i18n en pantallas existentes.

## Actualización obligatoria

Si agregas o cambias un token, componente o patrón visual:

1. Actualiza `APP/DESIGN.md` en el mismo cambio.
2. Agrega una fila al **Changelog** de `DESIGN.md` (fecha, versión, archivos).
3. Si el patrón se repite, créalo en `src/shared/components` y úsalo.

Si no actualizas `DESIGN.md`, el cambio de UI se considera incompleto.
