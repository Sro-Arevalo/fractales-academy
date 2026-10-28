# Fractales Academy V4.4 — auditoría y entrega

Implementación sobre el proyecto existente: Express, HTML/CSS/JavaScript y SQL Server/Azure SQL. No se conectó a Azure ni se publicó en GitHub. La base V4.3 estándar pasa de **36 a 35 tablas**; conserva **41 FK**: se retira la FK de apoderado y se incorpora el autorizador de excepciones horarias. No se añade ninguna tabla.

## Decisión sobre Grupo

`Grupo` ya es la cabecera normalizada que necesita el horario: identifica un conjunto de estudiantes, ciclo, turno, aula, nombre y cupo. Tiene tres relaciones entrantes directas: `Horario`, `MATRICULA` y `Examen_Grupo`. Las notas dependen además de matrícula/simulacro mediante FK compuestas que garantizan pertenecer al mismo conjunto. El cupo se calcula con matrículas activas; el aula fija su límite superior.

Trasladar sus atributos a una tabla nueva de horario principal reproduciría exactamente esa entidad. Por la excepción expresamente prevista en la solicitud, se conserva **Grupo como cabecera técnica** y **Horario como detalle**. El administrador ve una sola pantalla de Horarios académicos; se retiró Grupos del menú y se bloquearon los formularios/API de escritura individual de cabeceras y bloques. Las matrículas seleccionan directamente el identificador de esta cabecera. Los identificadores históricos y todas las FK permanecen.

Se añaden `Estado_Horario` (BORRADOR/PUBLICADO) y `Version_Horario`. Modalidad, fechas y programa se consultan desde Ciclo, sin duplicarlos. La unidad académica utilizada para prevenir duplicados activos es **ciclo + turno + aula**. Dos aulas permiten dos conjuntos del mismo ciclo/turno; otro ciclo o modalidad permite otra unidad, sujeta a cruces por fechas. Un índice único filtrado impide dos cabeceras activas publicadas por unidad; los borradores no reservan recursos. Se conserva además la unicidad original ciclo/nombre. Para mantener dos conjuntos que compartan aula, turno y ciclo en días separados habría que ampliar esta definición de unidad: V4.4 aplica deliberadamente un conjunto publicado por aula/turno/ciclo.

Un borrador puede existir sin clases. Las cabeceras heredadas con matrículas o bloques activos se consideran publicadas; una matrícula histórica sin clases no desaparece. Las nuevas publicaciones de la interfaz exigen al menos una clase. Los borradores heredados sin programación no aceptan nuevas inscripciones hasta publicar.

## Auditoría de las 36 tablas V4.3

