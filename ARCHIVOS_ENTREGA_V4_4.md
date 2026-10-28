# Archivos de la entrega V4.4

Inventario exacto respecto de la base V4.3 recibida, sin commits automaticos. 44 rutas: 20 modificadas, 23 nuevas y 1 retirada.

| Estado | Archivo | Cambio |
|---|---|---|
| Nuevo | [ARCHIVOS_ENTREGA_V4_4.md](ARCHIVOS_ENTREGA_V4_4.md) | Documentacion de la entrega. |
| Nuevo | [AUDITORIA_Y_ENTREGA_V4_4.md](AUDITORIA_Y_ENTREGA_V4_4.md) | Documentacion de la entrega. |
| Nuevo | [GUIA_MIGRACION_AZURE_V4_4.md](GUIA_MIGRACION_AZURE_V4_4.md) | Documentacion de la entrega. |
| Modificado | [package-lock.json](package-lock.json) | Version del paquete; resoluciones preservadas. |
| Modificado | [package.json](package.json) | Version y comandos de desarrollo/pruebas V4.4. |
| Modificado | [public/app.js](public/app.js) | Etiquetas y redireccion de edicion al horario completo. |
| Modificado | [public/index.html](public/index.html) | Carga y version de recursos V4.4. |
| Modificado | [public/v4.js](public/v4.js) | Acceso antiguo de bloque redirige al horario completo. |
| Modificado | [public/v41.js](public/v41.js) | Navegacion unificada y detalle de eliminacion. |
| Modificado | [public/v43.js](public/v43.js) | Retira gestion de apoderados; conserva perfil/reportes/limpieza. |
| Nuevo | [public/v44.css](public/v44.css) | Cuadricula, colores, responsive y accesibilidad. |
| Nuevo | [public/v44.js](public/v44.js) | Cuadricula editable, preview/PNG y nueva inscripcion. |
| Modificado | [README.md](README.md) | Documentacion de la entrega. |
| Nuevo | [RELACIONES_V4_4.md](RELACIONES_V4_4.md) | Documentacion de la entrega. |
| Nuevo | [RESULTADOS_PRUEBAS_V4_4.md](RESULTADOS_PRUEBAS_V4_4.md) | Documentacion de la entrega. |
| Nuevo | [scripts/build-v44-verification.js](scripts/build-v44-verification.js) | Herramienta local de preparacion, prueba o preview. |
| Nuevo | [scripts/preview-v44-local.js](scripts/preview-v44-local.js) | Herramienta local de preparacion, prueba o preview. |
| Nuevo | [scripts/test-v44-browser.js](scripts/test-v44-browser.js) | Herramienta local de preparacion, prueba o preview. |
| Nuevo | [scripts/test-v44-local.js](scripts/test-v44-local.js) | Herramienta local de preparacion, prueba o preview. |
| Modificado | [server/administration.js](server/administration.js) | Retirada conjunta de bloques sin matriculas y revision de FK. |
| Modificado | [server/api.js](server/api.js) | Bloquea escritura aislada; ficha opcional y portal. |
| Retirado | `server/guardians.js` | Retirado: gestion independiente eliminada. |
| Modificado | [server/index.js](server/index.js) | Limite JSON para semana completa y errores SQL V4.4. |
| Modificado | [server/maintenance-api.js](server/maintenance-api.js) | Retira endpoints de apoderados y anuncia V4.4. |
| Modificado | [server/model.json](server/model.json) | Nulabilidad de contacto y etiqueta de cabecera. |
| Modificado | [server/operations.js](server/operations.js) | Inscripcion en cabecera publicada y contacto opcional. |
| Modificado | [server/rules.js](server/rules.js) | Proteccion de administradores y conversion de horas. |
| Nuevo | [server/schedules.js](server/schedules.js) | Guardado de la semana, borradores, cruces, bloqueo y versionado. |
| Modificado | [server/schema-v43.js](server/schema-v43.js) | Correo y marca de prueba sin consultar la entidad retirada. |
| Nuevo | [server/schema-v44.js](server/schema-v44.js) | Deteccion de migracion completa y rechazo de esquema parcial. |
| Modificado | [server/student-lifecycle.js](server/student-lifecycle.js) | Preview firmado, detalle y limpieza de notas ficticias con auditoria. |
| Modificado | [server/v4-api.js](server/v4-api.js) | API de horario completo y contexto real publicado. |
| Nuevo | [sql/migrations/v4_4/00_DIAGNOSTICO_PREVIO.sql](sql/migrations/v4_4/00_DIAGNOSTICO_PREVIO.sql) | Etapa independiente de migracion, permisos o recuperacion. |
| Nuevo | [sql/migrations/v4_4/01_PREPARAR_NUEVA_ESTRUCTURA.sql](sql/migrations/v4_4/01_PREPARAR_NUEVA_ESTRUCTURA.sql) | Etapa independiente de migracion, permisos o recuperacion. |
| Nuevo | [sql/migrations/v4_4/02_MIGRAR_DATOS.sql](sql/migrations/v4_4/02_MIGRAR_DATOS.sql) | Etapa independiente de migracion, permisos o recuperacion. |
| Nuevo | [sql/migrations/v4_4/03_VERIFICAR_MIGRACION.sql](sql/migrations/v4_4/03_VERIFICAR_MIGRACION.sql) | Etapa independiente de migracion, permisos o recuperacion. |
| Nuevo | [sql/migrations/v4_4/04_ELIMINAR_ESTRUCTURA_ANTIGUA.sql](sql/migrations/v4_4/04_ELIMINAR_ESTRUCTURA_ANTIGUA.sql) | Etapa independiente de migracion, permisos o recuperacion. |
| Nuevo | [sql/migrations/v4_4/05_VERIFICACION_FINAL.sql](sql/migrations/v4_4/05_VERIFICACION_FINAL.sql) | Etapa independiente de migracion, permisos o recuperacion. |
| Nuevo | [sql/migrations/v4_4/06_PLAN_RECUPERACION.md](sql/migrations/v4_4/06_PLAN_RECUPERACION.md) | Etapa independiente de migracion, permisos o recuperacion. |
| Nuevo | [sql/migrations/v4_4/07_PERMISOS_OPCIONALES.sql](sql/migrations/v4_4/07_PERMISOS_OPCIONALES.sql) | Etapa independiente de migracion, permisos o recuperacion. |
| Modificado | [tests/v4-dom.test.js](tests/v4-dom.test.js) | Prueba funcional o adaptacion al flujo unificado. |
| Modificado | [tests/v41-ui.test.js](tests/v41-ui.test.js) | Prueba funcional o adaptacion al flujo unificado. |
| Nuevo | [tests/v44-scheduling.test.js](tests/v44-scheduling.test.js) | Prueba funcional o adaptacion al flujo unificado. |
| Nuevo | [tests/v44-sql.integration.js](tests/v44-sql.integration.js) | Prueba funcional o adaptacion al flujo unificado. |

