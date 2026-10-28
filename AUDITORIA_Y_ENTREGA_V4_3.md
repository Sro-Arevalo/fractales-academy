# Fractales Academy: auditoría e implementación V4.3

Fecha de la revisión: 28/10/2026. Alcance: repositorio existente, ejecución local y scripts revisables. No se autoriza ni ejecuta ningún cambio sobre Azure.

## Comparación previa a la implementación

El modelo original tiene 25 tablas y 27 FK. Las migraciones ya presentes elevan el esquema a 35 tablas y 40 FK: cuatro tablas V4 y seis V4.1. El archivo `server/model.json` describe solamente el modelo original; no es un inventario de toda la base instalada. No se ha consultado una base de Azure.

| Tabla actual | Problema detectado | Decisión | Justificación |
|---|---|---|---|
| ALUMNO | El apoderado está duplicado en cada estudiante; falta identificación explícita de pruebas | Mantener; relacionar con APODERADO y añadir Es_Prueba | DNI varchar(8) y datos existentes se conservan; la marca no se infiere del nombre |
| Aula | Capacidad y aula son utilizadas por Grupo y los cruces | Mantener | Permite incorporar más aulas sin cambios de estructura |
| CARRERA | Catálogo requerido por ALUMNO aunque no se vea en el menú principal | Mantener | Evita romper FK; incluye opción sin elección de carrera |
| CONCEPTO_PAGO | Distingue cuotas y cargo inicial | Mantener | No equivale a medio ni estado de pago |
| CURSOS | El horario consulta solo cursos previamente asignados a docentes | Mantener; corregir selección | Un curso y su asignación docente son entidades distintas |
| Ciclo | Define programa, modalidad, duración y tarifa | Mantener | No duplicar modalidad o ciclo en matrícula |
| Docente | Es referenciado por asignaciones y horarios | Mantener | Preservar historial y validar celular |
| Docente_Asignatura | Su PK compuesta es la FK de Horario | Mantener | Representa qué docente dicta qué curso; no es un catálogo duplicado |
| ESTADO_CICLO | Catálogo referenciado | Mantener | No sustituir FK por texto libre |
| ESTADO_EXAMEN_GRUPO | Catálogo referenciado | Mantener | Conserva las reglas de publicación |
| ESTADO_MATRICULA | Catálogo referenciado | Mantener | Diferencia anulación, retiro y finalización |
| ESTADO_PAGO | Catálogo referenciado | Mantener | Separa obligación pendiente de cobro confirmado |
| Examen | Plantilla de simulacro general | Mantener | Es compartida por varios grupos |
| Examen_Grupo | Programación y publicación por grupo; Estado legado duplica el catálogo | Mantener; conservar compatibilidad | Eliminar la columna duplicada requiere otra migración y verificar consumidores externos |
| Grupo | Asocia ciclo, aula, turno y cupo | Mantener | Es el centro de matrículas y horarios |
| Horario | Curso nuevo no visible sin asignación previa | Mantener; corregir API/formulario | Seleccionar curso real y docente real, crear asignación en la misma transacción |
| MATRICULA | Se crean cuotas y cuenta en transacción; eliminación genérica bloquea correcciones seguras | Mantener; eliminación controlada | Conservar unicidad y cupos; borrar solo dependencias permitidas |
| Nota_Examen | Es historial académico incluso anulada | Mantener | Bloquea eliminación automática del estudiante |
| PARENTESCO | El vínculo es con cada alumno, no un atributo fijo del apoderado | Mantener | Un apoderado puede tener distintos parentescos con varios estudiantes |
| Pago | Representa deuda y cobro; un cobro anulado también tiene historia real | Mantener | No crear una tabla de deudas duplicada; proteger pagos y auditoría de cobros |
| Programa | Reforzamiento y preuniversitario están en SQL | Mantener | No usar listas estáticas en JavaScript |
| ROL | ADMIN/ALUMNO controla permisos | Mantener | Catálogo necesario de seguridad |
| TIPO_BLOQUE | CLASE/RECREO define reglas distintas | Mantener | El recreo no requiere docente |
| Turno | Restringe mañana 07–13 y tarde 15–21 | Mantener | No duplicar horas fijas en formularios |
| Usuario | Hash y enlace al alumno; no tiene correo propio para administradores | Mantener; añadir correo de recuperación y estado verificado | Recuperación autónoma del administrador sin otra tabla; conservar hashes y sesiones |
| MEDIO_PAGO | Catálogo V4 configurable y referenciado | Mantener | Evita listas rígidas y conserva medios utilizados |
| Auditoria_V4 | Inmutable y referenciada al actor | Mantener | Nunca borrar auditorías para facilitar una eliminación |
| Control_Migracion_V4 | Control técnico de versiones | Mantener | Necesario para migraciones incrementales |
| Linea_Base_V4 | Huellas de datos antes de V4; no es respaldo | Mantener | Evidencia útil de conservación; archivar fuera de producción solo mediante procedimiento posterior |
| Usuario_Seguridad_V41 | Versión de sesión y activación | Mantener | Permite invalidar sesiones después de cambiar contraseña |
| Cuenta_Codigo_V41 | OTP, caducidad e intentos | Mantener | Solo guarda HMAC; también lo referencia Solicitud_Contacto_V41 |
| Contacto_Verificado_V41 | Prueba de control del correo/celular | Mantener | No asumir que un correo ingresado por un tercero está verificado |
| Solicitud_Contacto_V41 | Solicitudes y aprobación administrativa | Mantener | Evita cambiar contactos sin comprobación |
| Alumno_Estado_V41 | Desactivación sin alterar historial | Mantener | Fusionarla ahora con ALUMNO exigiría migrar FK, permisos y auditorías |
| Nota_Estado_V41 | Anulación sin borrar notas | Mantener | Historial protegido |

