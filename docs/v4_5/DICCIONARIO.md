# Diccionario de datos V4.5

38 tablas; 225 columnas; 40 FK físicas. Extraído de sys sobre la copia local validada. Tipos e identificadores originales conservados. Las tablas de control añadidas usan identidades propias; el DNI de ALUMNO/DOCENTE continúa siendo VARCHAR(8).

## ALUMNO

Ficha del estudiante; DNI como clave, contacto propio, apoderado opcional y marca de prueba inmutable.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| DNI_ALUMNO | varchar(8) | No | PK  |
| NOMBRE_COMPLETO | varchar(120) | No |  |
| CORREO | varchar(150) | Sí |  |
| FECHA_NACIMIENTO | date | Sí |  |
| CELULAR | varchar(9) | Sí |  |
| DIRECCION | varchar(200) | Sí |  |
| NOMBRE_APODERADO | varchar(120) | Sí |  |
| DNI_APODERADO | varchar(8) | Sí |  |
| CELULAR_APODERADO | varchar(9) | Sí |  |
| CORREO_APODERADO | varchar(150) | Sí |  |
| ID_PARENTESCO | varchar(5) | Sí |  |
| ID_CARRERA | varchar(10) | No |  |
| ES_PRUEBA | bit | No |  |

## AUDITORIA_SISTEMA

Historial de acciones con identidad histórica del actor, cambios y protección/retención de pruebas.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID | bigint | No | PK IDENTITY |
| ENTIDAD | varchar(20) | No |  |
| ID_REGISTRO | varchar(20) | No |  |
| ACCION | varchar(30) | No |  |
| DATOS_ANTERIORES | nvarchar(max) | Sí |  |
| DATOS_NUEVOS | nvarchar(max) | Sí |  |
| ID_USUARIO_RESPONSABLE | varchar(20) | No |  |
| MOTIVO | varchar(250) | Sí |  |
| FECHA_EVENTO | datetime2 | No |  |
| NOMBRE_ACTOR | varchar(120) | Sí |  |
| ROL_ACTOR | varchar(10) | Sí |  |
| ES_PRUEBA | bit | No |  |
| PROTEGIDO | bit | No |  |
| RETENER_HASTA | datetime2 | Sí |  |
| ANONIMIZADO | bit | No |  |

## AULA

Espacio físico y capacidad disponible.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_AULA | varchar(10) | No | PK  |
| NOMBRE_AULA | varchar(60) | No |  |
| CAPACIDAD | smallint | No |  |
| ACTIVO | bit | No |  |

## BLOQUE_HORARIO

Clase o recreo semanal de un horario, con día, intervalo, curso y docente.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_BLOQUE_HORARIO | varchar(20) | No | PK  |
| DIA_SEMANA | tinyint | No |  |
| HORA_INICIO | time | No |  |
| HORA_FIN | time | No |  |
| ACTIVO | bit | No |  |
| ID_HORARIO_ACADEMICO | varchar(20) | No |  |
| ID_TIPO_BLOQUE | varchar(10) | No |  |
| ID_CURSO | varchar(10) | Sí |  |
| DNI_DOCENTE | varchar(8) | Sí |  |
| EXCEPCION_TURNO | bit | No |  |
| MOTIVO_EXCEPCION | nvarchar(250) | Sí |  |
| ID_USUARIO_AUTORIZADOR | varchar(20) | Sí |  |

## CARRERA

Carrera o interés académico del estudiante.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_CARRERA | varchar(10) | No | PK  |
| NOMBRE_CARRERA | varchar(120) | No |  |

## CICLO

Edición del programa: modalidad, fechas, mensualidades y tarifa.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_CICLO | varchar(20) | No | PK  |
| ID_PROGRAMA | varchar(20) | No |  |
| NOMBRE_CICLO | varchar(100) | No |  |
| MODALIDAD | varchar(12) | No |  |
| FECHA_INICIO | date | No |  |
| FECHA_FIN | date | No |  |
| NUMERO_MENSUALIDADES | tinyint | No |  |
| PRECIO_MENSUAL | decimal(10,2) | No |  |
| ID_ESTADO_CICLO | varchar(15) | No |  |

