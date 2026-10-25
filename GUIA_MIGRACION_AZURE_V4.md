# Migración incremental de Fractales Academy V4

Esta guía prepara una actualización manual revisable. Los cambios se desarrollaron localmente en `feature/fractales-v4`. No se hizo commit, push, fusión, publicación ni modificación de recursos o datos de Azure.

## 1. Confirmar servidor, base y modelo

1. Identifica en Azure Portal el servidor lógico, la base que usa el App Service y su nivel de servicio. No cambies las conexiones, identidad administrada, credenciales ni secretos actuales.
2. Abre una conexión a **esa base concreta** desde Azure Query Editor o la extensión MSSQL de VS Code. Verifica visualmente el servidor y la base seleccionada antes de ejecutar consultas. Los nombres de la documentación antigua pueden diferir: la solicitud indica `FractalesAcademy`, pero hay ejemplos anteriores con otros nombres.
3. Ejecuta solamente `sql/migrations/v4/00_DIAGNOSTICO_PREVIO.sql`. Guarda la salida en un lugar privado. Incluye datos de contacto inválidos e identificadores de alumnos; no la publiques en GitHub.
4. Compara columnas, PK, FK, UNIQUE, CHECK, índices, triggers y procedimientos con los SQL locales. Las migraciones se basan en las 25 tablas originales y 27 FK, no en una estructura inventada.
5. Revisa celulares inválidos, matrículas repetidas de un alumno/ciclo, cuotas repetidas, cargos iniciales históricos, cuentas duplicadas y notas repetidas. Investiga cualquier diferencia de nombres, tipos, nulabilidad o reglas. No deshabilites restricciones para forzar una ejecución.

La consulta inicial muestra `DB_NAME()` y el servidor. Cada script de modificación contiene además:

```sql
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
```

En una copia de los scripts para pruebas, reemplaza ese literal por el nombre exacto de la base de pruebas. Para producción, confirma el nombre real y revisa el literal antes de autorizar la ejecución. La comprobación usa la base seleccionada, no cambia conexiones y no ejecuta `USE` ni crea bases.

`00A` comprueba también las columnas, tipos, nulabilidad, PK, FK y restricciones originales. Si la estructura real no coincide, detén el proceso y prepara una adaptación específica revisada; no ejecutes el antiguo modelo completo sobre la base existente.

## 2. Preparar una base de pruebas

Usa una base **vacía e independiente, previamente creada y seleccionada**, cuyo nombre comience exactamente por `FractalesAcademy_Pruebas_V4`. Un ejemplo local es `FractalesAcademy_Pruebas_V4_Ensayo01`. La cuenta de pruebas necesita permisos para crear el esquema dentro de esa base. No reutilices la base actual de la academia aunque contenga pocos registros.

1. Ejecuta `sql/testing/CREAR_ESTRUCTURA_PRUEBAS.sql`. La guarda impide ejecutar el DDL si el nombre no corresponde a pruebas o si ya hay tablas. Esperado: 25 tablas originales con catálogos y reglas existentes.
2. Ejecuta `sql/testing/DATOS_PRUEBA_V4.sql`. Incluye personas ficticias, dos ciclos, tres grupos, un docente con curso, una matrícula antigua y una obligación pendiente. No incluye contraseñas compartidas.
3. Ejecuta el diagnóstico y después las migraciones en el orden de la sección 4, cambiando `@BaseEsperada` **en la copia para pruebas**.
4. Ejecuta `99_VERIFICACION_FINAL.sql` antes de empezar operaciones de prueba. Esperado: cero filas faltantes/modificadas frente a la línea base y cero incompatibilidades. Los nuevos datos agregados no deben confundirse con pérdidas de datos antiguos.

Para ensayar la preservación de registros, conviene insertar los datos ficticios antes de `00A`. En producción nunca se ejecutan los dos archivos de `sql/testing/` ni los antiguos datos demo.

La preparación, las migraciones y el diagnóstico son archivos SQL completos; no necesitan SQLCMD, inclusiones `:r` ni un generador durante su ejecución. `npm run sql:build` regenera los archivos desde el modelo y SQL original **sin conectarse a ninguna base**; después de regenerarlos debe repetirse el ensayo.

### Ensayo automatizado local usado durante el desarrollo

