# Fractales Academy — versión 4.0

Informe local de revisión: **24 de octubre de 2026, America/Lima**. Rama real creada: `feature/fractales-v4`. Se conserva el archivo vacío preexistente `feature/fractales-v4`. No se hizo commit, push, merge, despliegue ni modificación de Azure. `server/db.js`, `.env.example`, credenciales, secretos y GitHub Actions permanecen sin cambios.

## Funcionalidades implementadas

- **Inscripción integral:** consulta de DNI, datos reales de alumno/apoderado, parentesco, carrera, programa, modalidad, ciclo, turno y grupo. Una transacción SERIALIZABLE crea alumno, usuario, matrícula, cuotas y cargo inicial. Si falla cualquier paso, se revierte el conjunto. Una reinscripción conserva datos y cuenta y no repite el cobro inicial.
- **Acceso del alumno:** las cuentas nuevas usan DNI, contraseña aleatoria de 24 caracteres, bcrypt con costo 12 y cambio obligatorio al primer ingreso. La clave se muestra al administrador una sola vez y no se guarda en texto plano, archivos ni auditorías. Las cuentas anteriores mantienen su usuario y hash. El cambio de clave debe usar un valor diferente y respetar el límite de bytes de bcrypt.
- **Obligaciones:** Acelerado genera dos mensualidades y Regular cuatro, usando `Ciclo.Precio_Mensual`; con el precio inicial de S/ 250 son S/ 500 y S/ 1,000. Se conserva el importe al crear cada cuota. La primera cuota vence al inicio del ciclo y las siguientes mediante `DATEADD(month,...)`, respetando fin de mes. La inscripción de S/ 50 se genera solo para un alumno nuevo. No se generan materiales adicionales.
- **Cobros:** búsqueda por DNI, cuotas pendientes/pagadas, filtro y totales; confirmación con medio configurado, administrador de la sesión y hora UTC. Dos confirmaciones simultáneas no duplican el pago. Se puede anular una confirmación con motivo y volver a registrarla; cada estado anterior permanece en auditoría. Cambiar el precio del ciclo no modifica deudas anteriores.
- **Simulacros generales:** código/nombre/máximo/fecha/hora, varios grupos participantes y consulta de estudiante por DNI antes de registrar su único puntaje total. Valida grupo, duplicados y rango. Las correcciones necesitan motivo; quedan el resultado anterior y el nuevo. Publicación/retiro de resultados por el administrador. No se exige curso ni asignatura.
- **Cursos, docentes y horario:** conserva los catálogos y `Docente_Asignatura`; editor de bloques con ciclo, grupo, turno/aula del grupo, curso, docente asignado, día y horas. Mañana 07:00–13:00, tarde 15:00–21:00. Valida cruces de grupo, aula y docente considerando las fechas de los ciclos. Permite recreos sin docente/curso. La intranet presenta tabla semanal y tarjetas para celulares.
- **Intranet:** historial de matrículas con ciclo, fechas y turno; resultados propios publicados; horarios de matrículas activas; cuotas, importes, vencimientos, cobros y totales pagado/pendiente. Los instantes de pago se muestran en hora de Perú. El DNI de consulta estudiantil procede exclusivamente de la sesión.
- **Validaciones:** celulares de nueve dígitos en formulario, API, modelo y SQL; códigos administrativos obligatorios con formato/longitud y control de duplicados. Los códigos operativos usan una secuencia SQL. Solamente ADMIN y ALUMNO tienen acceso; no hay cuenta ni rol DOCENTE. La API rechaza eliminaciones de registros para conservar el historial.

Se reutilizaron las 25 tablas y 27 relaciones originales. No se agregó otra tabla de deudas, una tabla de cursos para simulacros ni columnas redundantes de ciclo en alumno/matrícula. `Grupo` mantiene las relaciones a ciclo, turno y aula; la matrícula mantiene su grupo histórico.

## Archivos modificados y agregados