## CODIGO_CUENTA

Códigos de activación, recuperación o verificación; hashes, caducidad, uso e intentos.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID | uniqueidentifier | No | PK  |
| ID_USUARIO_RESPONSABLE | varchar(20) | No |  |
| PROPOSITO | varchar(20) | No |  |
| CANAL | varchar(7) | No |  |
| DESTINO | varchar(150) | Sí |  |
| NONCE | char(32) | No |  |
| CODIGO_HASH | char(64) | No |  |
| DESAFIO_HASH | char(64) | Sí |  |
| FECHA_VENCIMIENTO | datetime2 | No |  |
| INTENTOS | tinyint | No |  |
| CONSUMIDO | bit | No |  |
| FECHA_CREACION | datetime2 | No |  |

## CONCEPTO_PAGO

Conceptos permitidos para obligaciones económicas.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_CONCEPTO | varchar(20) | No | PK  |
| NOMBRE_CONCEPTO | varchar(60) | No |  |

## CONSTANCIA_AUDITORIA

Constancia inmutable e independiente de cada depuración, con IDs y huella del contenido revisado.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID | bigint | No | PK IDENTITY |
| FECHA | datetime2 | No |  |
| OPERACION | varchar(20) | No |  |
| ID_ADMINISTRADOR | varchar(20) | No |  |
| NOMBRE_ADMINISTRADOR | varchar(120) | No |  |
| CANTIDAD | int | No |  |
| EVENTOS | nvarchar(max) | No |  |
| HUELLA | varbinary | No |  |
| MOTIVO | nvarchar(250) | No |  |
| POLITICA | nvarchar(max) | No |  |

## CONTACTO_VERIFICADO

Contacto cuyo control se comprobó; método y responsable de verificación.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID | bigint | No | PK IDENTITY |
| DNI_ALUMNO | varchar(8) | No |  |
| TIPO | varchar(7) | No |  |
| DESTINO | varchar(150) | No |  |
| ACTIVO | bit | No |  |
| METODO_VERIFICACION | varchar(12) | No |  |
| ID_USUARIO_RESPONSABLE | varchar(20) | No |  |
| VERIFICADO | datetime2 | No |  |

## CONTROL_MIGRACION

Marcadores de scripts aplicados correctamente; evita repetir operaciones.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| SCRIPT | varchar(100) | No | PK  |
| FECHA_EVENTO | datetime2 | No |  |

## CURSO

Catálogo de asignaturas que pueden programarse.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_CURSO | varchar(10) | No | PK  |
| NOMBRE_CURSO | varchar(100) | No |  |
| ACTIVO | bit | No |  |

## CURSO_DOCENTE

Relación de asignaturas que puede impartir cada docente.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_CURSO | varchar(10) | No | PK  |
| DNI_DOCENTE | varchar(8) | No | PK  |

## DOCENTE

Ficha del docente identificado por DNI.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| DNI_DOCENTE | varchar(8) | No | PK  |
| NOMBRE_COMPLETO | varchar(120) | No |  |
| CELULAR | varchar(9) | No |  |
| ESPECIALIDAD | varchar(120) | Sí |  |
| ACTIVO | bit | No |  |

## ESTADO_ALUMNO

Estado administrativo del estudiante y estado previo del acceso para restauración.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| DNI_ALUMNO | varchar(8) | No | PK  |
| ACTIVO | bit | No |  |
| ACCESO_ACTIVO_ANTERIOR | bit | Sí |  |
| MOTIVO | varchar(250) | No |  |
| ID_USUARIO_RESPONSABLE | varchar(20) | No |  |
| FECHA_EVENTO | datetime2 | No |  |

