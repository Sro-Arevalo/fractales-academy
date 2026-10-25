# Fractales Academy V4.2 — interfaz y administración

Trabajo local del **25 de octubre de 2026 (America/Lima)** sobre la aplicación existente, en `feature/fractales-v4`. No se hizo commit, push, merge, despliegue, escritura en Azure SQL, cambio de conexiones/credenciales ni envío real de mensajes.

## Mejoras implementadas

El dashboard incorpora una portada con el aula ilustrada local, composición en dos columnas, ingresos reales del mes y accesos a los procesos existentes. Las seis tarjetas conservan los contadores SQL; no hay estadísticas decorativas inventadas. Se reforzaron el contraste, la jerarquía de títulos, los fondos crema con degradados, el menú marrón/naranja, los estados activos y las tarjetas de acceso rápido.

La intranet conserva la bienvenida por nombre, incorpora la misma identidad visual y presenta mejor matrícula, grupo, ciclo, simulacros y pagos. El horario mantiene sus versiones semanal y por día en móvil, ahora dentro de un panel con leyenda de clases/recreos. Los formularios, tablas, filtros, estados vacíos, errores y modales comparten el tratamiento visual. Las transiciones son breves; el movimiento decorativo tiene duración limitada y se desactiva con `prefers-reduced-motion`.

Se reutilizan exclusivamente `public/assets/aula-fractales.webp`, la ilustración de estudio y los recursos institucionales existentes. No se descargaron imágenes ni se presenta el aula ilustrada como una fotografía auténtica de las instalaciones. No se añadieron fuentes externas, dependencias o proveedores de pago.

Se mantienen las funciones de inscripción transaccional, generación de cuenta/matrícula/cuotas, confirmación y anulación de pagos, simulacros generales, calificaciones, horarios, cambio inicial de clave, activación adicional, recuperación y contactos verificados V4.1. Continúan solo los roles ADMIN y ALUMNO.

## Eliminación definitiva: reglas concretas

En la tabla, abre **Acciones** para revisar el registro. El botón **Eliminar definitivamente** aparece cuando el backend admite la operación. Antes de confirmar se muestran dependencias y advertencias; se exige motivo y casilla de confirmación. Cambiar de acción reinicia esa confirmación. La sección de eliminación destaca que la decisión es irreversible.

| Registro | Cuándo puede eliminarse | Alternativa cuando se bloquea |
|---|---|---|
| Alumno | Ninguna FK dependiente ni historial operativo. Incluye revisar usuarios, matrículas, pagos, notas, solicitudes/contactos y estados V4.1. | Dar de baja/restaurar, conservando historial. |
| Usuario | Ninguna FK dependiente ni historial operativo; no es la cuenta propia ni el último ADMIN activo. | Desactivar/restaurar o recuperar acceso. |
| Catálogos autorizados V4.1 | Sin dependencias ni historial operativo: cursos, carreras, aulas, grupos, ciclos, docentes, asignaciones, simulacros y bloques horarios. | Desactivar/anular cuando el tipo lo admite. |
| Matrícula, pago, calificación y registros históricos | No tienen eliminación física. | Anulación, corrección, baja o reversión de confirmación según el módulo. |
| Auditoría, estados del sistema y tablas de seguridad | No se borran mediante las nuevas acciones. | Conservar y consultar. |

La comprobación inspecciona las FK reales, incluidas relaciones añadidas a SQL. Rechaza relaciones deshabilitadas/no confiables y vuelve a revisar dentro de una transacción SERIALIZABLE con bloqueos. No ejecuta cascadas. También busca auditoría por entidad/código: una acción diferente de **CREAR** bloquea el borrado, aunque no exista una FK. El alta aislada puede conservarse como auditoría después de retirar un registro nunca utilizado. Tanto el alta como la eliminación siguen consultables; los hashes y contraseñas no se copian al historial.