| Ruta | Cambio |
|---|---|
| `server/api.js` | Integra rutas V4; restringe escrituras de pagos y altas separadas de alumno/matrícula; códigos operativos; auditoría de notas; consultas de intranet; protección del historial. |
| `server/rules.js` | Validaciones entre tablas, roles, asignación curso/docente, cupos y asociaciones históricas. |
| `server/model.json` | Las tres columnas reales de celular pasan de longitud 15 a 9. Se conservan las 25 entidades y 27 relaciones del modelo administrativo. |
| `server/index.js` | Mensajes de restricciones V4 y conflictos; registro de errores sin volcar parámetros personales ni claves. |
| `server/validation.js` (nuevo) | Validación de campos, DNI, celular, códigos, correos, fechas reales, horas y precisión numérica. |
| `server/operations.js` (nuevo) | Transacciones de inscripción, cobros y simulacros; secuencia y auditoría. |
| `server/v4-api.js` (nuevo) | Endpoints administrativos de inscripción, pagos, medios, auditoría y simulacros. |
| `public/app.js` | Navegación V4, validaciones de formularios, campos históricos protegidos, intranet y tratamiento del primer cambio de contraseña. |
| `public/v4.js` (nuevo) | Flujos integrales de inscripción, pagos, simulacros, bloques horarios y tabla semanal. |
| `public/index.html`, `public/styles.css` | Carga de V4, versión de recursos y estilos de formularios/horario adaptable. Conservan identidad e imágenes existentes. |
| `package.json`, `package-lock.json` | Versión 4.0.0, comandos de comprobación, generación SQL, integración y vista local; `jsdom` como dependencia de desarrollo. Se conservaron las versiones bloqueadas de las dependencias de producción. |
| `scripts/build-v4-sql.js`, `scripts/build-v4-rules-sql.js` (nuevos) | Generadores reproducibles de SQL completo a partir del modelo existente. No abren conexiones. |
| `scripts/preview-v4-local.js` (nuevo) | Vista funcional con SQL Server exclusivamente local y base de pruebas; no utiliza las conexiones de Azure. |
| `sql/migrations/v4/` (nuevo) | Diagnóstico, preparación/línea base, seis actualizaciones, inspección de recuperación y verificación final. |
| `sql/testing/CREAR_ESTRUCTURA_PRUEBAS.sql`, `sql/testing/DATOS_PRUEBA_V4.sql` (nuevos) | Esquema original controlado y datos ficticios; guardas para una base de pruebas previamente creada. |
| `tests/v4-validation.test.js`, `tests/v4-dom.test.js` (nuevos) | Validaciones y comportamiento de formularios, pagos, consulta de puntajes y horarios. |
| `tests/v4-sql.integration.js` (nuevo) | Migraciones y API con SQL Server local real; ejecución explícita mediante `npm run test:sql`. |
| Los tres documentos V4 (nuevos) | Este informe, guía de Azure y tabla detallada de cambios de base de datos. |
| `MAPA_DE_ARCHIVOS.md`, `GUIA_AZURE_PASO_A_PASO.md` | Avisos y enlaces para distinguir la referencia V3 de la actualización V4. |

Los SQL anteriores y las 18 pruebas anteriores se conservaron. `VISTA_PREVIA_OFFLINE.html` permanece como demostración ficticia anterior; la vista funcional V4 se inicia con `npm run preview:v4` siguiendo la guía.

## Tablas, columnas y relaciones SQL

En las tablas originales solo cambian los tipos de `ALUMNO.Cel_Alu`, `ALUMNO.Cel_Apoderado` y `Docente.Cel_Doc`, de `varchar(15)` a `varchar(9)` conservando nulabilidad. No se cambian DNI, PK ni las 27 FK originales.

Se añaden `MEDIO_PAGO` y `Auditoria_V4`, con FK `Pago.Medio_Pago → MEDIO_PAGO.Cod_Medio` y `Auditoria_V4.Usuario_Cod_Usuario → Usuario.Cod_Usuario`. Se añaden también `Control_Migracion_V4`, `Linea_Base_V4` y la secuencia `Seq_Operacion_V4` como infraestructura de migración/verificación y códigos. El resultado local contiene 29 tablas y 29 FK. Los índices y triggers se detallan en [RESUMEN_CAMBIOS_BASE_DATOS.md](RESUMEN_CAMBIOS_BASE_DATOS.md), con estructura anterior/nueva, motivo, dependencias, riesgos e intervención manual.

