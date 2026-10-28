# Fractales Academy V4.3

Aplicación existente de gestión académica con Express, HTML/CSS/JavaScript y SQL Server/Azure SQL. Se conserva la identidad institucional y el portal del estudiante.

La entrega, decisiones de tablas y limitaciones están en [AUDITORIA_Y_ENTREGA_V4_3.md](AUDITORIA_Y_ENTREGA_V4_3.md). Consulta también [las relaciones](RELACIONES_V4_3.md), [los resultados de pruebas](RESULTADOS_PRUEBAS_V4_3.md) y [el inventario de archivos](ARCHIVOS_ENTREGA_V4_3.md).

## Ejecutar desde VS Code

Abrir esta carpeta y una terminal PowerShell. Requiere Node.js 22 o posterior por las dependencias Azure resueltas; las pruebas aquí se ejecutaron con Node 24.20.0. En PowerShell usar `npm.cmd` evita cambiar la política de ejecución de scripts del sistema.

```powershell
npm.cmd ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Conservar el `.env` existente al actualizar. Para una instalación nueva, editarlo solo en el equipo: servidor, nombre de base, usuario SQL limitado, contraseña SQL y `JWT_SECRET` aleatorio. Generar el secreto sin incluirlo en commits ni capturas:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('hex'))"
```

Crear el esquema siguiendo la ruta de instalación que corresponda más abajo. No basta con ejecutar Express sobre una base vacía.

```powershell
npm.cmd run seed:admin
npm.cmd start
```

`seed:admin` solicita la contraseña sin mostrarla y solo crea el primer administrador si no existe otro activo. Abrir `http://localhost:3000`. `npm.cmd run dev` reinicia Express al editar archivos. La conexión normal usa TLS y validación del certificado; el adaptador Windows sin TLS se limita a los scripts de pruebas en localhost.

## Elegir la instalación SQL correcta

Los scripts están en `sql/migrations/v4_3/`. Seleccionar expresamente la base destino en SSMS o Azure Query Editor, verificar servidor y sustituir `@BaseEsperada` por **el mismo nombre** configurado en `DB_DATABASE`. El valor de ejemplo de `.env` puede diferir del valor de guardia del SQL: no ignorar esa comprobación.

| Situación | Orden |
|---|---|
| Base nueva y vacía, previamente creada | `02_BASE_NUEVA_COMPLETA.sql`, luego `99_VERIFICAR.sql` |
| Base existente V4.1/V4.2 | Respaldo y ensayo; `00_DIAGNOSTICO.sql`, `01_APODERADOS_Y_PRUEBAS.sql`, `99_VERIFICAR.sql` |
| Base anterior sin V4/V4.1 completas | Seguir primero [V4](GUIA_MIGRACION_AZURE_V4.md) y [V4.1](GUIA_MIGRACION_AZURE_V4_1.md); después V4.3 |
| Cuenta de aplicación con permisos por tabla | Revisar y adaptar `03_PERMISOS_OPCIONALES.sql` después de las migraciones |

`02` contiene la instalación completa en una transacción; **no se ejecuta sobre una base que ya tenga tablas**. `01` conserva los datos, rechaza apoderados incompatibles con el mismo DNI y puede reejecutarse. No usar los SQL de referencia como instaladores. No se ejecutan migraciones automáticamente al iniciar el servidor.

`04_DATOS_FICTICIOS.sql` y `05_LIMPIEZA_SEGURA_PRUEBAS.sql` muestran su alcance sin escribir por defecto. Ambos requieren completar sus parámetros y confirmación para ejecutar; la carga ficticia solo admite una base independiente de pruebas. La limpieza conserva apoderados/catálogos compartidos y auditorías. Para recuperación consultar [98_RECUPERACION.md](sql/migrations/v4_3/98_RECUPERACION.md).

## Probar sin Azure ni correos reales

