# SUBIR FRACTALES ACADEMY A AZURE — GUÍA PASO A PASO

**Referencia anterior V3.** Para actualizar la base existente a V4 utiliza [GUIA_MIGRACION_AZURE_V4.md](GUIA_MIGRACION_AZURE_V4.md). V4 sí requiere migraciones incrementales y coordinación con el backend; las cantidades y procedimientos de instalación siguientes corresponden a la versión anterior. No ejecutes el modelo completo sobre la base existente.

**Arquitectura:** un solo Azure App Service (frontend `public/` + backend `server/`) y una Azure SQL Database. Tu laptop puede estar apagada después del despliegue; depende de cuotas, estado de suscripción y disponibilidad de Azure.

## 1. Si ya creaste las 25 tablas en Azure SQL
**NO vuelvas a ejecutar** `sql/01_AZURE_BASE_NUEVA_25_TABLAS.sql`. Abre el editor de consultas de Azure SQL o SSMS con la base seleccionada, ejecuta `sql/04_VERIFICAR_INSTALACION.sql` y confirma 25 tablas, 27 FK, 4 triggers y 3 índices únicos, según tu script actualizado. Este proyecto no cambia el esquema.

## 2. Configura la conexión en tu PC (Visual Studio Code)
- Instala Node.js LTS. En VS Code, abre la **carpeta raíz** del proyecto (donde está `package.json`).
- Copia `.env.example` a `.env` (en PowerShell: `Copy-Item .env.example .env`).
- En `.env`, usa `DB_SERVER` con el FQDN `nombre.database.windows.net`, `DB_DATABASE` con el nombre real de la base, `DB_USER`/`DB_PASSWORD` de un **usuario SQL de aplicación con permisos limitados** y `DB_AUTH_MODE=sql` para la prueba inicial. NO pegues credenciales en el chat ni en el código.
- Crea un secreto JWT fuerte ejecutando `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` y pégalo solo en `JWT_SECRET` local.
- En Azure Portal > Servidores SQL > tu servidor > Redes, permite la IP pública de **tu PC** para hacer pruebas locales, preferiblemente solo esa IP. Azure SQL también necesita acceso desde App Service mediante un mecanismo de red adecuado.
- Ejecuta en la terminal:

```powershell
npm install
npm test
npm run seed:admin
npm start
```

- Comprueba `http://localhost:3000/api/health` (debe devolver `ok: true`) y abre `http://localhost:3000/`. El comando `seed:admin` se usa una sola vez para dar acceso inicial.

## 3. Crea Azure App Service
1. Portal de Azure: **Crear recurso > Web App / Aplicación web**.
2. Suscripción: **Azure for Students**; grupo de recursos: el de tu proyecto o uno nuevo.
3. Publicar: **Código**, runtime: **Node.js LTS** y un SO compatible con tu plan.
4. Región: preferentemente la misma o cercana a Azure SQL.
5. Plan: comprueba la oferta de tarifa en el portal; F1 puede funcionar para pruebas, pero sus recursos son limitados y puede no estar disponible para todas las configuraciones. Verifica costos antes de crear.
6. Crear la web y anota su nombre, ejemplo `fractales-web-123`.

## 4. Configura las variables del backend EN EL PORTAL
En tu App Service > **Configuración/Variables de entorno** > agrega:

```text
NODE_ENV=production
DB_AUTH_MODE=sql
DB_SERVER=nombre.database.windows.net
DB_DATABASE=NombreRealDeTuBD
DB_PORT=1433
DB_USER=USUARIO_SQL_DE_APLICACION
DB_PASSWORD=(secreto que introducirás solo en Azure)
JWT_SECRET=(secreto aleatorio; nunca publicarlo)
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

**NO configures `PORT` en Azure**, App Service asigna uno. No subas `.env`. 

Recomendado después de las pruebas: `DB_AUTH_MODE=entra` con **identidad administrada** en App Service, administrador Microsoft Entra en Azure SQL y usuario de la identidad creado en la base con roles mínimos. `server/db.js` ya contempla esa modalidad. Una identidad gestionada requiere autorización SQL: NO se configura solo cambiando la variable.

## 5. Conexión entre App Service y Azure SQL
- El servidor SQL tiene firewall, el App Service debe poder alcanzar Azure SQL. No publiques SQL Server directamente a todo Internet.
- Para una demo básica, puedes crear una regla temporal y restringida de acceso a Azure SQL para el tráfico del App Service; otra opción es usar **Service Connector** / conexiones de servicio e identidad administrada según la configuración de Azure que tengas. Algunas alternativas (p. ej. redes privadas) requieren planes de pago.
- Si ves error de firewall, revisa la red y los registros de Azure; no envíes contraseñas ni capturas que las muestren.

## 6. Publica FRONTEND + BACKEND como una sola Web App
La forma **más fácil** es instalar la extensión **Azure App Service** en VS Code, iniciar sesión con tu Microsoft y elegir **Deploy to Web App** sobre la carpeta raíz, excluyendo `.env`, `node_modules`, archivos demo/SQL y documentos de referencias. 

O usa PowerShell + Azure CLI:

```powershell
az login
powershell -ExecutionPolicy Bypass -File scripts/prepare-deploy.ps1
az webapp deploy --resource-group TU_GRUPO --name TU_WEBAPP --src-path FractalesAcademy-despliegue.zip --type zip
```

El archivo de despliegue contiene `package.json`, `public/`, `server/`, y opcionalmente `package-lock.json`, **no** incluye secretos. `SCM_DO_BUILD_DURING_DEPLOYMENT=true` permite instalar dependencias durante el despliegue en configuraciones compatibles.

## 7. Comprueba que funciona en Internet
- Abre `https://TU_WEBAPP.azurewebsites.net/api/health`: debe mostrar JSON con `ok:true`.
- Abre `https://TU_WEBAPP.azurewebsites.net/`: debe aparecer el inicio de sesión.
- Entra como ADMIN e inserta un registro de prueba. Entra como ALUMNO para verificar horarios y notas publicadas.
- No introduzcas datos reales de menores hasta revisar roles, seguridad, políticas de datos y consentimientos.

## 8. Solución de errores habituales
- 503 y «Falta configurar DB_…»: variables incompletas o mal escritas.
- Error de login: nombre de usuario de la APLICACIÓN no es el usuario SQL de Azure. Crear ADMIN con `npm run seed:admin`.
- SQL timeout / login failed: firewall, credenciales o permisos SQL.
- Al cargar la app aparece 500: revisa **App Service > Log stream** y `SCM_DO_BUILD_DURING_DEPLOYMENT`.
- «Invalid object name»: base o esquema incorrecto, o no ejecutaste el SQL necesario.

## 9. Documentación oficial
- https://learn.microsoft.com/en-us/azure/azure-sql/database/azure-sql-javascript-mssql-quickstart
- https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs
- https://learn.microsoft.com/en-us/cli/azure/webapp?view=azure-cli-latest
- https://learn.microsoft.com/en-us/azure/app-service/tutorial-connect-msi-azure-database