No se rellenan automáticamente cuotas antiguas que falten, no se transforman números de personas y no se fusionan cargos históricos de materiales/inscripción. El diagnóstico los identifica y deben conciliarse por separado cuando corresponda. Las auditorías V4 comienzan con la actualización; no inventan operaciones pasadas.

## Scripts y orden

Dentro de `sql/migrations/v4/`:

1. `00_DIAGNOSTICO_PREVIO.sql` — solo lectura.
2. `00A_PREPARACION_Y_LINEA_BASE.sql` — modifica estructura y captura evidencia técnica.
3. `01_ACTUALIZACION_CELULARES.sql` — estructura/restricciones.
4. `02_ACTUALIZACION_MATRICULAS.sql` — índices/triggers.
5. `03_ACTUALIZACION_PAGOS.sql` — estructura, FK, índices/triggers y tres medios iniciales.
6. `04_ACTUALIZACION_SIMULACROS.sql` — validaciones/triggers.
7. `05_ACTUALIZACION_HORARIOS.sql` — índices/triggers.
8. `06_ACTUALIZACION_USUARIOS.sql` — validaciones/índice único.
9. `99_VERIFICACION_FINAL.sql` — solo lectura de datos persistentes y comparación de huellas.

`98_INSPECCION_RECUPERACION.sql` es opcional y de solo lectura. Los scripts de escritura usan comprobaciones, transacciones, `TRY/CATCH`, `THROW` y control de ejecución. `00A` captura las huellas de los registros originales una sola vez; **no equivale a un respaldo**. La verificación debe hacerse inmediatamente después de migrar y antes de permitir nuevas escrituras.

## Pruebas ejecutadas y límites

Entorno: Node.js 24.20.0, SQL Server local 17.0.1145.4, ODBC Driver 18 y autenticación integrada Windows. Se usaron bases independientes con prefijo `FractalesAcademy_Pruebas_V4_20261024`, sin abrir conexiones de Azure.

Se conservan cuatro bases locales de ensayos sucesivos: `FractalesAcademy_Pruebas_V4_20261024`, `FractalesAcademy_Pruebas_V4_20261024_E2E`, `FractalesAcademy_Pruebas_V4_20261024_Final` y `FractalesAcademy_Pruebas_V4_20261024_Revision`. No se eliminaron ni se reutilizaron datos reales para limpiarlas. La última contiene el ensayo final de integración.

| Comprobación | Resultado |
|---|---|
| `npm ci --ignore-scripts` | Instalación desde el lockfile completada. |
| `npm run sql:build` | Archivos SQL completos generados, sin conexión a bases. |
| `npm run check` | Sintaxis correcta del servidor y frontend. |
| `npm test` | **27 pruebas aprobadas**, incluidas las 18 anteriores; sin fallos ni omitidas. |
| `npm run test:sql`, con base local vacía explícita | **22 comprobaciones aprobadas** según Node Test (21 casos y su contenedor); sin fallos ni omitidas. |
| Reejecución SQL | Las siete migraciones se aplicaron dos veces; no se duplicaron objetos y no hubo filas originales faltantes/modificadas. |
| Guarda de base incorrecta | Rechazada antes de crear objetos técnicos. |
| Celular antiguo de diez caracteres | Migración rechazada, valor intacto y columna conservada en 15 caracteres; luego se repuso el dato ficticio original. |
| Fallo durante segunda cuota | Se revirtieron alumno, usuario, matrícula y primera cuota. |
| Inscripciones simultáneas del mismo DNI | Un único alumno, usuario, matrícula y conjunto de cuotas. |
| Pagos simultáneos | Una sola confirmación y una auditoría; la otra solicitud fue rechazada. |
| Frontend | Interacciones DOM probadas con JSDOM y respuestas simuladas; lectura de datos y escrituras de la API probadas con HTTP/SQL reales. |

