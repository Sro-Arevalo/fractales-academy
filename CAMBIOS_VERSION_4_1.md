# Fractales Academy V4.1 — informe de cambios

Trabajo local sobre el proyecto existente, **25 de octubre de 2026, America/Lima**, en `feature/fractales-v4`. Se conservaron los procesos V4 y sus pruebas. No se hizo commit, push, merge, publicación, envío real de mensajes ni modificación de Azure. No se cambiaron credenciales reales, `server/db.js` o GitHub Actions.

## Diseño e interfaz

El panel del administrador ahora organiza las funciones por **Gestión académica, Evaluaciones, Gestión económica y Administración**. El dashboard usa contadores reales de la API para alumnos, matrículas, grupos, pagos y ciclos, junto con últimas inscripciones y agenda de simulacros. No introduce cifras simuladas en el producto.

La presentación utiliza papel claro, tonos cálidos de la identidad, acentos verdes suaves, tarjetas y una jerarquía más legible. Se reutilizan el logotipo y la ilustración educativa local. Se retiraron las peticiones a fuentes externas; se utiliza tipografía del sistema. No se descargaron imágenes nuevas ni se presentaron ilustraciones como fotografías auténticas de la academia. Los recursos conservados están documentados en el mapa anterior del proyecto; el logo pertenece al material aportado por la academia.

Las tablas incluyen búsqueda, paginación, ordenamiento, filtro de estado donde corresponde y menú de acciones por registro. Las tablas extensas se adaptan a tarjetas en pantallas pequeñas, conservando etiquetas. Los formularios, mensajes, estados vacíos, confirmaciones y diálogos comparten diseño. Se incorporó control del foco de teclado y se respeta `prefers-reduced-motion`.

La intranet muestra bienvenida por nombre, matrícula/grupo/ciclo, accesos a horario, simulacros, pagos y perfil. Los resultados usan tarjetas y barras nativas de progreso basadas en puntajes reales. Los pagos conservan sus estados SQL y muestran un aviso de vencimiento superado cuando una cuota pendiente ya venció. El perfil permite consultar información, cambiar clave y solicitar/verificar contactos.

## Administración segura de registros

| Tipo de registro | Operaciones |
|---|---|
| Cursos, carreras, aulas, grupos, ciclos, docentes, asignaciones, simulacros y bloques horarios sin dependencias | Eliminación física individual, después de revisar relaciones, escribir motivo y confirmar. El backend vuelve a contar referencias reales de SQL bajo una transacción y audita el resultado. |
| Catálogos con Activo/Activa | Desactivar y restaurar, conservando referencias. Las reglas intertablas se vuelven a validar al restaurar. |
| Alumno | Baja y restauración mediante estado lateral. Se suspende el acceso asociado y se revocan sesiones; no se eliminan matrículas ni deudas. Al restaurar se respeta si la cuenta ya estaba desactivada antes. |
| Matrícula | Anular y restaurar con motivo; conserva alumno, grupo, fecha y obligaciones. Restaurar a ACTIVA valida disponibilidad y cupo. |
| Pago | Mantiene la confirmación y anulación de confirmación V4, con administrador, fecha y auditoría. No elimina obligaciones ni perdona deuda automáticamente. |
| Usuario | Desactivar/restaurar y recuperación administrativa con identidad comprobada. No permite desactivar la cuenta propia ni borrar usuarios. La baja del alumno también bloquea el acceso aunque se reactive su usuario por otra vía. |
| Calificación | Corrección con motivo y anulación/restauración. La fila y el puntaje se conservan; una nota anulada no se entrega a la intranet. |
| Simulacro asignado/ciclo | Cancelación y restauración de estados existentes. Restaurar un simulacro no publica resultados automáticamente. |
| Catálogos estructurales, roles, estados y auditoría | Se conservan las restricciones y el historial; no se ofrecen operaciones físicas indiscriminadas. |

