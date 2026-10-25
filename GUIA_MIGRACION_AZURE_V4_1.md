# Migración incremental a Fractales Academy V4.1

Preparada para revisión local el **25 de octubre de 2026, America/Lima**. No se aplicaron scripts, permisos, configuraciones ni envíos en Azure. Los cambios continúan en la rama `feature/fractales-v4`; no hubo push, merge ni despliegue.

## Modelo y compatibilidad

V4.1 parte del modelo V4 completo: 25 tablas originales, `MEDIO_PAGO`, `Auditoria_V4`, `Control_Migracion_V4` y `Linea_Base_V4`, es decir, 29 tablas y 29 FK en el esquema local. La estructura de Azure no se consultó: primero debes inspeccionarla.

La migración agrega seis tablas laterales y once FK; el resultado local es **35 tablas y 40 FK**. **No agrega columnas a las 25 tablas originales**, no cambia sus PK/FK, no reconstruye la base y no transforma contraseñas o contactos anteriores.

| Tabla nueva | Datos y tipos principales | Necesidad |
|---|---|---|
| `Usuario_Seguridad_V41` | Usuario `varchar(20)` PK/FK, versión de sesión `int`, activación requerida `bit` | Revocar sesiones y exigir activación solo en las cuentas nuevas que usen ese modo. Las cuentas sin fila mantienen versión cero. |
| `Cuenta_Codigo_V41` | PK `uniqueidentifier`, usuario FK, propósito/canal, destino, nonce `char(32)`, hash HMAC y hash de desafío `char(64)`, vencimiento/creación `datetime2(0)`, intentos `tinyint`, consumido `bit` | OTP de recuperación/verificación y activación, de un solo uso; no almacena códigos en claro. |
| `Contacto_Verificado_V41` | PK `bigint IDENTITY`, alumno/usuario FK, tipo, destino `varchar(150)`, activo `bit`, método, fecha | Conservar verificaciones anteriores y permitir recuperar solo con un contacto vigente y demostrado. |
| `Solicitud_Contacto_V41` | PK `uniqueidentifier`, alumno/usuario/código FK, tipo/destino, estado, fechas y motivo | Tramitar cambios por código o por revisión administrativa cuando no existe proveedor. |
| `Alumno_Estado_V41` | DNI PK/FK, activo y estado anterior de cuenta `bit`, motivo, administrador FK y fecha | Dar de baja/restaurar al alumno sin borrar datos, matrículas ni pagos. |
| `Nota_Estado_V41` | Código de nota PK/FK, anulada `bit`, motivo, administrador FK y fecha | Anular/restaurar resultados conservando puntaje e historial. |

Se reutilizan los estados ANULADA/CANCELADO de matrícula, ciclo y simulacro, los indicadores Activo/Activa existentes y la anulación de confirmaciones de pago V4. No se inventa un estado financiero nuevo para “vencido”: es un aviso visual derivado del vencimiento y estado pendiente.

`Auditoria_V4` conserva su estructura y protección de inmutabilidad. Se añade un índice por fecha/ID para la consulta administrativa. La auditoría de operaciones de catálogo, estados, claves y contactos se registra desde el backend dentro de la misma transacción, sin secretos.

## 1. Diagnóstico y respaldo

1. Confirma el servidor lógico, la base que utiliza el App Service y la identidad SQL/Entra existente. No cambies conexiones o credenciales.
2. Ejecuta **solo** `sql/migrations/v4_1/00_DIAGNOSTICO_V4_1.sql`. Guarda privadamente los resultados y recuentos de alumnos, matrículas, pagos, notas, simulacros, usuarios y auditorías.
3. Confirma las siete migraciones V4 en `Control_Migracion_V4`. Si ya se completaron, no vuelvas a ejecutar modelos completos ni scripts de datos demo. Si no están completas, primero revisa la [guía V4](GUIA_MIGRACION_AZURE_V4.md).
4. Revisa diferencias de estructura, FK/CHECK deshabilitados o no confiables y objetos V4.1 preexistentes. Los scripts detienen estados inesperados en vez de asumir que pueden reconstruirlos.
5. Verifica el respaldo, punto restaurable y procedimiento ensayado de recuperación antes de autorizar cambios.