Una cuenta que haya emitido auditoría o tenga seguridad/códigos asociados se conserva. No se borran esas filas para desbloquearla. Si un alumno solo tiene una cuenta nunca utilizada, el administrador puede revisar/eliminar primero esa cuenta y después volver a revisar al alumno; son dos decisiones individuales, nunca una cascada. Un error al registrar auditoría revierte también el DELETE.

Las cuentas nuevas creadas desde Usuarios ya no reciben una fila de revocación innecesaria: todavía no tienen sesiones anteriores. Los cambios de clave/estado de cuentas existentes continúan revocando sesiones. Si falta permiso SQL para DELETE, aparece un mensaje que remite al script de permisos V4.2.

No se realizó limpieza automática ni se eliminaron personas reales. Los ensayos de DELETE usan exclusivamente registros ficticios de bases independientes en SQL Server localhost.

## 1. Archivos modificados y añadidos

| Archivo | Función y motivo |
|---|---|
| `server/administration.js` | Amplía eliminación a ALUMNO/Usuario con guardas de cuenta propia/último ADMIN, FK, historial lógico, transacción y mensajes de permisos. |
| `server/api.js` | Evita revocar sesiones inexistentes durante el alta de una cuenta; mantiene revocación en modificaciones. |
| `public/v41.js` | Actualiza portada administrativa y bienvenida estudiantil, panel/leyenda de horario y confirmación irreversible con cancelación/reinicio. Conserva el módulo y las rutas actuales. |
| `public/v42.css` (nuevo) | Presentación V4.2 compartida: menú, degradados, imágenes, tarjetas, tablas, formularios, modales, horario, accesibilidad y tamaños móviles. Se carga después de estilos anteriores. |
| `public/index.html` | Carga el CSS nuevo y cambia versiones de recursos a `4.2.0` para renovar caché. |
| `scripts/preview-v4-local.js` | Vista real de la aplicación sobre SQL local de pruebas, con acceso ficticio ADMIN/ALUMNO, claves aleatorias y aviso visible. Fuerza correo/SMS desactivados. |
| `package.json` | Versión 4.2.0, alias `preview:v42`, comando `test:sql:v42` y comprobación de sintaxis adicional. |
| `package-lock.json` | Actualiza únicamente la versión raíz; no cambia versiones de dependencias. |
| `.gitignore` | Excluye respaldos/exportaciones SQL, paquetes locales de despliegue y capturas locales además de secretos/dependencias ya excluidos. |
| `tests/v42-ui.test.js` (nuevo) | Cuatro pruebas de imágenes/datos reales, confirmación reiniciable, bloqueo explicado e intranet/horario. |
| `tests/v42-sql.integration.js` (nuevo) | Integración SQL/HTTP: permisos, borrado permitido/bloqueado, historial, seguridad, aislamiento, auditoría y rollback. |
| `sql/migrations/v4_2/00_DIAGNOSTICO_V4_2.sql` (nuevo) | Consulta estructura, controles, FK, permisos y recuentos sin cambiar datos. |
| `sql/migrations/v4_2/01_PERMISOS_ELIMINACION_OPCIONAL.sql` (nuevo) | Concede únicamente DELETE sobre ALUMNO/Usuario al principal existente elegido explícitamente. |
| `sql/migrations/v4_2/99_VERIFICACION_FINAL_V4_2.sql` (nuevo) | Comprueba estructura, permisos, restricciones y auditoría sin cambiar datos. |
| `MAPA_DE_ARCHIVOS.md`, `GUIA_AZURE_PASO_A_PASO.md` | Añade enlaces a este informe; conserva instrucciones históricas. |
| `CAMBIOS_VERSION_4_2.md` (nuevo) | Informe, revisión local, SQL separado y preparación de publicación. |

Permanecen sin cambios `server/db.js`, `server/model.json`, `server/auth.js`, las migraciones V4/V4.1, las pruebas anteriores, los recursos gráficos y el workflow de GitHub Actions.