Las relaciones se consultan desde `sys.foreign_keys`/columnas, incluidas las tablas añadidas. Se rechaza una eliminación con dependencias o relaciones deshabilitadas/no confiables. No se habilitan cascadas. La interfaz explica el bloqueo y muestra alternativas admitidas.

`sql/testing/IDENTIFICAR_REGISTROS_DESARROLLO_V41.sql` solo identifica **candidatos no confirmados**. La guía describe su revisión y tratamiento individual. No hay limpieza por prefijo, borrado masivo de alumnos ni supresión de historia financiera.

## Acceso, recuperación y contactos

- El primer acceso predeterminado conserva usuario DNI y clave temporal aleatoria. La pantalla inicial solicita nueva clave, confirmación, indicador de seguridad y opción de mostrar/ocultar, antes de abrir la intranet.
- El modo opcional DNI inicial requiere confirmación de identificación/entrega por el administrador y un código individual adicional. Tiene vencimiento, cinco intentos y un desafío restringido; conocer únicamente el DNI nunca concede acceso. No se aplica automáticamente a cuentas anteriores.
- La recuperación por correo usa códigos criptográficos de seis dígitos, diez minutos, cinco intentos persistentes, espera entre envíos y límite por cuenta/IP. Solo utiliza contactos verificados que sigan coincidiendo con el perfil. La respuesta pública no revela si existe un DNI y nunca entrega el OTP.
- El código se guarda como HMAC con nonce, no en claro. Se consume dentro de la misma transacción del cambio de hash bcrypt. Las sesiones anteriores se invalidan por versión y el estudiante vuelve al inicio de sesión.
- Los nuevos contactos se actualizan tras demostrar su control mediante código o mediante revisión administrativa documentada de identidad/control. Un trigger invalida verificaciones cuando se edita el contacto por otra ruta.
- Sin SMTP se muestra ayuda administrativa. Las solicitudes de contacto pueden quedar pendientes de revisión; no se simula un envío. La recuperación administrativa entrega una nueva clave individual una sola vez y obliga a cambiarla.
- SMS queda como **interfaz preparada**, sin proveedor de producción. No se anuncia como recuperación funcional sin adaptador configurado. No se contrató ningún servicio.

Solo existen roles ADMIN y ALUMNO. Docentes siguen siendo registros académicos, sin cuentas de acceso. Las nuevas rutas de perfil siempre toman el DNI de la sesión, y todas las rutas administrativas comprueban ADMIN y sesión completa.

## Archivos modificados y añadidos