**No hay tablas eliminadas ni fusionadas automáticamente.** Reducir el número eliminando catálogos o seguridad rompería reglas ya implementadas. La única tabla nueva prevista, `APODERADO`, es necesaria para el vínculo solicitado de un apoderado con varios alumnos. Se conservan temporalmente las columnas de apoderado de ALUMNO por compatibilidad y para no perder información histórica. No se crean tablas de deuda, modalidad, limpieza ni nuevas auditorías. Resultado previsto: 36 tablas, 41 FK.

## Problemas comprobados en el código antes de modificarlo

- La inscripción existente es atómica, pero el formulario tiene una sola pantalla y carece de selector de apoderado compartido y disponibilidad de cupos.
- `academic/context` filtra cursos mediante Docente_Asignatura; un curso recién creado no figura hasta crear esa relación manualmente.
- La eliminación genérica bloquea cualquier matrícula, obligación o estado lateral, aunque el alumno esté desactivado y no haya cobros ni notas.
- La recuperación pública exige DNI, aunque se solicita entrada por correo. El proveedor desactivado carece de bandeja local utilizable por el desarrollador.
- No existe limpieza administrativa que use una marca de prueba asignada al crear el registro.
- Una URL Origin malformada puede producir un error de servidor; la API no tiene una respuesta JSON explícita para rutas desconocidas.
- La conexión centralizada no tiene listener de errores del pool.

## Criterios de migración y recuperación

Antes de aplicar scripts en Azure: exportar BACPAC a almacenamiento privado o comprobar restauración a un punto en el tiempo; ensayar la restauración en otra base; guardar inventario y conteos; detener escrituras durante la migración; usar una identidad distinta y limitada para la aplicación. Verificar servidor y nombre de base en cada script. Ninguna migración se ejecuta al arrancar Express.

Los datos antiguos no se marcan como prueba, no se inventan DNI de apoderados y no se modifica el importe de deudas históricas. Las discrepancias entre apoderados con el mismo DNI deben resolverse antes de migrar. Los borrados administrativos son irreversibles desde la aplicación; la recuperación requiere restaurar una copia en otra base y reconciliar los datos.

## Entrega implementada

- Inscripción en cinco pasos con consulta del DNI, selección/alta de apoderado compartido, enseñanza/modalidad/ciclo, turno, cupos y confirmación económica.
- Apoderados con búsqueda, creación, edición compartida y eliminación de registros sin alumnos ni historia protegida.
- Cursos y docentes activos aparecen directamente en horarios; la asignación se crea en la misma transacción y se revierte si el horario falla.
- Revisión y eliminación controlada de alumnos desactivados con deudas pendientes, confirmación escrita, motivo, revisión firmada y comprobación de relaciones reales. Se conservan pagos reales, notas, auditorías y apoderados compartidos.
- Limpieza por marca explícita de prueba, selección de lote y transacción única; la marca no puede cambiarse después del alta.
- Recuperación por correo verificado con códigos HMAC, bcrypt, caducidad, intentos, límites, revocación y bandeja simulada solo local. El primer acceso continúa exigiendo cambio de contraseña.
- Los administradores verifican su propio correo con contraseña actual y código temporal; después recuperan acceso desde la pantalla pública. Se agregan `Correo_Recuperacion varchar(150) NULL` y `Correo_Verificado bit NOT NULL DEFAULT 0` a Usuario, sin modificar tipos anteriores ni marcar contactos preexistentes como verificados.
- Reporte de matrículas/mensualidades por grupo, respuestas JSON para API inexistente, errores de origen/JSON/permisos comprensibles y control de errores del pool.
- Scripts separados de diagnóstico, migración, instalación completa, permisos, datos ficticios, limpieza, recuperación y verificación.

No se eliminaron funcionalidades académicas útiles ni se reemplazó la aplicación. No se publicaron cambios ni se ejecutaron scripts contra Azure. Los detalles operativos están en [README.md](README.md), la evidencia en [RESULTADOS_PRUEBAS_V4_3.md](RESULTADOS_PRUEBAS_V4_3.md), el diagrama en [RELACIONES_V4_3.md](RELACIONES_V4_3.md) y los archivos exactos en [ARCHIVOS_ENTREGA_V4_3.md](ARCHIVOS_ENTREGA_V4_3.md).
