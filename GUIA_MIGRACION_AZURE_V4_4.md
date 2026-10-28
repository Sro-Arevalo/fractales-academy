# Actualizar V4.3 a V4.4

Los cambios ya están implementados en el proyecto. Esta guía describe la ejecución **manual posterior** del responsable. Codex no modificó Azure ni publicó el repositorio.

## Preparar y ensayar

Revisar [auditoría de tablas](AUDITORIA_Y_ENTREGA_V4_4.md), [relaciones](RELACIONES_V4_4.md), [pruebas](RESULTADOS_PRUEBAS_V4_4.md) y [recuperación](sql/migrations/v4_4/06_PLAN_RECUPERACION.md). Confirmar respaldo/PITR y ensayar primero en otra base con la configuración y extensiones reales. El ensayo incluido contiene datos ficticios representativos, no una copia de producción.

Usar SSMS/Azure Query Editor con una cuenta administradora de migración; la identidad de Express no requiere ALTER. Seleccionar explícitamente servidor/base. En cada script con guardia, cambiar `@BaseEsperada` por el nombre real de DB_DATABASE. No cambiar las guardias para ignorar un error. Cada archivo tiene un propósito independiente; **no concatenar ni ejecutar todos automáticamente**.

## Orden manual

| Paso | Archivo en sql/migrations/v4_4 | Acción |
|---|---|---|
| 00 | 00_DIAGNOSTICO_PREVIO.sql | Solo lectura: tablas, filas, FK, dependencia de Grupo/APODERADO, contactos y duplicados por unidad |
| 01 | 01_PREPARAR_NUEVA_ESTRUCTURA.sql | Con aplicación detenida: columnas de horario, contacto opcional, autorizaciones y huellas de datos anteriores |
| 02 | 02_MIGRAR_DATOS.sql | Completar @AdministradorMigracion con Cod_Usuario de un ADMIN activo; trasladar contactos, archivar todos los apoderados y clasificar cabeceras |
| 03 | 03_VERIFICAR_MIGRACION.sql | Solo lectura: preservar identidad/cantidades/huellas, contactos, respaldo y relaciones |
| 04 | 04_ELIMINAR_ESTRUCTURA_ANTIGUA.sql | Revisar por separado; establecer @Confirmacion=N'RETIRAR APODERADO V4.4'. Vuelve a verificar 03 bajo transacción, descubre el nombre real de la FK, retira solo APODERADO/sus triggers y añade protecciones |
| 05 | 05_VERIFICACION_FINAL.sql | Solo lectura: resultado estándar 35 tablas/41 FK, DBCC, triggers/índice y compatibilidad; DBCC debe devolver cero infracciones |
| 07 opcional | 07_PERMISOS_OPCIONALES.sql | Si se otorgan permisos por tabla, completar el principal existente y revisar los permisos adicionales de cabecera/bloques/notas de prueba |

Desde el inicio de 01 hasta terminar 05 y desplegar V4.4, **mantener App Service detenido y evitar otras escrituras**. Las huellas detectan actividad intermedia y bloquean 04. Las notas y pagos no se migran ni recalculan: se preservan filas e identificadores; la copia de contactos ocurre dentro de ALUMNO.

Los pasos 01/02/04 son reejecutables por sus marcadores. 03 se usa antes del retiro; después de 04 usar 05. No volver a ejecutar instaladores V4.3 sobre la base migrada. Una base nueva puede instalarse primero como V4.3 con el instalador histórico y luego seguir estos pasos; ese instalador no es una actualización de una base ya poblada.

Si hay contactos contradictorios, horarios activos de la misma unidad o dependencias adicionales, el script se detiene. Revisar filas concretas y resolver administrativamente en la copia antes de producción. No se fusionan alumnos, no se desactivan horarios y no se ignoran FK automáticamente. Se conserva Grupo por la decisión normalizada explicada en la auditoría.

## GitHub y App Service