## ESTADO_CICLO

Estados permitidos del ciclo académico.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_ESTADO_CICLO | varchar(15) | No | PK  |
| NOMBRE_ESTADO | varchar(60) | No |  |

## ESTADO_MATRICULA

Estados permitidos de una inscripción.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_ESTADO_MATRICULA | varchar(15) | No | PK  |
| NOMBRE_ESTADO | varchar(60) | No |  |

## ESTADO_PAGO

Estados permitidos de una obligación.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_ESTADO_PAGO | varchar(10) | No | PK  |
| NOMBRE_ESTADO | varchar(60) | No |  |

## ESTADO_RESULTADO

Anulación y motivo de un resultado; conserva el puntaje original.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_RESULTADO | varchar(20) | No | PK  |
| ANULADO | bit | No |  |
| MOTIVO | varchar(250) | No |  |
| ID_USUARIO_RESPONSABLE | varchar(20) | No |  |
| FECHA_EVENTO | datetime2 | No |  |

## ESTADO_SIMULACRO

Estados de una participación en simulacro.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_ESTADO_SIMULACRO | varchar(15) | No | PK  |
| NOMBRE_ESTADO | varchar(60) | No |  |

## HORARIO_ACADEMICO

Cabecera de la semana académica: ciclo, turno, aula, cupos, publicación y versión.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_HORARIO_ACADEMICO | varchar(20) | No | PK  |
| NOMBRE_HORARIO | varchar(60) | No |  |
| CAPACIDAD_MAXIMA | smallint | No |  |
| ACTIVO | bit | No |  |
| ID_TURNO | varchar(10) | No |  |
| ID_AULA | varchar(10) | No |  |
| ID_CICLO | varchar(20) | No |  |
| ESTADO_HORARIO | varchar(10) | No |  |
| VERSION_HORARIO | int | No |  |

## LINEA_BASE_MIGRACION

Control histórico de integridad de migraciones previas; no es una ficha académica.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| NOMBRE_TABLA | sysname | No | PK  |
| CLAVE_REGISTRO | nvarchar(200) | No | PK  |
| HUELLA | varbinary | No |  |

## MATRICULA

Inscripción de un estudiante en un horario y periodo; conserva estado e historial.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| DNI_ALUMNO | varchar(8) | No |  |
| ID_MATRICULA | varchar(20) | No | PK  |
| ID_ESTADO_MATRICULA | varchar(15) | No |  |
| FECHA_MATRICULA | date | No |  |
| OBSERVACIONES | varchar(250) | Sí |  |
| ID_HORARIO_ACADEMICO | varchar(20) | No |  |

## MEDIO_PAGO

Medios habilitados para registrar cobros.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_MEDIO_PAGO | varchar(10) | No | PK  |
| NOMBRE_MEDIO_PAGO | varchar(60) | No |  |
| ACTIVO | bit | No |  |

## PAGO

Obligación económica, concepto, mensualidad, vencimiento y confirmación de cobro.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_PAGO | varchar(20) | No | PK  |
| ID_CONCEPTO | varchar(20) | No |  |
| NUMERO_MENSUALIDAD | tinyint | Sí |  |
| MONTO | decimal(10,2) | No |  |
| FECHA_VENCIMIENTO | date | Sí |  |
| ID_ESTADO_PAGO | varchar(10) | No |  |
| FECHA_PAGO | datetime2 | Sí |  |
| ID_MEDIO_PAGO | varchar(10) | Sí |  |
| ID_USUARIO_RESPONSABLE | varchar(20) | Sí |  |
| DNI_ALUMNO | varchar(8) | No |  |
| ID_MATRICULA | varchar(20) | Sí |  |

## PAPELERA_REGISTRO