Se utilizó SQL Server instalado en `localhost`, con autenticación integrada Windows y ODBC Driver 18. No se cambió `server/db.js`. La base de integración debe estar vacía para cada ejecución; la prueba no la crea, no borra datos y no permite nombres de servidor remoto.

```powershell
# Dependencia opcional de pruebas Windows, fuera del proyecto desplegable:
$toolDir = Join-Path $env:TEMP 'fractales-v4-sql-tools'
npm.cmd install --prefix $toolDir --no-save --package-lock=false msnodesqlv8@6.1.0
$env:NODE_PATH = Join-Path $toolDir 'node_modules'
$env:V4_SQL_TEST_DATABASE = 'FractalesAcademy_Pruebas_V4_Ensayo01'
npm.cmd run test:sql
```

La prueba prepara el esquema, siembra datos ficticios, verifica una migración rechazada por celular inválido, aplica y reejecuta las siete migraciones, compara huellas y prueba la API con sesiones reales. Si falta la base o la dependencia, falla y lo informa; no usa Azure como alternativa.

Después, sobre esa misma base migrada:

```powershell
npm.cmd run preview:v4
```

Abre `http://127.0.0.1:3001`. El comando imprime una contraseña aleatoria de la cuenta ficticia `v4-preview`; úsala únicamente en esa vista local. El proceso reemplaza su hash en la base de pruebas al iniciar. No escribe credenciales en archivos ni usa la conexión de producción. Cierra el proceso con Ctrl+C. Para la aplicación habitual siguen existiendo `npm start` y `npm run dev`, que usan la configuración original: no los uses para crear datos ficticios si apuntan a producción.

## 3. Respaldo antes de autorizar producción

No se inspeccionaron la suscripción, SKU, retención, redundancia ni punto de restauración de Azure. Hay que comprobarlos en el portal; guardar SQL y la línea base no respalda los registros.