Cobertura de los 22 requisitos de prueba de la solicitud:

| Requisito | Evidencia |
|---|---|
| 1–3. Alumno, cuenta y matrícula | Integración HTTP/SQL de inscripción nueva y consulta de hash/relaciones. |
| 4–6. Dos/cuatro cuotas e inscripción S/ 50 | Consulta de filas, importes, cantidades y vencimiento de fin de mes. |
| 7–8. Reinscripción y DNI duplicado | Historial conservado, cuenta única, cargo inicial único, solicitudes repetidas y simultáneas. |
| 9. Reversión | Fallo provocado después de la primera mensualidad y comprobación de cero registros parciales. |
| 10–11. Celulares y códigos | Tests de campos, formulario, API, CHECK SQL y duplicados. |
| 12–13. Pagos y duplicados | Confirmación concurrente, fecha, administrador, anulación, nuevo medio y auditoría. |
| 14–16. Simulacros, puntaje y consulta | Grupos, máximo, nota única, corrección con motivo y visibilidad tras publicación. |
| 17. Cursos y docentes | Altas mediante API y asociación docente/curso; no se crean usuarios docentes. |
| 18–19. Horarios y visualización | Cruces por las tres causas, mañana/tarde, recreos, consulta estudiantil y contenido de tabla/tarjetas. |
| 20. Datos de otros alumnos | Rutas administrativas devuelven 403 al alumno; parámetros DNI ajenos no alteran su intranet. |
| 21. Registros antiguos | Huellas antes/después, matrícula histórica y reinscripción sin cobro retroactivo. |
| 22. Migraciones | Aplicación real, reejecución, guardas y verificación en base SQL local separada. |

**Pendiente de comprobar antes de publicar:** estructura/datos reales de Azure, autenticación SQL/Entra y permisos del App Service en Azure, respaldo/restauración de esa suscripción, desempeño con el volumen real, ejecución de Actions y revisión visual en navegadores de escritorio/celular. Las herramientas no tenían ningún navegador conectado; JSDOM comprueba comportamiento, no renderizado visual. No se presenta ninguna de estas verificaciones pendientes como aprobada.

`npm audit` informó dos entradas de severidad alta en las dependencias de autenticación Azure existentes (`@azure/identity` y `@azure/msal-node`, aviso [GHSA-xcx6-jx8p-x3h5](https://github.com/advisories/GHSA-xcx6-jx8p-x3h5)). Las versiones de producción del lockfile se conservaron; no se sustituyó el mecanismo de conexión/autenticación para resolverlo mediante un cambio sin ensayo en Azure. Revisar una actualización compatible y su impacto real antes de publicar. La única dependencia nueva de la aplicación de desarrollo es JSDOM; el controlador Windows de pruebas se instaló fuera del repositorio.

## Antes de publicar y respuestas operativas

El código V4 necesita las migraciones; no debe publicarse sobre el esquema anterior. Los teléfonos más cortos y las protecciones de historia pueden rechazar escrituras del backend V3. La transición requiere mantenimiento sin escritores V3/V4 simultáneos, respaldo verificado, SQL en el orden anterior, comprobación de huellas, publicación V4 y revisión antes de reabrir.

La [GUIA_MIGRACION_AZURE_V4.md](GUIA_MIGRACION_AZURE_V4.md) explica cómo confirmar la base, preparar pruebas, respaldar, ejecutar desde Query Editor/VS Code, resolver errores, recuperar mediante PITR a otra base y publicar mediante GitHub Desktop. La fusión/push a `main` activa el workflow existente; no se realizó ese paso. No hay un rollback general seguro que borre objetos o datos: se conserva auditoría y se concilian operaciones o se restaura un respaldo con autorización.

Los archivos están listos para revisión local. La aprobación para modificar SQL de producción, crear recursos con costo o publicar sigue correspondiendo al responsable del proyecto.
