# Resultados comprobados V4.5

Fecha: 28 de octubre de 2026. Entorno Windows, Node 24.20, SQL Server local 17, ODBC Driver 18, Chromium de Playwright sin interfaz. Solo datos ficticios. Las bases de origen y migración son nuevas, con nombres únicos; se conservan y no se reutilizan bases del usuario.

| Verificación | Resultado |
|---|---|
| Sintaxis, recursos y modelo | 69 archivos JavaScript; referencias del modelo y recursos HTML válidos. |
| `npm test` | 51/51 aprobadas; incluyen validaciones, UI, seguridad y referencias de migraciones históricas. |
| `npm run test:sql:v45` | 19/19 escenarios con SQL real y API HTTP aprobados. Ver [evidencia estructurada](../../reports/v45-local-results.json). |
| Navegador contra API y SQL | Horario multibloque, sábado, PNG, copia de borrador, inscripción sin apoderado, papelera, dependencias y eliminación definitiva. Portal de solo lectura y vistas de 390 px; cero errores JavaScript. |
| Redes sociales | Dos enlaces en login y dos en estudiante; iconos locales cargados; cuatro pestañas nuevas, href exactos y rel seguro; administrador sin enlaces; escritorio y móvil sin desbordamiento. [Evidencia](../../reports/v45-social-results.json). |
| Instalación de producción | `npm ci --omit=dev` en directorio nuevo: 150 paquetes instalados, auditoría de 151 paquetes, 0 vulnerabilidades informadas en ese momento. Dependencias runtime cargadas sin herramientas de desarrollo. |
| SQL final | 38 tablas/225 columnas/40 FK, nombres normalizados, CHECK/FK confiables, sin cascadas ni referencias de módulos sin resolver. |
| Paquete | 47 archivos de aplicación; sin `.env`, SQL, pruebas, scripts locales, datos ni `node_modules`. SHA-256 se entrega en [paquete](PAQUETE.md). |
| Documentación y workflow | 111 enlaces locales comprobados; YAML parseado, activación únicamente manual y confirmación requerida. El workflow no se ejecutó en GitHub. |

## Correspondencia con las 16 pruebas solicitadas

| N.º | Prueba solicitada | Evidencia y estado |
|---|---|---|
| 1 | Inscripción nueva | SQL 05/06: sin apoderado, cuenta, matrícula, cuotas; 547 inducido revierte todo. Navegador envía formulario hasta SQL. Aprobada local. |
| 2 | Otra modalidad | SQL 07: acelerada 2×250 + 50 = 550. Aprobada local. |
| 3 | Estudiante existente | SQL 07: nueva matrícula en otro ciclo, sin otro cargo de 50. Aprobada local. |
| 4 | Horarios | SQL 04 y navegador: publicación, docente/curso, sábado, intervalos variables, borrador y copia; rechazo de cruces. Aprobada local. |
| 5 | Pago | SQL 10: confirmar, consultar y anular confirmación con auditoría. Aprobada local. |
| 6 | Papelera | SQL 09 y navegador: ocultación del listado y revocación de sesión. Aprobada local. |
| 7 | Restauración | SQL 09: recupera ficha, matrícula y obligaciones conservadas. Aprobada local. |
| 8 | Eliminación definitiva | SQL 11/12/19 y navegador: ficha heredada y pruebas sin cobros; confirmación incorrecta bloqueada. Aprobada local. |
| 9 | Protección financiera | SQL 10: historial de cobro, incluso anulado, bloquea eliminación. Aprobada local. |
| 10 | Auditoría | SQL 11/13/14/16: tres eventos históricos conservados tras retirar cuenta; filtros, política, depuración y anonimización de pruebas vencidas; constancias inmutables y permisos SQL limitados. Aprobada local. |
| 11 | Recuperación | SQL 15: bandeja local, caducidad, cinco intentos, uso único, cambio y revocación. SMTP real pendiente. |
| 12 | Nombres | SQL 02/03/17, comprobación del modelo y 09: migración sin diferencias de datos, consultas de los 25 módulos, restricciones y metadatos. Aprobada local. |
| 13 | Roles | SQL 03/08: usuario no autenticado/estudiante rechazados en administración; portal toma DNI de sesión. Navegación y redes por rol verificadas. Aprobada local. |
| 14 | Azure SQL | Scripts preparados con sintaxis T-SQL probada en SQL Server local. **Pendiente ejecutar contra una copia real de Azure SQL Database**; sin conexión/configuración de Azure en este entorno. |
| 15 | Navegador | Playwright contra servidor/SQL locales; formulario de inscripción, respuesta 201 y persistencia; eliminación validada por API y consulta posterior. Aprobada local. |
| 16 | Regresión | 51 pruebas unitarias/DOM y SQL 18: simulacros, puntajes, publicación, reportes, usuarios y contactos; además flujos anteriores. Aprobada local en los escenarios descritos. |

## Casos adicionales y alcance

La migración se reejecutó por etapas; las huellas compararon todas las filas de las 35 tablas originales, incluyendo claves JSON anidadas de auditoría. Antes de migrar se reprodujo el bloqueo FK del actor histórico. No se eliminó ningún evento para hacer pasar esa migración.

La cuenta SQL limitada del ensayo recibió DENY UPDATE/DELETE de auditoría y constancias. Se verificó que DELETE directo falla y que el procedimiento con ejecución como propietario procesa únicamente la selección autorizada. SQL10/11 se ejecutaron con confirmación únicamente en la nueva copia local, y SQL14 se validó con otro usuario local de ensayo.

Las capturas están en `artifacts/local-preview/v45/` y los logs locales en `artifacts-v45-*.log`, excluidos de Git. Las contraseñas administrativas de ensayo se generaron aleatoriamente en memoria. No se imprimieron códigos ni contraseñas temporales. En las pruebas sociales se interceptó la navegación externa, por lo que comprobar las aperturas no equivale a verificar las cuentas en vivo.

No se ejecutó el workflow GitHub ni el despliegue. No se probó restauración Azure PITR ni entrega SMTP real. Tampoco se identificó la restricción exacta del 547 original en Azure; la captura no contiene ese dato. La aceptación de producción debe completar esas verificaciones externas.