Azure SQL Database mantiene respaldos automáticos para restauración dentro de la retención configurada. Confirma el primer punto restaurable disponible, la retención y, si aplica, LTR; realiza un ensayo de restauración. Hyperscale utiliza otro mecanismo de respaldo. El almacenamiento adicional, LTR y la base restaurada pueden generar costos. No se creó ninguno de estos recursos durante este trabajo. [Microsoft: respaldos automáticos](https://learn.microsoft.com/en-us/azure/azure-sql/database/automated-backups-overview?view=azuresql).

Como respaldo/exportación adicional, un BACPAC contiene esquema y registros. La exportación debe realizarse sin escrituras o desde una copia transaccionalmente consistente. Verifica que el archivo terminó correctamente y que se puede importar. El almacenamiento Blob, una copia adicional o aumentar capacidad para exportar pueden tener costos que debes autorizar. [Microsoft: exportación BACPAC](https://learn.microsoft.com/en-us/azure/azure-sql/database/database-export?view=azuresql), [copia consistente](https://learn.microsoft.com/en-us/azure/azure-sql/database/database-copy?view=azuresql).

Registra el instante anterior a migrar en UTC, la versión de aplicación y un respaldo comprobado. Conserva también definiciones originales de triggers/restricciones, resultados del diagnóstico, recuentos y plan de recuperación. El esquema local no demuestra qué configuración está desplegada.

## 4. Orden de ejecución

Pon la aplicación en mantenimiento y detén todos los procesos que puedan escribir, incluida la versión antigua y trabajos externos. No basta con ejecutar Node en tu PC. Verifica respaldo y ausencia de escrituras antes de capturar la línea base.

| Orden | Archivo en `sql/migrations/v4/` | Efecto y resultado esperado |
|---|---|---|
| 1 | `00_DIAGNOSTICO_PREVIO.sql` | Solo lectura. Identifica estructura y datos que requieren revisión. Guardar resultados. |
| 2 | `00A_PREPARACION_Y_LINEA_BASE.sql` | Modifica estructura e inserta evidencia técnica: control, línea base, auditoría y secuencia. Captura huellas originales una sola vez. |
| 3 | `01_ACTUALIZACION_CELULARES.sql` | Modifica tres columnas y crea CHECK. Esperado: `varchar(9)` y nulabilidad original. Detiene y revierte si hay datos inválidos. |
| 4 | `02_ACTUALIZACION_MATRICULAS.sql` | Índice, validación de matrícula única por ciclo y protección del historial. Conserva las FK existentes. |
| 5 | `03_ACTUALIZACION_PAGOS.sql` | Catálogo de medios, FK, reemplazo transaccional de CHECK, índices y protección de obligaciones/auditoría. |
| 6 | `04_ACTUALIZACION_SIMULACROS.sql` | Valida notas e instala protecciones adicionales, sin agregar cursos a los simulacros. |
| 7 | `05_ACTUALIZACION_HORARIOS.sql` | Valida horarios existentes, preserva reglas originales y protege grupos/ciclos utilizados. |
| 8 | `06_ACTUALIZACION_USUARIOS.sql` | Comprueba ADMIN/ALUMNO y cuentas únicas. No cambia claves ni nombres antiguos. |
| 9 | `99_VERIFICACION_FINAL.sql` | Solo lectura persistente; utiliza variables de tabla para comparar huellas. Esperado: 7 migraciones, 29 tablas/29 FK en el modelo local, cero filas antiguas faltantes/modificadas, celulares correctos y restricciones activas/confiables. |

`98_INSPECCION_RECUPERACION.sql` es una consulta opcional de solo lectura para reunir evidencia ante un incidente. No revierte ni elimina objetos. No ejecutes `sql/01_AZURE_BASE_NUEVA_25_TABLAS.sql`, `sql/00_REFERENCIA_SQL_SERVER_RECIBIDO.sql` ni migradores V3 como sustituto de esta secuencia en producción.

### Ejecutar cada archivo

En Azure Query Editor, selecciona la base correcta, abre una consulta y pega **un archivo completo**. Revisa `@BaseEsperada`, ejecútalo y guarda todos los resultados y mensajes. En VS Code, con la extensión MSSQL, conecta la consulta a la base correcta, abre el archivo SQL y ejecuta el archivo completo. No selecciones únicamente el cuerpo saltando las guardas o `TRY/CATCH`.

Los archivos V4 son lotes completos sin separadores `GO`. Ante un error, no ejecutes el siguiente archivo: el cliente podría permitir consultas nuevas después de un fallo y cada archivo es una transacción independiente. Los scripts `02`–`06` comprueban también el registro de su predecesor. Una reejecución válida no duplica los objetos ni vuelve a capturar la línea base.

Si existe un trigger original personalizado, revisa su definición en el diagnóstico. Se conserva si ya existe y está activo; un trigger deshabilitado detiene la migración. No se eliminan validaciones originales para permitir registros nuevos.

## 5. Ante datos incompatibles o un error

Anota archivo, mensaje, hora UTC y base. Revisa `Control_Migracion_V4` y ejecuta la inspección `98`. `TRY/CATCH`, `XACT_ABORT` y la transacción revierten el archivo fallido; los archivos anteriores que terminaron siguen aplicados. No asumas que se revirtió toda la serie.

Los celulares, duplicados y notas inválidas requieren una corrección separada autorizada. Documenta filas afectadas, valor anterior/nuevo, motivo y verificaciones; vuelve a ejecutar el diagnóstico. No se ofrece una transformación automática porque faltan las decisiones y datos reales. No trunques celulares ni elimines matrículas/pagos para superar una validación.

Si se corrigieron datos después de capturar la línea base, `99` informará cambios: deben conciliarse contra la intervención autorizada. No sobrescribas ni recaptures la línea base para ocultar diferencias. Para una migración sin transformación, cualquier fila faltante/modificada impide continuar.

## 6. Coordinación con backend y frontend

Prepara el código V4 y las pruebas **antes** de la ventana de mantenimiento. Con las escrituras detenidas, aplica SQL, verifica `99`, publica V4, prueba acceso/consulta con las cuentas autorizadas y recién entonces reabre el servicio. Las pruebas de escritura se hacen en la base independiente o un entorno de staging, no con pagos reales de producción.

| Cambio | Compatibilidad con V3 |
|---|---|
| Secuencia y tablas adicionales | Aditivo para las lecturas existentes. |
| Celulares de 9 caracteres | Las lecturas antiguas funcionan; formularios V3 podían aceptar números más largos y ahora fallarían. |
| FK de medio de pago | Los tres medios anteriores siguen válidos. El editor V3 no conoce medios adicionales. |
| Obligaciones e historia protegida | V3 permitía editar cargos y crear matrículas por separado. V4 usa transacciones y auditoría; no mantener ambas versiones escribiendo. |
| Usuarios antiguos | Conservan acceso, hash y rol. Solo las cuentas nuevas usan DNI y clave temporal aleatoria. |
| Notas y publicación | Las columnas anteriores permanecen; correcciones y publicaciones V4 agregan auditoría. |

**Requiere una transición controlada:** V4 necesita `MEDIO_PAGO`, `Auditoria_V4` y la secuencia. Publicar código antes de SQL causa errores; continuar con V3 después de migrar puede producir operaciones ajenas al flujo integral. No hagas una publicación gradual con instancias V3 y V4 atendiendo escrituras a la vez. Los recursos de frontend llevan versión en la URL; recarga completamente los clientes después de publicar.

## 7. Recuperación específica

1. **Fallo dentro de un archivo SQL:** mantener mantenimiento; confirmar rollback de ese archivo, guardar `98` y corregir la causa mediante un cambio revisado. Reejecutar desde el archivo que falló y repetir `99`.
2. **SQL verificado pero falla la publicación:** mantener mantenimiento y completar/corregir la publicación V4. Conservar objetos adicionales y datos. No reactivar V3 para seguir escribiendo sobre un esquema parcialmente migrado.
3. **Fallo después de operaciones V4:** inmovilizar nuevas escrituras, conservar auditorías y comparar la línea base. Un pago confirmado incorrectamente se anula desde el módulo V4 con motivo; el recibo anterior queda en auditoría. Una nota se corrige con motivo, conservando el puntaje anterior. No borrar registros.
4. **Necesidad de recuperar el estado previo:** restaurar el respaldo al instante UTC registrado en **otra base**, verificar datos y coordinar el cambio de conexión y aplicación con autorización del responsable. Mantener la base original y conciliar inscripciones/pagos posteriores antes de atender nuevamente.

PITR crea una base nueva y no sobrescribe la existente. La elección del instante y la conciliación de escrituras posteriores determinan qué operaciones se recuperan; la restauración debe ensayarse y puede generar costos. [Microsoft: recuperación desde respaldos](https://learn.microsoft.com/en-us/azure/azure-sql/database/recovery-using-backups?view=azuresql).

No se incluye un rollback que elimine tablas o datos. Las cuentas nuevas, auditorías y obligaciones generadas no pueden deshacerse de forma segura mediante una reversión general de DDL; se necesitan conciliación y recuperación controlada. Ampliar nuevamente un celular a 15 caracteres tampoco restituye por sí solo la semántica de V3.

## 8. Revisar y publicar con GitHub Desktop, después de tu autorización

1. Abre el repositorio existente. Confirma **Current branch: `feature/fractales-v4`**. El archivo vacío previo `feature/fractales-v4` permanece intacto y no es la rama.
2. Revisa Changes, los SQL completos y los tres documentos V4 en VS Code. Excluye resultados de diagnóstico, datos personales, archivos `.env`, herramientas temporales, credenciales y salidas privadas. Las pruebas conservan todos los tests anteriores.
3. Ejecuta `npm ci`, `npm run check`, `npm test` y el ensayo SQL independiente. Revisa visualmente escritorio y celular; confirma el estado del respaldo y el plan de mantenimiento.
4. Cuando decidas publicar, crea un commit revisado en la rama. **Publish branch / Push origin** envía los cambios a GitHub; ese paso no se realizó aquí.
5. Revisa la comparación/PR hacia `main`. El workflow actual se activa con push a `main` y también permite ejecución manual. Por ello, fusionar o enviar cambios a `main` puede publicar en Azure inmediatamente.
6. Coordina la fusión/publicación con la sección 6: SQL preparado, mantenimiento activo y verificación final antes de activar V4. No modifiques secretos ni el workflow como atajo. Comprueba el resultado de Actions y los registros de App Service; autoriza la reapertura solo tras la revisión.

La guía no sustituye autorización para crear copias, restauraciones, staging u otros recursos con costo. No se ejecutó ninguna de esas acciones.
