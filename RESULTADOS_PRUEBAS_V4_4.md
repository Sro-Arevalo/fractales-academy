# Pruebas V4.4 — ejecución real local

Fecha: 28 de octubre de 2026. Node 24.20.0, Windows, SQL Server local 17.0.1145.4, ODBC Driver 18, Chromium de Playwright. Datos ficticios y correo en memoria; ninguna conexión de prueba a Azure ni envío SMTP externo.

## Resultado

| Comprobación | Resultado ejecutado |
|---|---|
| npm.cmd run check | Aprobado: sintaxis de backend, frontend y scripts |
| npm.cmd test | **51/51 aprobadas**: lógica, validación y DOM |
| npm.cmd run test:sql:v44 | **23/23 aprobadas**, incluyendo contenedor y 22 casos SQL/HTTP |
| npm.cmd run test:browser:v44 | **6 grupos aprobados** en Chromium; cero errores JavaScript |
| Instalación aislada de producción | npm ci --omit=dev --ignore-scripts: 150 paquetes instalados, 0 vulnerabilidades informadas |
| Paquete de aplicación | 37 archivos; sin .env, SQL, scripts de preview, pruebas, guardians.js ni node_modules |
| Arranque aislado | Express carga, sirve HTML/v44.js y rechaza API sin sesión; no abre SQL ni contacta Azure |
| Diagrama | 35 entidades, 41 relaciones, coherentes con el inventario SQL estándar |

El ZIP no requiere ODBC nativo ni Playwright en producción. La carga de Express sin SQL no sustituye las pruebas funcionales SQL/HTTP, que se ejecutaron aparte.

## Cobertura de las 15 pruebas solicitadas

| Prueba | Evidencia ejecutada |
|---|---|
| 1. Crear desde cuadrícula | Chromium selecciona ciclo, modalidad, turno, aula, cupo, cursos y docentes y publica |
| 2. Guardar varias clases | Tres clases desde UI en un POST; SQL valida semana, sábado y duraciones distintas; un último bloque inválido revierte la edición completa |
| 3. Horario duplicado | API rechaza unidad ciclo/turno/aula duplicada; dos publicaciones concurrentes producen un éxito y un rechazo |
| 4. Cruces docentes/aulas | Conflictos entre ciclos con fechas coincidentes, dentro de la semana, aula, docente y fuera de turno; excepción autorizada válida; dos aulas con un docente simultáneo no pueden publicarse juntas |
| 5. Apoderado opcional | Inscripción real de ensayo sin ningún dato del apoderado, tanto en HTTP como en navegador |
| 6. Mismo apoderado | Dos fichas usan un DNI de contacto ya migrado, con nombres independientes y sin error UNIQUE |
| 7. Matrícula en horario | Inscripción guarda el identificador de la cabecera publicada; borrador y falta de cupo rechazan sin crear alumno parcial |
| 8. Mensualidades | Regular 4×250 +50 inicial; Acelerado 2×250 +50 inicial; datos de Pago anteriores idénticos después de migrar |
| 9. Desactivar | Conserva cuotas/matrícula y revoca el acceso; UI ejecuta la operación con motivo |
| 10. Eliminar ficticio | DNI escrito y preview firmado; retira deudas pendientes, cuenta, matrícula y dos notas de alumno marcado ficticio; auditoría permanece; fallo inyectado de auditoría revierte todo; FK nueva bloquea |
| 11. Cobros protegidos | Cobro ficticio confirmado y luego revertido bloquea eliminación; DELETE SQL directo también se rechaza; las notas de alumno real se conservan |
| 12. Portal actualizado | Cambio de horario se ve al volver a consultar; publicación/corrección/retiro de notas se refleja; alumno no puede escribir horario; lectura desktop/móvil sin controles de edición |
| 13. Sin tabla retirada | APODERADO ausente, endpoint antiguo 404; inspección del código server no encuentra consultas a ella; todos los módulos consultan la base migrada |
| 14. Copia V4.3 | Origen V4.3 con alumnos, apoderado compartido/sin alumno, cuenta, matrícula, deuda, clase y nota; BACKUP COPY_ONLY con CHECKSUM, VERIFYONLY y RESTORE en otra base NUEVA; migración sobre esa copia, huellas, controles y preservación |
| 15. Aplicación funcional | Login/roles, dashboard, 25 módulos, horarios, inscripción, cupos, pagos/reversión, examen/resultados/publicación, contactos, correo administrador verificado, recuperación OTP, limpieza, reportes, permisos y restricciones |

Se comprobó además que un alumno real no puede convertirse después en ficticio; restaurar un horario revalida cruces; la cuenta administrativa propia está protegida; cursos/docentes sin uso y borradores con bloques sin matrícula pueden retirarse. La identidad SQL limitada obtiene el bloqueo transaccional y permisos complementarios sin DELETE de auditoría.

## Migración y protección del DROP

El último ensayo conservó estas bases locales:

- Origen V4.3: FractalesAcademy_Pruebas_V4_4_20261028_987d989c6e.
- Copia restaurada y migrada: FractalesAcademy_Pruebas_V4_4_20261028_e3826aee64.

El origen permanece en 36 tablas; la copia termina con 35 tablas/41 FK y restricciones confiables. No se reutilizaron bases existentes ni se borraron las creadas. El backup ficticio se conserva en el directorio de backups de la instancia local. No contiene personas reales ni debe publicarse.

01, 02 y 04 se ejecutaron dos veces para comprobar sus marcadores. El retiro se rechazó sin confirmación, ante cambio posterior a la huella, FK desconocida y procedimiento con referencia dinámica a APODERADO. Se verificaron los snapshots exactos de todos los apoderados, incluido el que no tiene alumnos. La migración no transformó ni borró pagos, matrículas, identificadores ni notas anteriores.

## Evidencia visual

Capturas de la última ejecución en `artifacts/local-preview/v44/` (ignoradas por Git):

- 01-panel.png.
- 02-cuadricula-escritorio.png.
- 03-horario-exportado.png: descarga PNG real comprobada.
- 04-inscripcion-opcional.png.
- 05-eliminacion-controlada.png.
- 06-cuadricula-movil.png: 390 px, desplazamiento contenido dentro de la tabla.
- 07-portal-estudiante.png.
- 08-portal-movil.png: 390 px, sin desbordamiento de página.

Se revisaron visualmente la cuadrícula, el móvil, la exportación y la confirmación. Se corrigieron superposición de controles, etiquetas accesibles que provocaban desbordamiento y una carrera de carga del botón Consultar DNI. Las capturas evitan las credenciales temporales.

## Pendiente del entorno real

No se ejecutaron estos procedimientos contra Azure: ensayo sobre copia de producción con sus extensiones/permisos reales, PITR de Azure, despliegue App Service, publicación GitHub, entrega SMTP ni pruebas en dispositivos físicos. La restauración comprobada es de SQL Server local, no PITR de Azure. Tampoco se midió carga sostenida o rendimiento a escala; sí se ejercitaron escrituras simultáneas. Aplicar la guía y comprobar estos puntos antes de reabrir producción.
