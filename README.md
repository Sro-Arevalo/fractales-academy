# Fractales Academy V4.4

Proyecto existente con Node.js/Express, HTML/CSS/JavaScript y Azure SQL. V4.4 incorpora una cuadrícula semanal con guardado transaccional, borradores, docentes, copia a otro período, colores y exportación PNG. El contacto del apoderado es opcional y pertenece a cada alumno. La eliminación distingue datos ficticios de notas reales y cobros protegidos.

La base estándar pasa de **36 a 35 tablas y conserva 41 FK**. Grupo se reutiliza como cabecera técnica del horario; sustituirla reproduciría la misma entidad y relaciones. Su gestión separada desaparece del menú. APODERADO se retira solo mediante el paso SQL manual 04 después de transferir, respaldar y verificar sus datos.

Documentación:

- [Auditoría de las 36 tablas](AUDITORIA_Y_ENTREGA_V4_4.md).
- [Diagrama actualizado](RELACIONES_V4_4.md).
- [Actualización Azure, GitHub y despliegue](GUIA_MIGRACION_AZURE_V4_4.md).
- [Resultados de pruebas](RESULTADOS_PRUEBAS_V4_4.md).
- [Archivos modificados](ARCHIVOS_ENTREGA_V4_4.md).
- [Plan de recuperación](sql/migrations/v4_4/06_PLAN_RECUPERACION.md).

## Ejecutar

Node 22 o posterior; probado con Node 24.20.0. En Windows, npm.cmd evita cambiar la política de PowerShell.

```powershell
npm.cmd ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Conservar el .env existente. Para una instalación nueva, completar solo localmente conexión y JWT_SECRET aleatorio de al menos 32 caracteres. No subirlo al repositorio. La conexión normal usa TLS validando el certificado y admite usuario SQL limitado o identidad Entra.

**Completar manualmente V4.3 → V4.4 antes de iniciar esta versión.** Para una base nueva, instalar primero V4.3 con su instalador histórico y seguir después las etapas V4.4. No ejecutar instaladores de base nueva sobre una base poblada. seed:admin solo se utiliza cuando hace falta el primer administrador.

```powershell
npm.cmd start
# http://localhost:3000
```

npm.cmd run dev reinicia al editar archivos. npm start no ejecuta SQL de migración ni habilita accesos ficticios.

## SQL V4.4

En sql/migrations/v4_4 hay archivos separados: 00 diagnóstico, 01 preparación, 02 traslado, 03 verificación, 04 retirada manual y 05 verificación final; 06 documenta recuperación y 07 complementa permisos opcionales. Detener escrituras durante toda la ventana. Revisar servidor, nombre de base, administrador responsable y confirmación del DROP. El paso 04 obtiene el nombre real de la FK y vuelve a comprobar las huellas antes de retirar APODERADO. No se modificó Azure durante esta implementación.

## Pruebas y vista local

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run test:sql:v44
```

El último comando requiere SQL Server local, ODBC Driver 18 y autenticación Windows con permisos locales para crear, respaldar y restaurar bases. Prepara una base NUEVA V4.3 ficticia, hace BACKUP COPY_ONLY/VERIFYONLY y restaura en otra base NUEVA antes de ensayar V4.4. Muestra el nombre de la copia restaurada para usar en el preview. No utiliza .env para conectarse, no reutiliza ni elimina bases; conserva el origen y el respaldo local. Las suites SQL anteriores se conservan como evidencia histórica de esas versiones; la suite vigente es V4.4.

```powershell
$env:V44_SQL_TEST_DATABASE = 'NOMBRE_DE_COPIA_RESTAURADA_MOSTRADO_POR_EL_ENSAYO'
npm.cmd run preview:v44
# http://127.0.0.1:3002/__local/login
# En otra terminal:
npx.cmd playwright install chromium
npm.cmd run test:browser:v44
```

La vista previa liga un servidor separado a loopback, crea una sesión ficticia y simula el correo. Las capturas quedan en artifacts/local-preview/v44 y evitan fotografiar contraseñas/códigos. Ctrl+C detiene el preview. No desplegar sus scripts como servidor de producción.

## Funcionamiento

Consultar el DNI distingue ficha nueva de reinscripción. Se selecciona un horario publicado, ciclo, modalidad y turno. Regular genera cuatro mensualidades de S/250; Acelerado dos. Un alumno nuevo recibe además un cargo inicial de S/50. No se recalculan deudas históricas ni se cargan inscripciones retroactivas a alumnos legados. Se conserva contraseña temporal individual o el modo opcional DNI + código de activación con entrega identificada; ambos exigen contraseña personal.

La cuadrícula admite 200 bloques y siete días. Un horario activo por ciclo/turno/aula, cupos, cruces por fechas, excepciones de turno y versión de edición se validan dentro de transacción. Los borradores no admiten nuevas matrículas. El alumno solo lee clases propias publicadas y resultados publicados no anulados.

En Estudiantes → Acciones, Desactivar conserva todo y revoca el acceso. Reactivar devuelve el estado de acceso anterior. Eliminar definitivamente exige inactividad, revisión firmada, DNI escrito y motivo; vuelve a comprobar todas las relaciones bajo transacción. Las notas reales y los cobros, incluso revertidos, bloquean el borrado. Solo las notas de una ficha marcada inmutablemente como ficticia pueden retirarse junto con deudas pendientes. La auditoría permanece. Cursos/docentes sin uso y horarios sin matrículas ni otras dependencias protegidas también pueden retirarse.

## Recuperación y publicación

La recuperación utiliza correo verificado, OTP criptográfico de seis dígitos, diez minutos, cinco intentos, HMAC en SQL y un uso. Cada administrador verifica su propio correo desde Mi perfil. Un correo compartido no selecciona arbitrariamente una cuenta. Se conservan recuperación asistida y cambios auditados.

Para envío real configurar EMAIL_PROVIDER=smtp, SMTP_HOST, SMTP_PORT 587/465, SMTP_USER, SMTP_PASSWORD y EMAIL_FROM. La prueba local no contacta SMTP. EMAIL_PROVIDER=local está prohibido en producción; la bandeja simulada solo existe en el preview.

App Service usa NODE_ENV=production, ACCOUNT_SECURITY_V41=required, JWT_SECRET y conexión/correo en variables de entorno, Node 22+ y npm start; instalar con npm ci --omit=dev. No requiere Playwright ni ODBC nativo. Revisar permisos existentes y 07_PERMISOS_OPCIONALES.sql con la identidad limitada. Nunca conceder DELETE/UPDATE de auditorías ni usar db_owner para Express.

El paquete de aplicación contiene solo server/, public/, package.json y package-lock.json. SQL, documentación y pruebas se revisan por separado. No subir .env, secretos, node_modules, logs, bases, BAK/BACPAC, capturas con personas ni bandejas de correo. Ver la guía de migración para el orden y las verificaciones posteriores.