Registro lógico de envío, administrador, motivo, claves y estado previo/restauración/eliminación.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID | bigint | No | PK IDENTITY |
| ENTIDAD | varchar(64) | No |  |
| CLAVES | nvarchar(500) | No |  |
| ID_REGISTRO | varchar(200) | No |  |
| NOMBRE | nvarchar(240) | No |  |
| FECHA_ENVIO | datetime2 | No |  |
| ID_ADMINISTRADOR | varchar(20) | No |  |
| NOMBRE_ADMINISTRADOR | varchar(120) | No |  |
| ESTADO | varchar(12) | No |  |
| ESTADO_ANTERIOR | nvarchar(max) | No |  |
| MOTIVO | nvarchar(250) | No |  |
| FECHA_RESOLUCION | datetime2 | Sí |  |

## PARENTESCO

Relación opcional con el apoderado registrado en la ficha.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_PARENTESCO | varchar(5) | No | PK  |
| PARENTESCO | varchar(40) | No |  |

## POLITICA_AUDITORIA

Una política vigente para conservación y permisos de depuración/anonimización de pruebas.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID | tinyint | No | PK  |
| DIAS_RETENCION_PRUEBA | int | No |  |
| PERMITE_DEPURAR | bit | No |  |
| PERMITE_ANONIMIZAR | bit | No |  |
| FECHA_CAMBIO | datetime2 | No |  |
| ID_ADMINISTRADOR | varchar(20) | Sí |  |
| MOTIVO | nvarchar(250) | No |  |

## PROGRAMA

Programa académico al que pertenecen los ciclos.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_PROGRAMA | varchar(20) | No | PK  |
| NOMBRE_PROGRAMA | varchar(100) | No |  |
| DESCRIPCION | varchar(250) | Sí |  |
| ACTIVO | bit | No |  |

## RESULTADO_SIMULACRO

Puntaje total por matrícula y participación del simulacro.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_RESULTADO | varchar(20) | No | PK  |
| PUNTAJE_TOTAL | decimal(8,2) | No |  |
| FECHA_REGISTRO | datetime2 | No |  |
| ID_MATRICULA | varchar(20) | No |  |
| ID_SIMULACRO_HORARIO | varchar(20) | No |  |
| ID_HORARIO_ACADEMICO | varchar(20) | No |  |

## ROL

Roles de acceso admitidos por la aplicación.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_ROL | varchar(10) | No | PK  |
| NOMBRE_ROL | varchar(60) | No |  |

## SEGURIDAD_USUARIO

Versión de sesiones y activación inicial; revoca tokens anteriores.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_USUARIO_RESPONSABLE | varchar(20) | No | PK  |
| VERSION_SESION | int | No |  |
| ACTIVACION_REQUERIDA | bit | No |  |

## SIMULACRO

Evaluación y puntaje máximo.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_SIMULACRO | varchar(20) | No | PK  |
| NOMBRE_SIMULACRO | nvarchar(150) | No |  |
| DESCRIPCION | nvarchar(300) | Sí |  |
| PUNTAJE_MAXIMO | decimal(8,2) | No |  |
| ACTIVO | bit | No |  |

## SIMULACRO_HORARIO

Participación de un horario en un simulacro; fecha, duración, estado y publicación.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_SIMULACRO_HORARIO | varchar(20) | No | PK  |
| FECHA_PROGRAMADA | date | No |  |
| HORA_INICIO | time | No |  |
| DURACION_MINUTOS | smallint | No |  |
| ESTADO | varchar(15) | No |  |
| PUBLICADO | bit | No |  |
| ID_SIMULACRO | varchar(20) | No |  |
| ID_HORARIO_ACADEMICO | varchar(20) | No |  |
| ID_ESTADO_SIMULACRO | varchar(15) | No |  |

## SOLICITUD_CONTACTO