| Ruta | Cambio |
|---|---|
| `public/v41.js`, `public/v41.css` (nuevos) | Dashboard, navegación, tablas, acciones controladas, primer ingreso, recuperación, perfil/contactos y presentación de intranet. |
| `public/index.html` | Recursos V4.1, acceso DNI/usuario, activación opcional y enlace de recuperación. |
| `public/app.js` | Integra V4.1 conservando funciones y rutas V4; envía código de activación y delega vistas mejoradas. |
| `public/v4.js` | Modo de entrega inicial explícito, código individual visible solo al administrador y avisos de cuenta desactivada; conserva inscripción/pagos/simulacros/horario. |
| `server/account-security.js` (nuevo) | Activación, OTP, límites, contactos, recuperación, cambio de clave y revocación transaccional. |
| `server/account-service.js` (nuevo) | Instancia del servicio con proveedor de notificaciones configurado. |
| `server/notifications.js` (nuevo) | SMTP mediante Nodemailer con TLS; interfaz SMS y formato +51. Sin proveedor no envía. |
| `server/security-schema.js` (nuevo) | Detecta esquema completo y mantiene compatibilidad con V4; consulta versión de sesión y baja del alumno. |
| `server/accounts-api.js` (nuevo) | Capacidades públicas, recuperación, perfil/contactos, revisión administrativa y auditoría paginada. |
| `server/administration.js` (nuevo) | Políticas de acciones, inspección de FK, eliminación segura y cambios de estado auditados. |
| `server/auth.js` | JWT HS256, desafíos restringidos, versión de sesión y protección de alumno dado de baja. |
| `server/api.js` | Integra servicios, métricas reales, ordenamiento/estado y acciones; audita cambios y oculta notas anuladas. |
| `server/operations.js` | Activa opcionalmente cuentas nuevas, impide reinscribir alumnos de baja y elimina secretos de las instantáneas de auditoría. |
| `server/v4-api.js` | Permite consultar auditoría de las demás entidades administrativas autorizadas. |
| `server/index.js` | Exige HTTPS para API en producción, excepto la consulta de salud; devuelve dependencias de una eliminación bloqueada. |
| `scripts/build-v41-sql.js` (nuevo) | Genera migraciones completas sin conexión SQL, con propiedad de objetos y validación de tipos/restricciones. |
| `scripts/preview-v4-local.js` | Acepta la base V4.1 de pruebas y fuerza correo/SMS desactivados. |
| `sql/migrations/v4_1/` (nuevo) | Diagnóstico, cuatro migraciones, permisos opcionales y verificación. |
| `sql/testing/IDENTIFICAR_REGISTROS_DESARROLLO_V41.sql` (nuevo) | Consulta de candidatos para revisión, sin eliminar. |
| `tests/v41-security.test.js`, `tests/v41-ui.test.js`, `tests/v41-sql.integration.js` (nuevos) | Validación criptográfica/proveedores, comportamiento de interfaz e integración SQL/HTTP. |
| `package.json`, `package-lock.json` | Versión 4.1.0, Nodemailer 10.2.1 y comandos nuevos. Se conservan las versiones bloqueadas de las dependencias de producción anteriores. |
| `.env.example` | Variables ficticias de correo/SMS, desactivadas de manera predeterminada. No se editaron archivos de credenciales reales. |
| `MAPA_DE_ARCHIVOS.md`, `GUIA_AZURE_PASO_A_PASO.md` | Enlaces a la documentación V4.1, conservando la información histórica. |
| Tres documentos V4.1 | Este informe, guía SQL y configuración de recuperación. |

## SQL entregado

No se repiten las migraciones V4 ni se modifica su contenido. V4.1 agrega seis tablas laterales; no agrega/modifica columnas de las tablas originales. Las nuevas once FK no tienen eliminación en cascada. `Auditoria_V4` mantiene su estructura y añade un índice para lectura por fecha/ID.

Orden: **00 diagnóstico → 01 recuperación → 02 contactos → 03 estados → 04 auditoría → 05 permisos opcional → 99 verificación**. `00` y `99` son de solo lectura. `01`–`04` crean estructuras/restricciones y registran la migración; `05` concede permisos concretos a un principal existente solo tras revisión y selección explícita. Ninguno crea bases o modifica contraseñas/contactos anteriores.

Los detalles de columnas, relaciones, guardas y recuperación están en [GUIA_MIGRACION_AZURE_V4_1.md](GUIA_MIGRACION_AZURE_V4_1.md).

## Resultados de pruebas