| Tabla | Decisión | Motivo | Dependencias principales |
|---|---|---|---|
| ALUMNO | Modificar | Contacto de apoderado opcional dentro de la ficha; nombre y parentesco admiten NULL; Es_Prueba sigue inmutable | Carrera, Parentesco; matrículas, pagos, usuario y contactos |
| APODERADO | Eliminar en 04 | Ya no existe gestión compartida; duplicaba los campos de ALUMNO | Única FK estándar entrante desde ALUMNO; triggers de sincronización retirados |
| Aula | Mantener | Recursos físicos ampliables y capacidad máxima | Cabeceras Grupo |
| CARRERA | Mantener | Interés académico real del estudiante | ALUMNO |
| CONCEPTO_PAGO | Mantener | Distingue mensualidad de inscripción/materiales | Pago |
| CURSOS | Mantener | Cursos reales, reutilizables toda la semana | Docente_Asignatura |
| Ciclo | Mantener | Edición, programa, modalidad, fechas y tarifa histórica | Programa, estado; Grupo |
| Docente | Mantener | Identidad y disponibilidad del profesor | Docente_Asignatura |
| Docente_Asignatura | Mantener | Relación muchos-a-muchos curso/docente, creada automáticamente al guardar una clase | CURSOS, Docente; Horario |
| ESTADO_CICLO | Mantener | Integridad de estados y descripciones editables | Ciclo |
| ESTADO_EXAMEN_GRUPO | Mantener | Estado del simulacro por conjunto | Examen_Grupo |
| ESTADO_MATRICULA | Mantener | Matrícula activa/anulada e historial | MATRICULA |
| ESTADO_PAGO | Mantener | Estado económico protegido por FK | Pago |
| Examen | Mantener | Definición del simulacro y puntaje máximo | Examen_Grupo |
| Examen_Grupo | Mantener | Programación/publicación por conjunto, sin duplicar el examen | Examen, Grupo, estado; Nota_Examen |
| Grupo | Modificar | Reutilizada como cabecera del horario; añade borrador/publicado y versión | Aula, Ciclo, Turno; matrícula, bloques, simulacros |
| Horario | Modificar | Detalle de clases y recreos; añade autorización excepcional fuera de turno | Grupo, tipo, asignatura; Usuario autorizador opcional |
| MATRICULA | Mantener | Relación alumno/conjunto con identidad histórica estable | ALUMNO, Grupo, estado; Pago y Nota_Examen |
| Nota_Examen | Mantener | Resultados reales se conservan; notas de alumnos explícitamente ficticios pueden retirarse en limpieza | FK compuestas a matrícula y simulacro; Nota_Estado_V41 |
| PARENTESCO | Mantener | Vocabulario de una relación opcional con el alumno; no es un registro de apoderado | ALUMNO, FK nullable |
| Pago | Mantener | Obligación y cobro con importes congelados; no se recalculan deudas antiguas | Alumno, matrícula compuesta, concepto, estado, medio y cajero |
| Programa | Mantener | PREUNIV/REFUERZO y selección académica | Ciclo |
| ROL | Mantener | ADMIN/ALUMNO y permisos de acceso | Usuario |
| TIPO_BLOQUE | Mantener | CLASE/RECREO con reglas distintas | Horario |
| Turno | Mantener | Ventanas mañana/tarde, sin columnas duplicadas por cabecera | Grupo |
| Usuario | Mantener | Autenticación, bcrypt, correo administrador verificado y vinculación al alumno | Rol, alumno; seguridad, auditoría y autorizaciones |
| MEDIO_PAGO | Mantener | Medios de cobro configurables | Pago |
| Auditoria_V4 | Mantener | Evidencia inmutable y respaldo completo de apoderados antes del DROP | Usuario actor; referencias lógicas preservadas |
| Control_Migracion_V4 | Mantener | Versiones V4/V4.1/V4.3/V4.4 registradas | Sin FK |
| Linea_Base_V4 | Mantener | Huellas previas de filas para verificar preservación antes del DROP | Sin FK |
| Usuario_Seguridad_V41 | Mantener | Revocación y activación de sesiones | Usuario |
| Cuenta_Codigo_V41 | Mantener | OTP de un uso, vencimiento, HMAC e intentos | Usuario; solicitudes de contacto |
| Contacto_Verificado_V41 | Mantener | Recuperación con contactos verificados | Alumno y usuario verificador |
| Solicitud_Contacto_V41 | Mantener | Cambio de contacto con verificación y revisión | Alumno, código, administrador |
| Alumno_Estado_V41 | Mantener | Desactivación reversible sin perder matrícula/deuda | Alumno y administrador |
| Nota_Estado_V41 | Mantener | Anulación reversible de notas reales, sin borrarlas | Nota y administrador |

No se fusionan tablas de seguridad ni catálogos usados por FK. `Docente_Asignatura` y `Examen_Grupo` representan relaciones distintas, no formularios que deban exponerse para crear un horario. Las columnas de estado heredadas de simulacros se mantienen por compatibilidad con sus triggers y consultas; retirarlas exige una revisión independiente sin beneficio para este flujo.

## Apoderado dentro del alumno

Nombre, DNI, celular y parentesco son opcionales e independientes en cada ficha. Se conserva también el correo antiguo para no perder información. No existe unicidad del DNI de contacto. Cambiar la ficha de un hermano no altera a los demás. No quedan endpoints ni selector ni módulo de apoderados; se eliminó `server/guardians.js`.

El paso 02 completa los campos desde la entidad compartida, rechaza contactos incompatibles y archiva **cada fila completa de APODERADO**, incluyendo contactos sin alumnos, en `Auditoria_V4`: Entidad APODERADO, Acción MIGRAR_V44, Anterior JSON. El administrador responsable debe indicarse explícitamente. Estos registros históricos quedan disponibles mediante auditoría, sin recrear un módulo operativo. El paso 04 verifica que el snapshot coincide exactamente con la fila que retira. No se borra ninguna ficha de alumno.