Solicitud y resolución del cambio de contacto del estudiante.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID | uniqueidentifier | No | PK  |
| DNI_ALUMNO | varchar(8) | No |  |
| TIPO | varchar(7) | No |  |
| DESTINO | varchar(150) | No |  |
| ESTADO | varchar(20) | No |  |
| ID_CODIGO | uniqueidentifier | Sí |  |
| FECHA_CREACION | datetime2 | No |  |
| FECHA_RESOLUCION | datetime2 | Sí |  |
| ID_USUARIO_RESPONSABLE | varchar(20) | Sí |  |
| MOTIVO | varchar(250) | Sí |  |

## TIPO_BLOQUE

Distingue clases y recreos.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_TIPO_BLOQUE | varchar(10) | No | PK  |
| NOMBRE_TIPO | varchar(60) | No |  |

## TURNO

Franja horaria de referencia para las clases.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_TURNO | varchar(10) | No | PK  |
| NOMBRE_TURNO | varchar(15) | No |  |
| HORA_INICIO | time | No |  |
| HORA_FIN | time | No |  |

## USUARIO

Cuenta de acceso, hash de contraseña, rol y recuperación; vínculo opcional único con estudiante.

| Atributo | Tipo | NULL | Clave |
|---|---|---|---|
| ID_USUARIO | varchar(20) | No | PK  |
| NOMBRE_USUARIO | varchar(80) | No |  |
| CLAVE_HASH | varchar(255) | No |  |
| ID_ROL | varchar(10) | No |  |
| ACTIVO | bit | No |  |
| DEBE_CAMBIAR_CLAVE | bit | No |  |
| DNI_ALUMNO | varchar(8) | Sí |  |
| CORREO_RECUPERACION | varchar(150) | Sí |  |
| CORREO_VERIFICADO | bit | No |  |

## Relaciones y cardinalidades