En Windows con SQL Server local y ODBC Driver 18, el siguiente comando crea **dos bases nuevas** con nombres `FractalesAcademy_Pruebas_V4_3_...`: una para instalación completa y otra para migración y operaciones. Utiliza autenticación Windows, no `.env`; no borra ni reutiliza bases existentes. El nombre aparece en la salida. Se conservan las bases de ensayo para inspección.

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run test:sql:v43
```

Para abrir la base de operaciones de ese ensayo:

```powershell
$env:V43_SQL_TEST_DATABASE = 'NOMBRE_DE_LA_BASE_DE_OPERACIONES_MOSTRADO_POR_EL_ENSAYO'
npm.cmd run preview:v43
```

Abrir `http://127.0.0.1:3001/__local/login`. Es un acceso de desarrollo exclusivo del servidor de pruebas ligado a loopback; crea una sesión administradora sin compartir contraseñas. `http://127.0.0.1:3001/__local/student` abre el estudiante ficticio habilitado por el caso G. Estos accesos **no existen en `npm start`** y el script de vista previa no se despliega.

Para pruebas de navegador, dejar abierta esa terminal y ejecutar en otra:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:browser:v43
```

El ensayo usa Chromium headless, guarda capturas en `artifacts/local-preview/v43/`, registra un estudiante ficticio y comprueba formularios, navegación, búsquedas, baja y confirmaciones. Sus pantallas nunca se capturan con la contraseña temporal visible.

## Inscripción, apoderados y horarios

Inscripciones presenta cinco pasos: datos personales, apoderado, enseñanza/modalidad, grupo y confirmación. Se consulta primero el DNI para distinguir reinscripción. El apoderado puede seleccionarse o crearse dentro de la misma transacción; su parentesco pertenece a cada alumno. Se conserva el nombre completo en `Nomb_Alu`, sin dividir ni alterar nombres históricos.

Regular genera cuatro cuotas de S/250; Acelerado, dos. Cada alumno nuevo recibe además un único cargo de S/50 de matrícula/materiales. No se recalculan deudas ni se cargan inscripciones retroactivas a estudiantes legados. El precio nuevo se valida en backend y SQL; se preservan las tarifas históricas.

Los cursos y docentes del horario se consultan directamente en SQL. Elegir ambos crea, si falta, `Docente_Asignatura` junto con el horario. Un fallo o cruce revierte esa relación nueva. Aula y turno se seleccionan al configurar el grupo y se muestran en el horario; para cambiar un aula de un grupo ya utilizado se requiere reorganizar sus bloques. Se pueden añadir aulas desde Catálogos.

## Eliminación y limpieza

Desde Estudiantes → Acciones, desactivar antes de eliminar. La revisión muestra cuenta, matrículas, deudas, contactos y controles de acceso, con importes y razones de bloqueo. Para eliminar se exige motivo, confirmación escrita `ELIMINAR DNI` y una revisión firmada que vence en diez minutos; si cambian los datos, hay que revisarlos otra vez.

Las deudas pendientes pueden retirarse en esa transacción. Cobros actuales, cobros anulados, notas históricas, auditorías cuyo autor sea la cuenta y dependencias adicionales protegidas bloquean la eliminación. Se conserva la auditoría del administrador y el apoderado compartido. No hay cascadas indiscriminadas ni borrado de notas para liberar relaciones.

Datos de prueba solo muestra alumnos con `Es_Prueba=1`, asignado explícitamente al crearlos. No se permite cambiar después esa marca ni reconocer pruebas por nombres. La limpieza admite hasta 50 alumnos revisados por lote y revierte el lote completo si uno deja de ser elegible. Para cuentas de alumno, la revisión conjunta se realiza desde su ficha. Una cuenta administradora sin operaciones protegidas puede desactivarse y retirarse con su control de sesiones; no se permite eliminar la cuenta propia.

## Recuperación de contraseña

¿Olvidaste tu contraseña? solicita el correo registrado. El backend mantiene compatibilidad con solicitudes anteriores por DNI de estudiante; el formulario nuevo utiliza correo para estudiantes y administradores. El contacto debe estar verificado. Un correo compartido por varias cuentas no selecciona arbitrariamente una cuenta: se devuelve el mismo mensaje genérico y se recurre a administración.

Los códigos tienen seis dígitos criptográficos, diez minutos de vigencia, cinco intentos y un uso. La base guarda HMAC con nonce, nunca el código. Hay límites por IP y por cuenta, y la contraseña se guarda mediante bcrypt. Se invalidan las sesiones anteriores y se exige cambiar las claves iniciales.

Para correo real configurar `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, puerto 587 o 465, `SMTP_USER`, `SMTP_PASSWORD` y `EMAIL_FROM` en variables de entorno. El remitente y la autorización de envío deben configurarse en el proveedor SMTP elegido. La entrega externa no se verificó en esta revisión.