## Horario completo y concurrencia

La cuadrícula permite editar intervalos, seleccionar cursos/docentes reales en cada celda, dejar huecos y registrar recreos. Incluye sábado y domingo, repetición de cursos, vista previa, colores por curso, duplicación como borrador para otro ciclo y exportación PNG. El estudiante tiene vista de solo lectura con tarjetas para móvil. Hasta 200 bloques por operación; el cuerpo JSON admite 256 KB.

`server/schedules.js` guarda cabecera, asignaturas faltantes, todos los bloques y auditoría dentro de SERIALIZABLE. Usa un bloqueo de aplicación SQL común, retenido hasta commit/rollback, además de bloqueos de filas y del índice único. Una versión esperada evita sobreescribir cambios de otro administrador. Los cruces consideran intervalos semiabiertos (fin de una clase puede coincidir con inicio de otra), día y superposición de fechas de ciclos. Se valida aula, docente, solapamiento interno, capacidad del aula y matrículas activas. Las excepciones de turno registran motivo y usuario administrador obtenido de sesión. La restauración de una cabecera vuelve a validar los cruces.

El funcionamiento del bloqueo transaccional se contrastó con [Microsoft: sp_getapplock](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-getapplock-transact-sql). No requiere un servicio ni una tabla adicional.

## Eliminación y conservación

Desactivar conserva matrícula, cuotas, notas y contactos, bloquea el acceso y revoca sesiones; Reactivar devuelve el estado de acceso anterior. Eliminar definitivamente exige alumno y cuentas inactivos, vista previa firmada durante diez minutos, DNI escrito, motivo y nueva revisión completa bajo transacción. Se muestran identidad, cuentas, matrículas, cuotas, notas y dependencias. Un cambio posterior a la revisión exige volver a revisarla.

Se permite retirar resultados académicos únicamente de alumnos con `Es_Prueba=1`, establecido al crear la ficha y protegido por trigger. No se infiere por nombre ni por una nota anulada; alumnos V4.3 sin esa marca continúan siendo reales. Los resultados de personas reales bloquean la eliminación. Los pagos cobrados, sus datos de confirmación y el historial de cobros aun revertidos siempre bloquean. Se ofrece Desactivar; no se automatiza una anonimización que pueda eliminar evidencia de conservación.

La limpieza elimina en orden explícito estados de notas, notas ficticias, contactos/códigos/sesiones, estado del alumno, obligaciones pendientes, matrículas, cuenta y alumno. Nunca elimina auditorías, catálogos ni el simulacro compartido. La marca de prueba no autoriza borrar cobros. Triggers SQL adicionales bloquean DELETE de notas reales y cobros realizados. Una falla de auditoría revierte también las eliminaciones anteriores.

Cursos sin uso, docentes sin asignaciones y horarios sin matrícula/simulacro ni otras relaciones protegidas pueden retirarse con motivo y confirmación. El horario retira conjuntamente sus bloques; se inspeccionan también las FK de cada bloque. Se conserva su auditoría de creación/edición en vez de impedir corregir un catálogo nunca utilizado solo porque fue editado. Las FK desconocidas bloquean. Cuenta propia y última cuenta administradora activa están protegidas.

## Alcance y límites comprobados

Se revisaron `server/db.js` y `server/auth.js`: la conexión TLS/SQL/Entra y la autorización por sesión continúan válidas; no requieren modificaciones. No se cambió el framework ni se introdujeron servicios nuevos.

El ensayo usa SQL Server local 17 y Chromium, con datos representativos **ficticios**, no una descarga de personas de producción. Incluye fallos inyectados, concurrencia real y migración por etapas. La compatibilidad sintáctica utiliza características disponibles en Azure SQL, pero todavía corresponde al responsable ensayar los scripts sobre una copia aislada de su Azure V4.3, con su identidad limitada, permisos y extensiones reales. No se probaron correo SMTP externo, despliegue Azure ni restauración PITR de producción. Ver [resultados](RESULTADOS_PRUEBAS_V4_4.md) y [guía de actualización](GUIA_MIGRACION_AZURE_V4_4.md).
