# MAPA DE ARCHIVOS — FRACTALES ACADEMY

**Actualización V4:** consulta [CAMBIOS_VERSION_4.md](CAMBIOS_VERSION_4.md), [RESUMEN_CAMBIOS_BASE_DATOS.md](RESUMEN_CAMBIOS_BASE_DATOS.md) y [GUIA_MIGRACION_AZURE_V4.md](GUIA_MIGRACION_AZURE_V4.md). Los flujos nuevos están en `public/v4.js`, `server/operations.js` y `server/v4-api.js`; las migraciones incrementales están en `sql/migrations/v4/`. El mapa siguiente describe la estructura original V3 conservada como base.

## FRONTEND: todo lo que ve el usuario
- `public/index.html`: estructura del inicio de sesión, menú, cabecera y aplicación.
- `public/styles.css`: colores, diseño responsive, transiciones y animaciones (incluye portal del estudiante).
- `public/app.js`: JavaScript del navegador; dibuja tarjetas, tablas y formularios; usa `fetch()` para llamar a la API. **NO habla directamente con SQL Server.**
- `public/assets/logo-original.png`: logo aportado por la academia.
- `public/assets/banner-fractales.png`: afiche institucional aportado por la academia.
- `public/assets/aula-fractales.webp`: imagen ilustrativa original generada para el portal (NO fotografía de la sede real).
- `public/assets/estudio-ilustracion.svg`: ilustración vectorial para motivación estudiantil, animada mediante CSS.

## BACKEND: servidor Node.js, Express
- `server/index.js`: inicia servidor, configura Helmet/cookies, sirve `public/` y registra `/api`.
- `server/api.js`: **rutas y consultas a SQL Server**. Aquí están login, CRUD administrativo, panel e información del estudiante. Usa consultas SQL parametrizadas.
- `server/db.js`: **abre las conexiones a Azure SQL** usando `mssql`; lee `DB_SERVER`, `DB_DATABASE`, el modo de autenticación y otros ajustes.
- `server/rules.js`: reglas de validación de negocio antes de guardar datos.
- `server/auth.js`: verificación de identidad, JWT, cookies y permisos ADMIN/ALUMNO.
- `server/model.json`: catálogo técnico de las 25 tablas, PK, campos y tipos. **No es una base de datos en JSON**; sirve para generar formularios y validar operaciones.

## BASE DE DATOS / SQL
- `sql/00_REFERENCIA_SQL_SERVER_RECIBIDO.sql`: script original actualizado recibido; NO ejecutar automáticamente contra Azure.
- `sql/01_AZURE_BASE_NUEVA_25_TABLAS.sql`: crea tablas, FK y restricciones en Azure SQL VACÍA; NO repetir si ya las creaste.
- `sql/03_ACTUALIZAR_BASE_EXISTENTE.sql`: migración de versiones anteriores (revisar antes de ejecutar).
- `sql/04_VERIFICAR_INSTALACION.sql`: comprueba estructura SQL.
- `sql/02_catalogos_iniciales.sql`: catálogo alternativo, no ejecutar si la base nueva ya trae datos.
- `sql/03_datos_demo_opcionales.sql`: datos ficticios opcionales para pruebas.

## CONFIGURACIÓN, DESPLIEGUE Y PRUEBAS
- `package.json`: dependencias y comandos `npm start`, `npm run seed:admin`, `npm test`.
- `.env.example`: ejemplo de variables; crear `.env` localmente sin compartirlo.
- `scripts/create-admin.js`: inicializa el primer usuario administrativo en la BD Azure; ejecutarlo SOLO en tu PC.
- `scripts/prepare-deploy.ps1`: genera un ZIP que contiene **solo** `public/`, `server/`, `package.json` y lockfile (si existe). No incluye `.env`.
- `tests/`: pruebas automatizadas sin conexión a Azure.
- `DEMO_ESTUDIANTE_OFFLINE.html`: vista navegable con información INVENTADA, no se conecta a Azure.
- `GUIA_AZURE_PASO_A_PASO.md`: conexión, publicación y solución de problemas.

## VIAJE DE LOS DATOS
1. El alumno pulsa «Mis notas» en `public/app.js`.
2. El navegador consulta `GET /api/student/overview`.
3. `server/api.js` verifica permiso de alumno y prepara SELECT filtrados por DNI autenticado.
4. `server/db.js` usa la conexión con Azure SQL Database.
5. SQL devuelve la información y el backend la envía en JSON.
6. `public/app.js` pinta las notas publicadas en pantalla.

**Privacidad:** la contraseña SQL nunca debe ir en el frontend ni en un repositorio.