`EMAIL_PROVIDER=local` funciona únicamente con `NODE_ENV=development` o `test`. No contacta SMTP y guarda una bandeja temporal de hasta 50 mensajes en memoria. En `preview:v43`, revisar el código en `http://127.0.0.1:3001/__local/mail`; no aparece en logs ni en la API de producción. La bandeja se pierde al cerrar el proceso. En producción este proveedor provoca un error de configuración.

Cada administrador puede registrar y verificar su propio correo desde el botón de perfil, confirmando su contraseña actual y el código recibido. Se reutiliza `Cuenta_Codigo_V41`; `Usuario.Correo_Recuperacion` y `Correo_Verificado` conservan únicamente la dirección y su estado. No se inventan ni verifican correos antiguos al migrar. Una vez verificado, el administrador también puede usar ¿Olvidaste tu contraseña? sin depender de otra cuenta administrativa.

La inscripción conserva también el modo opcional de DNI inicial más código personal de activación, con verificación de identidad y entrega directa. La opción predeterminada es una contraseña temporal individual; ambos modos exigen después una contraseña propia.

## Preparar Azure App Service

No se ha cambiado ningún recurso de Azure. Antes de desplegar: respaldar, ensayar restauración en otra base, revisar el diagnóstico y aplicar manualmente las migraciones autorizadas. Usar una identidad SQL/Entra limitada y comprobar permisos con ese principal, incluida visibilidad de relaciones (`VIEW DEFINITION`). La API necesita permisos de borrado únicamente sobre las tablas indicadas en `03`; nunca sobre auditorías ni notas. No usar `db_owner` para la aplicación.

En App Service, configurar `NODE_ENV=production`, `ACCOUNT_SECURITY_V41=required`, secreto JWT, correo y conexión en Configuration/Environment variables. Para identidad administrada: `DB_AUTH_MODE=entra`, `DB_SERVER`, `DB_DATABASE` y opcionalmente `AZURE_CLIENT_ID`; la identidad requiere usuario y permisos dentro de Azure SQL. Para SQL: `DB_AUTH_MODE=sql`, `DB_USER`, `DB_PASSWORD`. Habilitar HTTPS y revisar firewall/red entre App Service y Azure SQL. Usar Node 22+ y comando de inicio `npm start`; instalar producción con `npm ci --omit=dev`.

Subir a GitHub los archivos listados en [ARCHIVOS_ENTREGA_V4_3.md](ARCHIVOS_ENTREGA_V4_3.md), el código anterior conservado y los recursos de `public/assets/`. El despliegue de aplicación solo necesita `server/`, `public/`, `package.json` y `package-lock.json`; los SQL se revisan y aplican por separado. Pruebas, documentación y generadores pueden permanecer en GitHub sin incluirse en el paquete de aplicación.

Se preparó [fractales-deploy-v43-20261028.zip](fractales-deploy-v43-20261028.zip) con esas rutas, sin secretos ni herramientas de desarrollo. El paquete se comprobó en una carpeta temporal con una instalación de dependencias de producción y carga de Express; esa comprobación no contacta Azure ni sustituye la migración previa.

Nunca subir `.env`, credenciales, contraseñas, códigos, cookies, logs, bases locales, BACPAC/BAK, exportaciones de personas, `node_modules/` ni la bandeja local. `.env.example` contiene solo marcadores. Las capturas de ensayo están ignoradas y usan datos ficticios. No compartir ZIP de toda la carpeta sin revisar su contenido.
