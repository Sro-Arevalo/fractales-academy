# Verificaciones ejecutadas — 28/10/2026

Ejecución local sobre SQL Server 17.0.1145.4, autenticación Windows en `localhost`, Node.js y Chromium headless. No se usaron conexiones ni credenciales de Azure. Se crearon bases de ensayo nuevas; no se vació ninguna base existente.

## Resultados

| Verificación | Resultado real |
|---|---|
| `npm.cmd test` | 48 pruebas unitarias y DOM aprobadas |
| `npm.cmd run check` | Sintaxis JavaScript correcta |
| Integración SQL V4.3 | 22 pruebas reportadas por Node aprobadas; instalación nueva y migración en bases distintas; diagnóstico y permisos también ejecutados |
| Regresión SQL V4 | 22 pruebas aprobadas |
| Regresión SQL V4.1 | 23 pruebas aprobadas |
| Regresión SQL V4.2 | 14 pruebas aprobadas |
| Chromium contra SQL/HTTP local | Seis grupos de comprobaciones aprobados: dashboard; navegación/catálogos; inscripción; búsqueda de apoderados; baja/confirmación; portal y horario móvil |
| `npm.cmd audit --omit=dev` | Cero vulnerabilidades reportadas en dependencias de producción al ejecutar la comprobación |
| SDK de identidad y UUID | Construcción local de DefaultAzureCredential y llamada v4/validate del UUID utilizado por MSAL; sin solicitar tokens de Azure |
| Paquete de producción | ZIP con 34 archivos de aplicación; instalación aislada mediante `npm ci --omit=dev --ignore-scripts` y carga de Express correctas, sin `.env`, sin Playwright/ODBC nativo y sin conexión a SQL |

La regresión V4 esperaba que un curso sin asignación manual fuese rechazado. Se actualizó esa expectativa para verificar el nuevo comportamiento solicitado: curso/docente activos se aceptan y crean una sola relación. La prueba de recuperación de interfaz se actualizó de DNI a correo. No se desactivaron pruebas para ocultar errores.

Los ensayos V4.3 registran en su salida los nombres de sus dos bases independientes (`FractalesAcademy_Pruebas_V4_3_20261028_...` y sufijo `_Nueva`). Se verificaron permisos con un usuario local sin login: visibilidad de metadatos y borrado de obligaciones permitidos, sin DELETE sobre notas ni auditorías. Eso no prueba los permisos del usuario efectivo de Azure.

## Casos solicitados

| Caso | Evidencia ejecutada |
|---|---|
| A: estudiante | API real crea alumno, apoderado, usuario bcrypt y matrícula; un apoderado queda vinculado a varios alumnos |
| B: matrícula | Regular: cuatro cuotas de S/250 y S/50 inicial; Acelerado: dos cuotas y S/50 inicial. Se rechazan duplicados y cupo lleno; un fallo posterior revierte todas las filas |
| C: cursos y horarios | Curso creado mediante API aparece en contexto sin asignación anterior; horario crea la relación docente/curso en la transacción |
| D: conflictos | Rechazo de cruces de grupo, aula y docente, fin anterior al inicio y bloque fuera del turno |
| E: eliminación | Requiere desactivación, motivo, DNI escrito y revisión vigente; elimina alumno/cuenta/matrículas/deudas pendientes, conserva apoderado y auditorías; cambios posteriores invalidan revisión |
| F: finanzas | Bloquea cobros realizados y anulados; la limpieza de un lote con un alumno protegido revierte íntegramente el lote |
| G: recuperación | Correo simulado, HMAC persistido, código de un uso, cambio de contraseña y rechazo de la anterior; sesiones previas revocadas. Regresión V4.1 también ejecuta vencimiento, cinco intentos y límites de reenvío/IP |
| H: seguridad | Alumno recibe 403 en funciones administrativas y datos ajenos; alterar `?dni=` no cambia el alumno de la sesión; ruta inventada responde 404 JSON |
| I: integridad | 36 tablas/41 FK en esquema nuevo e incremental, CHECK/FK confiables, DBCC CHECKCONSTRAINTS sin infracciones; no hay alumnos/usuarios/pagos huérfanos tras borrados |
| J: interfaz | Inscripción completa desde Chromium a SQL, consultas y navegación de módulos/catálogos, búsqueda, desactivación, formulario de confirmación separado, portal/horario a 390 px y ausencia de errores JavaScript |

Se ejecutaron además scripts SQL de datos ficticios y limpieza: revisión sin escritura, rechazo de alumno activo, limpieza confirmada y conservación del apoderado. Se verificaron referencias adicionales y notas históricas como bloqueos, y reversión del borrado al fallar la auditoría.

## Alcance de los módulos

Las consultas de los módulos y catálogos conservados se recorrieron en Chromium. Se ejecutó además un caso por HTTP/SQL que crea, busca y edita carreras, docentes, cursos y aulas; desactiva/reactiva docentes, cursos, aulas, grupos y horarios; edita ciclos/grupos/horarios y la ficha de un estudiante; anula/restaura ciclo, matrícula y nota; corrige puntajes y publica/retira resultados. Se eliminó un aula libre y se comprobó el rechazo de opciones nuevas en catálogos cerrados por las reglas académicas. La inscripción, apoderados, pagos, usuarios y permisos tienen casos propios. No se afirma haber ejecutado todas las combinaciones posibles de cada catálogo: las FK impiden retirar registros utilizados y las tablas de seguridad no tienen CRUD público genérico.

Se verificó también el flujo de administrador: confirmación de contraseña actual, envío simulado y validación del correo propio, recuperación pública por ese correo, invalidación de la contraseña anterior y revocación de sesión. Se rechaza marcar un correo como verificado mediante un UPDATE sin código válido.

No se probaron: conexión real Azure/Entra, permisos del principal efectivo de App Service, entrega SMTP externa, publicación en Azure, restauración de un respaldo de producción, carga masiva/rendimiento con volumen real, ni cada navegador/dispositivo físico. El ensayo móvil usa emulación de viewport de Chromium.

## Capturas y vista previa

Las capturas están en `artifacts/local-preview/v43/` (ignoradas por Git):

- `01-dashboard.png`
- `02-inscripcion-confirmacion.png`
- `03-inscripcion-movil.png`
- `04-limpieza.png`
- `05-eliminacion-revisada.png`
- `06-estudiante-movil.png`
- `07-horario-movil.png`
- `08-perfil-administrador.png`

No contienen las contraseñas temporales. La vista se abre con el procedimiento `preview:v43` de [README.md](README.md).

## Dependencias revisadas

Se fijó Azure Identity 4.13.0 y se limitó el override de UUID 11.1.1 al utilizado por MSAL Node. Se comprobó que MSAL usa `uuid.v4()` y que esa llamada funciona con la versión fijada. El lockfile conserva la resolución comprobada. La configuración evita introducir una versión de MSAL afectada por el [aviso oficial de Microsoft](https://github.com/AzureAD/microsoft-authentication-library-for-js/security/advisories/GHSA-xcx6-jx8p-x3h5); la [documentación de UUID 11](https://github.com/uuidjs/uuid/blob/v11.1.1/README.md) incluye CommonJS. Esto no sustituye la prueba de autenticación Entra en el entorno destino.
