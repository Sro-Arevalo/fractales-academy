# Archivos de la entrega V4.3

Inventario de cambios respecto al repositorio recibido. Los archivos anteriores no enumerados se conservan. El esquema completo generado se incluye para revisión; no se ejecuta automáticamente.

| Estado | Archivo |
|---|---|
| Modificado | [.env.example](.env.example) |
| Creado | [ARCHIVOS_ENTREGA_V4_3.md](ARCHIVOS_ENTREGA_V4_3.md) |
| Creado | [AUDITORIA_Y_ENTREGA_V4_3.md](AUDITORIA_Y_ENTREGA_V4_3.md) |
| Creado | [README.md](README.md) |
| Creado | [RELACIONES_V4_3.md](RELACIONES_V4_3.md) |
| Creado | [RESULTADOS_PRUEBAS_V4_3.md](RESULTADOS_PRUEBAS_V4_3.md) |
| Modificado | [package-lock.json](package-lock.json) |
| Modificado | [package.json](package.json) |
| Modificado | [public/index.html](public/index.html) |
| Modificado | [public/v4.js](public/v4.js) |
| Modificado | [public/v41.js](public/v41.js) |
| Creado | [public/v43.css](public/v43.css) |
| Creado | [public/v43.js](public/v43.js) |
| Creado | [scripts/build-v43-sql.js](scripts/build-v43-sql.js) |
| Modificado | [scripts/preview-v4-local.js](scripts/preview-v4-local.js) |
| Creado | [scripts/preview-v43-local.js](scripts/preview-v43-local.js) |
| Creado | [scripts/test-v43-browser.js](scripts/test-v43-browser.js) |
| Creado | [scripts/test-v43-local.js](scripts/test-v43-local.js) |
| Modificado | [server/account-security.js](server/account-security.js) |
| Modificado | [server/accounts-api.js](server/accounts-api.js) |
| Modificado | [server/administration.js](server/administration.js) |
| Modificado | [server/api.js](server/api.js) |
| Modificado | [server/db.js](server/db.js) |
| Creado | [server/guardians.js](server/guardians.js) |
| Modificado | [server/index.js](server/index.js) |
| Creado | [server/maintenance-api.js](server/maintenance-api.js) |
| Modificado | [server/notifications.js](server/notifications.js) |
| Modificado | [server/operations.js](server/operations.js) |
| Modificado | [server/rules.js](server/rules.js) |
| Creado | [server/schema-v43.js](server/schema-v43.js) |
| Creado | [server/student-lifecycle.js](server/student-lifecycle.js) |
| Modificado | [server/v4-api.js](server/v4-api.js) |
| Creado | [sql/migrations/v4_3/00_DIAGNOSTICO.sql](sql/migrations/v4_3/00_DIAGNOSTICO.sql) |
| Creado | [sql/migrations/v4_3/01_APODERADOS_Y_PRUEBAS.sql](sql/migrations/v4_3/01_APODERADOS_Y_PRUEBAS.sql) |
| Creado | [sql/migrations/v4_3/02_BASE_NUEVA_COMPLETA.sql](sql/migrations/v4_3/02_BASE_NUEVA_COMPLETA.sql) |
| Creado | [sql/migrations/v4_3/03_PERMISOS_OPCIONALES.sql](sql/migrations/v4_3/03_PERMISOS_OPCIONALES.sql) |
| Creado | [sql/migrations/v4_3/04_DATOS_FICTICIOS.sql](sql/migrations/v4_3/04_DATOS_FICTICIOS.sql) |
| Creado | [sql/migrations/v4_3/05_LIMPIEZA_SEGURA_PRUEBAS.sql](sql/migrations/v4_3/05_LIMPIEZA_SEGURA_PRUEBAS.sql) |
| Creado | [sql/migrations/v4_3/98_RECUPERACION.md](sql/migrations/v4_3/98_RECUPERACION.md) |
| Creado | [sql/migrations/v4_3/99_VERIFICAR.sql](sql/migrations/v4_3/99_VERIFICAR.sql) |
| Modificado | [tests/v4-sql.integration.js](tests/v4-sql.integration.js) |
| Modificado | [tests/v41-ui.test.js](tests/v41-ui.test.js) |
| Creado | [tests/v43-security.test.js](tests/v43-security.test.js) |
| Creado | [tests/v43-sql.integration.js](tests/v43-sql.integration.js) |

Para GitHub: revisar y añadir estos archivos junto con el repositorio existente. No incluir secretos, logs, bases o capturas privadas.

Para App Service: el paquete de aplicación contiene únicamente server/, public/, package.json y package-lock.json. Los SQL, pruebas y documentación se conservan por separado para revisión. No ejecutar SQL automáticamente durante el despliegue.

Artefacto local adicional, ignorado por Git: `fractales-deploy-v43-20261028.zip`. Contiene solo los 34 archivos de aplicación de las rutas indicadas, sin `.env`, pruebas, scripts de desarrollo, SQL, logs ni dependencias instaladas.