| Comprobación ejecutada | Resultado |
|---|---|
| `npm test` | **42 aprobadas**, sin fallos ni omitidas; conserva las 27 pruebas previas y añade seguridad, navegación, formularios, confirmaciones y foco de teclado. |
| `npm run check` | Sintaxis correcta de backend, frontend y generador SQL. |
| `npm run test:sql` | **22 comprobaciones aprobadas** según Node Test, incluyendo contenedor: regresión V4 con SQL Server/HTTP reales. |
| `npm run test:sql:v41` | **23 comprobaciones aprobadas** según Node Test, incluyendo contenedor: esquema V4 previo, migración V4.1/reaplicación, cuentas/contactos/acciones, permisos y rechazo de esquema incompleto. |
| Preservación de datos | Se compararon las filas de las 25 tablas originales antes/después de V4.1: sin cambios por la migración. Usuarios anteriores conservan acceso y hash. |
| Eliminaciones | Confirmación requerida; catálogo sin dependencias eliminado/auditado; FK con referencias bloqueada. |
| Cuentas | DNI solo rechazado; código inicial obligatorio; sin datos hasta cambiar clave; desafío consumido y sesiones anteriores inválidas. |
| Recuperación | Correo sin verificar e inexistente con respuestas iguales; cinco intentos persistentes; expiración, reenvíos, límite por cuenta/IP y consumo concurrente único. |
| Contactos | Verificación real del flujo con proveedor simulado; actualización directa invalida verificación; solicitud sin proveedor pasa a administración. |
| Bajas/anulaciones | Conservan matrículas, importes y notas; resultado anulado oculto al alumno; restauración auditada. |
| Mensajes | Proveedor simulado exclusivamente en pruebas; no se afirma entrega SMTP/SMS real. |
| Vista local HTTP | HTML, JavaScript y CSS V4.1 responden 200 con CSP activa. Acceso administrativo, dashboard y auditoría paginada responden 200 sobre SQL local; correo/SMS permanecen desactivados. |

Entorno: SQL Server local, Windows integrado/ODBC Driver 18 y Node.js 24.20.0. Bases locales creadas/conservadas para estos ensayos: `FractalesAcademy_Pruebas_V4_1_20261025`, `FractalesAcademy_Pruebas_V4_1_20261025_Final`, `FractalesAcademy_Pruebas_V4_1_20261025_Seguridad`, `FractalesAcademy_Pruebas_V4_1_20261025_Verificado` y `FractalesAcademy_Pruebas_V4_20261025_Regresion`. No se limpiaron bases previas ni se usaron personas de producción. La vista local se detuvo al finalizar la comprobación.

Las herramientas de navegador no tenían superficies disponibles, incluido el navegador de vista previa. Se verificó comportamiento DOM con JSDOM y API con SQL real, **no renderizado visual en un navegador real**. Quedan pendientes la revisión visual en escritorio/tablet/celular, entrega con el SMTP elegido, pruebas reales de Azure/Entra/permisos, rendimiento con volumen real y publicación.

`npm audit` conserva los dos avisos altos previos de las dependencias Azure (`@azure/identity`/`@azure/msal-node`; [aviso de MSAL](https://github.com/advisories/GHSA-xcx6-jx8p-x3h5)). No se forzó una actualización mayor ni se alteró la autenticación Azure sin ensayo. Revisar su aplicabilidad y una actualización compatible antes de publicar.

## Configuración y publicación pendientes

La recuperación SMTP está terminada como integración, pero necesita un proveedor/servidor, remitente autorizado y variables privadas. Tras aprobar SQL V4.1 también debe configurarse `ACCOUNT_SECURITY_V41=required`; la detección de un esquema parcial ya bloquea autenticación en vez de revivir sesiones antiguas. El costo de correo depende del proveedor y volumen. SMS no tiene adaptador de producción seleccionado; requiere compatibilidad con Perú, credenciales, ensayo y aprobación de costos. No se activó ni contrató ninguno.

Consulta [CONFIGURACION_RECUPERACION_CUENTAS.md](CONFIGURACION_RECUPERACION_CUENTAS.md) para parámetros, TLS, límites, fallos y alternativa administrativa. No cambies el secreto JWT existente durante esta migración.

Antes de publicar: respaldo verificado, revisión de scripts/base/principal, ensayo independiente, revisión visual, migración incremental y publicación coordinada del backend/frontend V4.1. No mantengas V4 atendiendo autenticación después de activar revocación/estados nuevos. Confirma que el mecanismo existente de despliegue instala las dependencias del lockfile, incluido Nodemailer: el workflow actual no ejecuta `npm ci` ni los tests explícitamente, y no se modificó para inferir la configuración de compilación de App Service.

La guía describe la publicación manual mediante GitHub Desktop y el riesgo de que una fusión/push a `main` active Actions. Todos los cambios permanecen locales para revisión.