Azure SQL dispone de respaldos automáticos según la configuración de retención; confirma la disponible en tu suscripción. Una exportación BACPAC adicional debe contener esquema y registros y ser consistente, sin escrituras o desde una copia consistente. Copias, restauraciones, exportaciones y almacenamiento pueden generar costos. No se creó ninguno. Consulta el procedimiento detallado y fuentes oficiales en la [sección de respaldo V4](GUIA_MIGRACION_AZURE_V4.md#3-respaldo-antes-de-autorizar-producción).

## 2. Ensayo independiente

La base debe estar vacía, previamente creada y seleccionada, con nombre que comience por `FractalesAcademy_Pruebas_V4_1`. No uses producción ni una base con datos que deban conservarse como destino de los scripts de preparación.

Puedes preparar manualmente el esquema mediante `sql/testing/CREAR_ESTRUCTURA_PRUEBAS.sql`, insertar `DATOS_PRUEBA_V4.sql`, aplicar V4 y después V4.1. En cada copia de una migración para pruebas cambia únicamente el literal de `@BaseEsperada` al nombre de esa base.

El ensayo automatizado utilizado exige SQL Server **localhost**, Windows integrado y ODBC Driver 18. No crea la base, no la limpia y rechaza nombres ajenos al prefijo de pruebas:

```powershell
$toolDir = Join-Path $env:TEMP 'fractales-v4-sql-tools'
npm.cmd install --prefix $toolDir --no-save --package-lock=false msnodesqlv8@6.1.0
$env:NODE_PATH = Join-Path $toolDir 'node_modules'
$env:V41_SQL_TEST_DATABASE = 'FractalesAcademy_Pruebas_V4_1_Ensayo01'
$env:NODE_ENV = 'test'
$env:EMAIL_PROVIDER = 'disabled'
npm.cmd run test:sql:v41
```

El test instala V4 y V4.1 en esa base, verifica la compatibilidad antes de migrar, compara el contenido de las 25 tablas originales, reejecuta las cuatro migraciones y prueba HTTP/autenticación con SQL real. El envío se inyecta como proveedor simulado de memoria; no contacta ningún SMTP ni SMS. También ensaya los permisos opcionales con un usuario **local de pruebas sin login**, sin credenciales.

Para regresión V4, usa otra base vacía con prefijo `FractalesAcademy_Pruebas_V4`, configura `V4_SQL_TEST_DATABASE` y ejecuta `npm run test:sql`. Los tests anteriores permanecen.

Para revisar la aplicación sobre una base ya migrada:

```powershell
$env:V4_SQL_TEST_DATABASE = 'FractalesAcademy_Pruebas_V4_1_Ensayo01'
npm.cmd run preview:v4
```

Abre `http://127.0.0.1:3001`. El comando muestra la clave aleatoria de la cuenta ficticia `v4-preview`. Este servidor fuerza EMAIL/SMS desactivados, conserva la conexión real del proyecto sin usarla y solo acepta una base local de pruebas. Detén el proceso con Ctrl+C.

## 3. Orden de ejecución manual en Azure

Pon las escrituras en mantenimiento, verifica el respaldo y confirma en la consulta `DB_NAME()`/servidor. Cada script de escritura contiene `@BaseEsperada=N'FractalesAcademy'`: revisa el nombre real antes de autorizar su ejecución. Los nombres antiguos de otros documentos no sustituyen la confirmación del servidor/base.

| Orden | Archivo en `sql/migrations/v4_1/` | Efecto |
|---|---|---|
| 1 | `00_DIAGNOSTICO_V4_1.sql` | Solo lectura: estructura, controles, recuentos y situación de cuentas/contactos. |
| 2 | `01_RECUPERACION_CUENTAS.sql` | Crea seguridad de usuario/códigos, restricciones e índices. No altera hashes antiguos. |
| 3 | `02_VERIFICACION_CONTACTOS.sql` | Crea verificación/solicitudes y trigger de invalidación al cambiar correo/celular. No verifica contactos antiguos automáticamente. |
| 4 | `03_ESTADOS_Y_ANULACIONES.sql` | Crea estados laterales de alumno/nota. No da de baja ni anula ningún registro al migrar. |
| 5 | `04_AUDITORIA_ADMINISTRATIVA.sql` | Valida auditoría V4, añade índice y completa el registro de la actualización. |
| 6, opcional | `05_PERMISOS_APLICACION_OPCIONAL.sql` | Solo si la cuenta SQL/Entra existente utiliza permisos por tabla. Exige sustituir explícitamente `@UsuarioAplicacion`; no crea usuarios, roles, claves ni conexiones. |
| 7 | `99_VERIFICACION_FINAL_V4_1.sql` | Solo lectura: cuatro registros V41, seis tablas nuevas, relaciones/restricciones activas y recuentos preservados. |

Ejecuta **cada archivo completo**, sin saltar guardas o transacciones, en Azure Query Editor o en una consulta MSSQL de VS Code conectada a la base confirmada. Los scripts no requieren `GO` ni inclusiones SQLCMD. Guarda mensajes y resultados; ante un error no ejecutes el siguiente archivo.

`npm run sql:build:v41` genera los scripts estructurales y de consulta sin conexión SQL. El archivo opcional de permisos se revisa por separado. No necesitas ejecutar ningún generador para aplicar los archivos entregados.

### Permisos

El principal de migración necesita permisos de DDL. El principal de la aplicación necesita SELECT/INSERT/UPDATE en las seis tablas nuevas, SELECT en `Control_Migracion_V4` y DELETE únicamente en los catálogos permitidos, además de sus permisos V4 anteriores. No necesita DELETE sobre alumnos, matrículas, pagos, usuarios, notas, códigos ni auditoría, ni permisos DDL.

El script opcional concede esos permisos al usuario/grupo ya existente que indiques. No revoca privilegios anteriores, no corrige una cuenta que ya tenga `db_owner` y no debe ejecutarse seleccionando `dbo`, `guest`, `public` o un usuario al azar. Revisa los permisos efectivos con el responsable de SQL. Si la identidad no puede ver/acceder a los nuevos objetos, la aplicación puede interpretar que la actualización está pendiente.

## 4. Coordinación con publicación

El backend detecta las seis tablas y los cuatro registros V4.1. Con `ACCOUNT_SECURITY_V41=auto`, una base V4 sin extensiones conserva el acceso temporal y sus procesos, sin DNI con activación ni recuperación por código. Un esquema parcial, un registro incompleto o la desaparición del esquema después de haberlo detectado completo provoca 503; no se reduce la seguridad para continuar autenticando.

Tras migrar y publicar V4.1 en todas las instancias, las nuevas operaciones pueden usar contactos verificados, bajas y versiones de sesión. **No vuelvas a dejar instancias V4 atendiendo autenticación o escrituras después de activar V4.1**: desconocen la revocación y los estados laterales de notas/alumnos.

1. Prepara y prueba el código localmente antes de publicar.
2. En mantenimiento, aplica SQL y verifica recuentos/estructura.
3. Revisa permisos del principal existente y publica el frontend/backend V4.1 juntos. Tras comprobar el esquema, configura `ACCOUNT_SECURITY_V41=required` en el App Service durante la transición aprobada para exigirlo también después de reinicios.
4. Comprueba acceso y consultas con cuentas autorizadas. Prueba escrituras solo en el entorno independiente; no alteres pagos reales para validar el despliegue.
5. Configura SMTP únicamente con aprobación y siguiendo [CONFIGURACION_RECUPERACION_CUENTAS.md](CONFIGURACION_RECUPERACION_CUENTAS.md). Las variables nuevas son ACCOUNT_SECURITY_V41, EMAIL_PROVIDER, SMTP_HOST/PORT/USER/PASSWORD, EMAIL_FROM y SMS_PROVIDER.
6. Recarga por completo los clientes. Los recursos de frontend llevan `v=4.1.0`.
7. Reabre el servicio después de la revisión.

El workflow de GitHub Actions existente no cambió: push/fusión a `main` puede desplegar. En GitHub Desktop revisa Changes en `feature/fractales-v4`, ejecuta comprobaciones y crea/envía el commit solo cuando lo autorices. Coordina la fusión/ejecución de Actions con esta ventana de mantenimiento. No se realizaron estos pasos aquí.

## 5. Qué comprobar al finalizar

- Las 25 tablas originales mantienen sus columnas y registros. En el modelo local completo hay 35 tablas y 40 FK; otras tablas legítimas de Azure pueden aumentar el total y deben investigarse, no eliminarse.
- Existen las cuatro marcas `V41_01`–`V41_04`. El script opcional de permisos no modifica el contador.
- No hay FK/CHECK deshabilitados/no confiables ni nuevas eliminaciones en cascada.
- Los usuarios anteriores conservan nombre, hash, rol y estado. No aparecen verificaciones o activaciones creadas masivamente por SQL.
- Las cuentas nuevas del modo DNI requieren código y cambio de clave; las demás usan contraseña temporal individual.
- La recuperación no envía ni expone códigos cuando no hay proveedor o contacto verificado. Los tests simulados no constituyen prueba de entrega real.
- Las bajas/anulaciones conservan obligaciones, notas y auditoría. Una nota anulada desaparece de la consulta estudiantil, pero su fila y puntaje permanecen.

No se cambian las obligaciones económicas, precio capturado, matrícula/grupo histórico o reglas de simulacros/horarios de V4.

## 6. Error y recuperación

Cada archivo usa una transacción, `XACT_ABORT`, `TRY/CATCH` y `THROW`. Un fallo revierte ese archivo; los anteriores que finalizaron siguen aplicados. Guarda nombre, mensaje y hora, revisa las marcas y corrige la causa en una copia de pruebas. No borres tablas ni filas para forzar una reejecución.

Si un objeto V4.1 existe sin el registro de su migración, o falta una tabla de una migración ya aplicada, el script se detiene. No presupone que puede crear una tabla vacía que sustituya datos perdidos. Investiga la diferencia y ensaya una recuperación autorizada.

Antes de usar V4.1, la extensión es aditiva y no cambia las cuentas antiguas. Después de generar activaciones, verificaciones, recuperaciones o bajas, un rollback al backend V4 puede ignorar esas protecciones: mantén mantenimiento y corrige V4.1 o restaura un respaldo a **otra base** con conciliación de operaciones posteriores. No se entrega un rollback que borre tablas, códigos o historia. Consulta también el procedimiento de recuperación V4 y conserva la base original.

## 7. Registros antiguos de desarrollo

1. Ejecuta privadamente `sql/testing/IDENTIFICAR_REGISTROS_DESARROLLO_V41.sql`, que es de solo lectura. Sus patrones de nombre/código son únicamente pistas: una coincidencia no confirma que la persona sea ficticia.
2. Un administrador contrasta cada caso con la documentación de pruebas y confirma su identidad/propósito. Guarda la lista revisada y el respaldo; no publiques datos personales.
3. Para un catálogo confirmado sin dependencias, entra a su tabla, **Acciones**, revisa relaciones, elige Eliminar, escribe motivo y confirma. El backend vuelve a comprobar las FK dentro de la transacción antes de eliminar.
4. Si hay datos vinculados, conserva el catálogo o usa Desactivar cuando corresponda. No habilites cascadas ni retires FK.
5. Para alumnos, cuentas, matrículas y calificaciones utiliza baja/anulación/restauración. Para pagos utiliza anulación de confirmación con motivo; las deudas se conservan. Aunque un nombre parezca ficticio, **no se borra un grafo académico/financiero**.
6. Revisa Auditoría y los recuentos después de las operaciones aprobadas. No hay limpiezas automáticas ni un `DELETE` masivo por prefijo o nombre.

Las bases locales de pruebas creadas para estos ensayos permanecen separadas. La limpieza de recursos o bases, especialmente de Azure y con costo, requiere una decisión posterior del responsable.