## 2. Vista previa local real

La herramienta de navegador no dispone de navegador habilitado en esta sesión. **No se entregan simulaciones como capturas.** Se comprobaron comportamiento DOM, respuestas HTTP, roles y SQL, pero falta la inspección visual de escritorio/tablet/celular en un navegador real.

Se inició y verificó la aplicación en `http://127.0.0.1:3001` y se detuvo al finalizar las comprobaciones. Para volver a abrirla desde PowerShell en la raíz del proyecto:

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd test
$toolDir = Join-Path $env:TEMP 'fractales-v4-sql-tools'
# Solo si el controlador opcional aún no está instalado:
npm.cmd install --prefix $toolDir --no-save --package-lock=false msnodesqlv8@6.1.0
$env:NODE_PATH = Join-Path $toolDir 'node_modules'
$env:V4_SQL_TEST_DATABASE = 'FractalesAcademy_Pruebas_V4_2_20261025_Final'
npm.cmd run preview:v42
```

Requisitos: SQL Server **localhost** accesible con Windows integrado y ODBC Driver 18. La base indicada ya se preparó en esta máquina y permanece disponible. No cambies `.env` ni utilices el nombre de la base Azure para este comando. El servidor solo admite nombres con prefijo de pruebas y se enlaza a `127.0.0.1`.

Abre **http://127.0.0.1:3001**. La consola muestra claves aleatorias distintas en cada arranque para:

- ADMIN: `v4-preview`.
- ALUMNO: `42000001`, registro reservado de demostración local.

No se guardan esas claves en archivos, Git o el informe. La vista muestra permanentemente **VISTA LOCAL · DATOS FICTICIOS**. El alumno de vista tiene matrícula y cuotas ficticias creadas mediante la operación real de inscripción. Puede no tener calificaciones/horarios: se muestran estados vacíos, no puntajes inventados. El script no reutiliza personas de producción y se detiene si su DNI reservado pertenece a otro registro. La omisión del cambio inicial de clave existe solo para estas cuentas de vista local, nunca en la aplicación de producción.

Revisa como ADMIN: portada, inscripción, tablas Estudiantes/Usuarios, Acciones, dependencias, errores, pagos y horarios. Cierra sesión y revisa como ALUMNO: bienvenida, matrícula, horario, simulacros, pagos y perfil. Comprueba teclado y anchos de 1440, 1024, 768 y 390 px. Detén la vista con **Ctrl+C** antes de iniciarla otra vez. El nombre `preview:v4` anterior sigue funcionando como alias.

Para repetir la integración en otra base, créala vacía **solo en SQL Server local**, con prefijo `FractalesAcademy_Pruebas_V4_2`; después configura `V42_SQL_TEST_DATABASE` y ejecuta `npm.cmd run test:sql:v42`. El test rechaza bases no vacías, instala las estructuras en esa base y elimina únicamente sus propios registros ficticios. No crea/borra bases ni utiliza un servidor remoto.

## 3. SQL separado y orden de revisión

**V4.2 no requiere cambios estructurales:** no añade tablas, columnas, índices, FK ni migraciones de datos. El modelo completo continúa con **35 tablas y 40 FK** tras V4.1. No se reconstruye nada. El único cambio SQL posible es un permiso adicional si el principal actual utiliza permisos por tabla.

| Orden | Script | Dependencias y finalidad | Comprobación posterior |
|---|---|---|---|
| 1 | `00_DIAGNOSTICO_V4_2.sql` | Solo lectura. Modelo y auditoría V4 existentes; revisar también las cuatro marcas V4.1. | Base/principal correctos, relaciones confiables, recuentos registrados. No devuelve candidatos personales para eliminar. |
| 2, opcional | `01_PERMISOS_ELIMINACION_OPCIONAL.sql` | Requiere V4.1 completo y principal de migración con autorización para GRANT. Seleccionar manualmente `@BaseEsperada` y `@UsuarioAplicacion`. | DELETE efectivo en ALUMNO/Usuario, permisos V4.1 anteriores preservados, sin permisos nuevos de borrado financiero. |
| 3 | `99_VERIFICACION_FINAL_V4_2.sql` | Solo lectura. Ejecutar también bajo la identidad de aplicación para comprobar permisos efectivos. | Recuentos iguales, auditoría inmutable activa, FK/CHECK confiables, controles V4/V4.1 completos. |

Si la cuenta ya tiene DELETE en esas dos tablas, no necesita el script opcional. Este no crea usuarios, no cambia conexiones, no concede `db_owner`, no revoca permisos anteriores ni supera un DENY heredado. Tampoco autoriza DELETE de matrículas, pagos, notas, códigos o auditoría. La aplicación debe conservar SELECT sobre tablas relacionadas y auditoría para comprobar dependencias; no restrinjas su visibilidad de metadatos de forma que oculte relaciones reales.

Los scripts de lectura no incluyen una migración implícita. El opcional valida base/principal, usa transacción y puede reejecutarse. No se agrega una marca estructural V4.2: continúan siete marcas V4 y cuatro V4.1. Si Azure todavía no tiene V4.1, aplica primero su guía completa, después de aprobar respaldo/ensayo. No ejecutes scripts de `sql/testing/` en Azure.

## Pruebas ejecutadas

| Comprobación | Resultado |
|---|---|
| `npm run check` | Correcto, incluido el servidor de vista local y nuevo ensayo SQL. |
| `npm test` | **46 aprobadas**, sin fallos ni omitidas: las 42 anteriores y cuatro V4.2. |
| `npm run test:sql:v42` | **14 comprobaciones aprobadas**, incluyendo contenedor Node Test. SQL Server/HTTP reales, permisos reejecutables, esquema sin cambios y eliminación auditada/revertible. |
| `npm run test:sql:v41` con el backend V4.2 | **23 comprobaciones aprobadas**, incluyendo contenedor: activación, recuperación, contactos, revocación, notas, bajas y compatibilidad con V4. |
| HTTP local | HTML, CSS/JS V4.2 y aula local devuelven 200. Acceso ADMIN/ALUMNO, dashboard, auditoría, tablas, intranet y perfil correctos; alumno recibe 403 en auditoría administrativa. |
| Hojas de estilo | Analizadas sin errores de sintaxis CSS con JSDOM. Esto no equivale a revisar el renderizado en un navegador. |

El primer intento de `npm test` detectó dependencias locales ausentes: se restauraron con `npm ci`. El primer ensayo SQL detectó un código ficticio de fixture demasiado largo; se corrigió respetando la columna y se repitió en otra base vacía. No se quitaron pruebas ni se ampliaron columnas para hacerlas pasar.

Bases locales conservadas: `FractalesAcademy_Pruebas_V4_2_20261025` (primer ensayo), `FractalesAcademy_Pruebas_V4_2_20261025_Final` (ensayo final/vista) y `FractalesAcademy_Pruebas_V4_1_20261025_RegresionV42` (regresión). Las bases de ensayos previos también se conservan; no se hizo limpieza automática.

## 4. Qué subir a GitHub y qué conservar localmente

| Clasificación | Archivos o configuración |
|---|---|
| Listos para revisión y commit | Todos los archivos de la tabla de cambios, incluidos CSS, código, lockfile, tests, documentación, `.gitignore` y scripts SQL sin credenciales. Los scripts subidos no se ejecutan por subirlos. |
| Solo local/privado | `.env`, variantes con secretos, claves aleatorias de vista, credenciales SMTP/SQL, tokens, respaldos `.bak`/`.bacpac`, archivos de base `.mdf`/`.ldf`/`.trn`, exportaciones con datos y capturas con información personal. |
| Dependencias/temporales que no se suben | `node_modules/`, herramientas ODBC/`msnodesqlv8` instaladas bajo TEMP, logs, paquetes `fractales-deploy*.zip`, capturas de `artifacts/local-preview/` y archivos temporales de pruebas. |
| Configuración manual de Azure | V4.2 no añade variables. Conserva DB/JWT actuales, `NODE_ENV=production` y HTTPS. Después de completar/aprobar V4.1, usa `ACCOUNT_SECURITY_V41=required`; SMTP/SMS permanecen según la configuración autorizada V4.1. Nunca copies variables de vista local a Azure. |
| SQL previo al backend | Diagnóstico y verificación V4.2; permiso opcional únicamente si falta. Si no está V4.1, completar previamente sus migraciones incrementales y permisos. |

No cambió ninguna versión de dependencia. La auditoría npm de producción sigue mostrando los dos avisos altos heredados en `@azure/identity`/`@azure/msal-node`; no se aplicó una actualización forzada ni se modificó autenticación Azure. Revisar su aplicabilidad y una actualización compatible antes de publicar.

### Pasos exactos para actualizar Azure cuando lo autorices

1. Revisa los cambios en la rama actual y completa la revisión visual local en ambos roles y tamaños. Confirma respaldo y procedimiento de restauración independiente según [GUIA_MIGRACION_AZURE_V4_1.md](GUIA_MIGRACION_AZURE_V4_1.md).
2. Ensaya en un entorno independiente con identidad/permisos equivalentes a Azure. No uses registros reales para probar DELETE. Documenta los recuentos que deben conservarse.
3. En mantenimiento, confirma servidor/base y principal de aplicación. Si falta V4.1, aplica primero su secuencia. Ejecuta manualmente `00` V4.2, `01` opcional si hace falta, y `99`. No ejecutes scripts de pruebas/preparación contra Azure.
4. Antes de publicar, ejecuta localmente `npm.cmd ci`, `npm.cmd run check` y `npm.cmd test`. Inspecciona Git Changes para excluir secretos/exportaciones/dependencias. No incluyas la herramienta local `msnodesqlv8` en producción.
5. Verifica que el mecanismo existente de despliegue instala las dependencias del lockfile. El workflow actual no ejecuta `npm ci` ni los tests; tampoco se modificó aquí. App Service necesita los paquetes instalados: la restauración automática depende del mecanismo de publicación y de su configuración de compilación. No presupongas que subir únicamente fuentes basta. [Microsoft: aplicaciones Node.js](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs).
6. Cuando autorices publicar, crea el commit desde GitHub Desktop y envía la rama de trabajo tras revisar los archivos. Coordina la revisión y fusión a `main` con mantenimiento: el workflow existente **despliega a producción al recibir un push en main**, y también permite ejecución manual. Publica frontend/backend juntos; no actives el servidor de vista local en App Service.
7. En App Service, revisa **Settings → Environment variables → App settings**. V4.2 no exige nuevas variables. Mantén conexiones y secreto JWT; solo completa parámetros V4.1 previamente aprobados. Cambiar App settings puede reiniciar la app. [Microsoft: configuración de App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-common?tabs=portal).
8. Revisa Actions/logs y `/api/health`, acceso de ambos roles, métricas, perfil y vistas de solo lectura. Confirma recursos con `v=4.2.0`; recarga completamente el navegador. Prueba borrado solo con un registro ficticio autorizado en el entorno independiente. Comprueba mensajes de permisos y auditoría.
9. Reabre el servicio después de la revisión. Si hay fallos, mantén mantenimiento y revierte código de manera coordinada; V4.2 no requiere borrar estructuras/datos SQL. No vuelvas al backend V4 si ya utilizas protecciones laterales V4.1.

Pendientes: inspección visual real, ensayo Azure/Entra con el principal efectivo, rendimiento con volumen real, resolución de avisos heredados y entrega SMTP si decides activar ese servicio. SMS continúa como interfaz preparada V4.1. V4.2 no crea recursos ni genera costos externos nuevos.