1. Revisar `git diff` y [lista exacta de archivos](ARCHIVOS_ENTREGA_V4_4.md). Ejecutar `npm.cmd ci`, `npm.cmd run check`, `npm.cmd test`. El runner SQL requiere Windows, SQL Server local, ODBC 18 y permisos locales para crear, respaldar/restaurar bases. Crea un origen ficticio V4.3 y otra base nueva restaurada; las pruebas de navegador requieren Chromium de Playwright.
2. En una rama de trabajo, añadir los archivos revisados de código, migraciones y documentación. Usar `git add -u` para incluir la retirada de `server/guardians.js` y añadir explícitamente los archivos nuevos listados. Revisar `git diff --cached --stat`, `git status` y que no haya secretos antes de hacer commit/push. No se hizo commit ni push automáticamente.
3. Si GitHub Actions/Deployment Center despliega al hacer push, detener/deshabilitar temporalmente el despliegue automático hasta completar el SQL y la ventana de mantenimiento. No dejar que el binario V4.4 reciba tráfico contra V4.3.
4. Publicar `server/`, `public/`, `package.json`, `package-lock.json`. El paquete ZIP de esta entrega contiene únicamente esas rutas. Las migraciones se aplican por separado; no configurar un hook SQL de arranque. Un despliegue que conserve archivos antiguos debe comprobar que `server/guardians.js` ya no está: no está referenciado por la nueva aplicación.
5. App Service: elegir un runtime ofrecido por la plataforma compatible con Node 22 o posterior; `NODE_ENV=production`, `ACCOUNT_SECURITY_V41=required`, `JWT_SECRET` robusto, conexión SQL/Entra y SMTP en variables de entorno. Conservar la configuración existente; no incluir `.env` en el ZIP. Inicio `npm start`; instalación `npm ci --omit=dev`. Los paquetes nativos ODBC y Playwright son solo de desarrollo. Consultar [configuración oficial de Node en App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs) para el runtime del sistema operativo utilizado.
6. Comprobar con la identidad limitada los permisos existentes V4.1/V4.2/V4.3 y los adicionales V4.4. No usar db_owner. No conceder DELETE/UPDATE de Auditoria_V4; el borrado de notas reales y cobros queda además bloqueado por triggers. `VIEW DEFINITION` permite inspeccionar todas las FK antes de eliminar.
7. Reabrir y verificar HTTPS, salud, login ADMIN/ALUMNO, crear/publicar horario, matrícula, cuatro/dos cuotas, publicación de notas, portal actualizado, desactivar/reactivar y eliminación ficticia protegida. Verificar el correo SMTP real con un contacto autorizado: la entrega externa no fue probada localmente.

## Archivos que se suben

Sí: código de `server/` y `public/` incluidos sus assets; package/lock; `.gitignore`; `.env.example` con marcadores; SQL y guías; scripts y pruebas de desarrollo. Conservar migraciones históricas como referencia, usando exclusivamente V4.4 para actualizar una base V4.3.

No: `.env`, secretos, conexiones con contraseñas, cookies, códigos OTP, claves temporales, logs, node_modules, capturas/exportaciones con personas, BAK/BACPAC/MDF/TRN, carpetas de artefactos locales, bandejas de correo ni ZIP de toda la carpeta. Los ZIP de despliegue y artifacts están ignorados. Revisar antes de compartir cualquier captura: las pruebas incluidas usan identidades ficticias y evitan fotografiar credenciales.

## Uso local

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd test
npm.cmd run test:sql:v44
# Usar el nombre indicado como "Copia restaurada local para migrar/preview".
$env:V44_SQL_TEST_DATABASE = 'FractalesAcademy_Pruebas_V4_4_FECHA_SUFIJO'
npm.cmd run preview:v44
```

Abrir `http://127.0.0.1:3002/__local/login`. En otra terminal ejecutar `npx.cmd playwright install chromium` y `npm.cmd run test:browser:v44`. El acceso `__local/student` abre el alumno ficticio habilitado por el preview y `__local/mail` muestra la bandeja simulada. Estas rutas solo están en el script ligado a loopback; **no existen en npm start**. Para detener el preview, Ctrl+C. Los scripts no borran las bases creadas.