| Padre | Hija | Atributos FK → referencia | Cardinalidad desde padre |
|---|---|---|---|
| ALUMNO | CONTACTO_VERIFICADO | DNI_ALUMNO → DNI_ALUMNO | 1 a 0..N |
| ALUMNO | ESTADO_ALUMNO | DNI_ALUMNO → DNI_ALUMNO | 1 a 0..1 |
| ALUMNO | MATRICULA | DNI_ALUMNO → DNI_ALUMNO | 1 a 0..N |
| ALUMNO | PAGO | DNI_ALUMNO → DNI_ALUMNO | 1 a 0..N |
| ALUMNO | SOLICITUD_CONTACTO | DNI_ALUMNO → DNI_ALUMNO | 1 a 0..N |
| ALUMNO | USUARIO | DNI_ALUMNO → DNI_ALUMNO | Padre opcional; 1 a 0..1 |
| AULA | HORARIO_ACADEMICO | ID_AULA → ID_AULA | 1 a 0..N |
| CARRERA | ALUMNO | ID_CARRERA → ID_CARRERA | 1 a 0..N |
| CICLO | HORARIO_ACADEMICO | ID_CICLO → ID_CICLO | 1 a 0..N |
| CODIGO_CUENTA | SOLICITUD_CONTACTO | ID_CODIGO → ID | Padre opcional; 1 a 0..N |
| CONCEPTO_PAGO | PAGO | ID_CONCEPTO → ID_CONCEPTO | 1 a 0..N |
| CURSO | CURSO_DOCENTE | ID_CURSO → ID_CURSO | 1 a 0..N |
| CURSO_DOCENTE | BLOQUE_HORARIO | ID_CURSO,DNI_DOCENTE → ID_CURSO,DNI_DOCENTE | Padre opcional; 1 a 0..N |
| DOCENTE | CURSO_DOCENTE | DNI_DOCENTE → DNI_DOCENTE | 1 a 0..N |
| ESTADO_CICLO | CICLO | ID_ESTADO_CICLO → ID_ESTADO_CICLO | 1 a 0..N |
| ESTADO_MATRICULA | MATRICULA | ID_ESTADO_MATRICULA → ID_ESTADO_MATRICULA | 1 a 0..N |
| ESTADO_PAGO | PAGO | ID_ESTADO_PAGO → ID_ESTADO_PAGO | 1 a 0..N |
| ESTADO_SIMULACRO | SIMULACRO_HORARIO | ID_ESTADO_SIMULACRO → ID_ESTADO_SIMULACRO | 1 a 0..N |
| HORARIO_ACADEMICO | BLOQUE_HORARIO | ID_HORARIO_ACADEMICO → ID_HORARIO_ACADEMICO | 1 a 0..N |
| HORARIO_ACADEMICO | MATRICULA | ID_HORARIO_ACADEMICO → ID_HORARIO_ACADEMICO | 1 a 0..N |
| HORARIO_ACADEMICO | SIMULACRO_HORARIO | ID_HORARIO_ACADEMICO → ID_HORARIO_ACADEMICO | 1 a 0..N |
| MATRICULA | PAGO | ID_MATRICULA,DNI_ALUMNO → ID_MATRICULA,DNI_ALUMNO | Padre opcional; 1 a 0..N |
| MATRICULA | RESULTADO_SIMULACRO | ID_MATRICULA,ID_HORARIO_ACADEMICO → ID_MATRICULA,ID_HORARIO_ACADEMICO | 1 a 0..N |
| MEDIO_PAGO | PAGO | ID_MEDIO_PAGO → ID_MEDIO_PAGO | Padre opcional; 1 a 0..N |
| PARENTESCO | ALUMNO | ID_PARENTESCO → ID_PARENTESCO | Padre opcional; 1 a 0..N |
| PROGRAMA | CICLO | ID_PROGRAMA → ID_PROGRAMA | 1 a 0..N |
| RESULTADO_SIMULACRO | ESTADO_RESULTADO | ID_RESULTADO → ID_RESULTADO | 1 a 0..1 |
| ROL | USUARIO | ID_ROL → ID_ROL | 1 a 0..N |
| SIMULACRO | SIMULACRO_HORARIO | ID_SIMULACRO → ID_SIMULACRO | 1 a 0..N |
| SIMULACRO_HORARIO | RESULTADO_SIMULACRO | ID_SIMULACRO_HORARIO,ID_HORARIO_ACADEMICO → ID_SIMULACRO_HORARIO,ID_HORARIO_ACADEMICO | 1 a 0..N |
| TIPO_BLOQUE | BLOQUE_HORARIO | ID_TIPO_BLOQUE → ID_TIPO_BLOQUE | 1 a 0..N |
| TURNO | HORARIO_ACADEMICO | ID_TURNO → ID_TURNO | 1 a 0..N |
| USUARIO | BLOQUE_HORARIO | ID_USUARIO_AUTORIZADOR → ID_USUARIO | Padre opcional; 1 a 0..N |
| USUARIO | CODIGO_CUENTA | ID_USUARIO_RESPONSABLE → ID_USUARIO | 1 a 0..N |
| USUARIO | CONTACTO_VERIFICADO | ID_USUARIO_RESPONSABLE → ID_USUARIO | 1 a 0..N |
| USUARIO | ESTADO_ALUMNO | ID_USUARIO_RESPONSABLE → ID_USUARIO | 1 a 0..N |
| USUARIO | ESTADO_RESULTADO | ID_USUARIO_RESPONSABLE → ID_USUARIO | 1 a 0..N |
| USUARIO | PAGO | ID_USUARIO_RESPONSABLE → ID_USUARIO | Padre opcional; 1 a 0..N |
| USUARIO | SEGURIDAD_USUARIO | ID_USUARIO_RESPONSABLE → ID_USUARIO | 1 a 0..1 |
| USUARIO | SOLICITUD_CONTACTO | ID_USUARIO_RESPONSABLE → ID_USUARIO | Padre opcional; 1 a 0..N |

AUDITORIA_SISTEMA, PAPELERA_REGISTRO y CONSTANCIA_AUDITORIA conservan identificadores históricos sin FK al actor. No se borran al retirar una cuenta. No hay cascadas de eliminación.