Se revisaron server/db.js y server/auth.js: se conserva su conexion TLS/SQL/Entra y autorizacion; no requirieron cambios. El CSS nuevo se incorpora en public/v44.css y mantiene los estilos institucionales. No se modificaron .env, secretos ni configuracion Azure.

## Paquete de aplicacion

[fractales-deploy-v44-20261028.zip](fractales-deploy-v44-20261028.zip): **37 archivos**, exclusivamente server/, public/, package.json y package-lock.json. No contiene SQL, documentos, pruebas, scripts de preview, .env, node_modules ni el modulo guardians retirado. Los scripts SQL se entregan en el proyecto para revision y ejecucion manual por separado.

SHA-256: `3E7B14F680B935B5F31B91980F4A44F17CA6012982ABC5FB5186266DA3918B6C`.

Subir a GitHub las rutas de esta tabla y conservar el resto del proyecto versionado y sus assets. No subir .env, secretos, credenciales, cookies, claves temporales, OTP, logs, node_modules, backups/exportaciones de personas, ZIP de despliegue ni artifacts/local-preview. Los SQL historicos se conservan como referencia; para actualizar V4.3 usar exclusivamente las etapas V4.4 de la guia.

Las capturas ficticias locales y logs estan ignorados, no forman parte de esta lista. No se hizo commit, push ni despliegue.
