# Mapa de nombres V4.5

No cambia identificadores ni tipos. NOMBRE_COMPLETO conserva nombres y apellidos historicos sin intentar dividirlos. CODIGO_CUENTA cubre recuperacion, activacion y verificacion; no solo recuperacion.

| Tabla V4.4 | Tabla V4.5 | Funcion | Justificacion |
|---|---|---|---|
| ALUMNO | ALUMNO | Ficha del estudiante; DNI como clave, contacto propio, apoderado opcional y marca de prueba inmutable. | Convencion ya correcta |
| Alumno_Estado_V41 | ESTADO_ALUMNO | Estado administrativo del estudiante y estado previo del acceso para restauración. | Nombre singular, descriptivo y sin sufijo de version |
| Auditoria_V4 | AUDITORIA_SISTEMA | Historial de acciones con identidad histórica del actor, cambios y protección/retención de pruebas. | Nombre singular, descriptivo y sin sufijo de version |
| Aula | AULA | Espacio físico y capacidad disponible. | Nombre singular, descriptivo y sin sufijo de version |
| CARRERA | CARRERA | Carrera o interés académico del estudiante. | Convencion ya correcta |
| Ciclo | CICLO | Edición del programa: modalidad, fechas, mensualidades y tarifa. | Nombre singular, descriptivo y sin sufijo de version |
| CONCEPTO_PAGO | CONCEPTO_PAGO | Conceptos permitidos para obligaciones económicas. | Convencion ya correcta |
| Contacto_Verificado_V41 | CONTACTO_VERIFICADO | Contacto cuyo control se comprobó; método y responsable de verificación. | Nombre singular, descriptivo y sin sufijo de version |
| Control_Migracion_V4 | CONTROL_MIGRACION | Marcadores de scripts aplicados correctamente; evita repetir operaciones. | Nombre singular, descriptivo y sin sufijo de version |
| Cuenta_Codigo_V41 | CODIGO_CUENTA | Códigos de activación, recuperación o verificación; hashes, caducidad, uso e intentos. | Nombre singular, descriptivo y sin sufijo de version |
| CURSOS | CURSO | Catálogo de asignaturas que pueden programarse. | Nombre singular, descriptivo y sin sufijo de version |
| Docente | DOCENTE | Ficha del docente identificado por DNI. | Nombre singular, descriptivo y sin sufijo de version |
| Docente_Asignatura | CURSO_DOCENTE | Relación de asignaturas que puede impartir cada docente. | Nombre singular, descriptivo y sin sufijo de version |
| ESTADO_CICLO | ESTADO_CICLO | Estados permitidos del ciclo académico. | Convencion ya correcta |
| ESTADO_EXAMEN_GRUPO | ESTADO_SIMULACRO | Estados de una participación en simulacro. | Nombre singular, descriptivo y sin sufijo de version |
| ESTADO_MATRICULA | ESTADO_MATRICULA | Estados permitidos de una inscripción. | Convencion ya correcta |
| ESTADO_PAGO | ESTADO_PAGO | Estados permitidos de una obligación. | Convencion ya correcta |
| Examen | SIMULACRO | Evaluación y puntaje máximo. | Nombre singular, descriptivo y sin sufijo de version |
| Examen_Grupo | SIMULACRO_HORARIO | Participación de un horario en un simulacro; fecha, duración, estado y publicación. | Nombre singular, descriptivo y sin sufijo de version |
| Grupo | HORARIO_ACADEMICO | Cabecera de la semana académica: ciclo, turno, aula, cupos, publicación y versión. | Nombre singular, descriptivo y sin sufijo de version |
| Horario | BLOQUE_HORARIO | Clase o recreo semanal de un horario, con día, intervalo, curso y docente. | Nombre singular, descriptivo y sin sufijo de version |
| Linea_Base_V4 | LINEA_BASE_MIGRACION | Control histórico de integridad de migraciones previas; no es una ficha académica. | Nombre singular, descriptivo y sin sufijo de version |
| MATRICULA | MATRICULA | Inscripción de un estudiante en un horario y periodo; conserva estado e historial. | Convencion ya correcta |
| MEDIO_PAGO | MEDIO_PAGO | Medios habilitados para registrar cobros. | Convencion ya correcta |
| Nota_Estado_V41 | ESTADO_RESULTADO | Anulación y motivo de un resultado; conserva el puntaje original. | Nombre singular, descriptivo y sin sufijo de version |
| Nota_Examen | RESULTADO_SIMULACRO | Puntaje total por matrícula y participación del simulacro. | Nombre singular, descriptivo y sin sufijo de version |
| Pago | PAGO | Obligación económica, concepto, mensualidad, vencimiento y confirmación de cobro. | Nombre singular, descriptivo y sin sufijo de version |
| PARENTESCO | PARENTESCO | Relación opcional con el apoderado registrado en la ficha. | Convencion ya correcta |
| Programa | PROGRAMA | Programa académico al que pertenecen los ciclos. | Nombre singular, descriptivo y sin sufijo de version |
| ROL | ROL | Roles de acceso admitidos por la aplicación. | Convencion ya correcta |
| Solicitud_Contacto_V41 | SOLICITUD_CONTACTO | Solicitud y resolución del cambio de contacto del estudiante. | Nombre singular, descriptivo y sin sufijo de version |
| TIPO_BLOQUE | TIPO_BLOQUE | Distingue clases y recreos. | Convencion ya correcta |
| Turno | TURNO | Franja horaria de referencia para las clases. | Nombre singular, descriptivo y sin sufijo de version |
| Usuario | USUARIO | Cuenta de acceso, hash de contraseña, rol y recuperación; vínculo opcional único con estudiante. | Nombre singular, descriptivo y sin sufijo de version |
| Usuario_Seguridad_V41 | SEGURIDAD_USUARIO | Versión de sesiones y activación inicial; revoca tokens anteriores. | Nombre singular, descriptivo y sin sufijo de version |

## Todas las columnas

| Tabla final | Columna V4.4 | Columna V4.5 | Tipo/longitud | NULL |
|---|---|---|---|---|
| ALUMNO | DNI_Alu | DNI_ALUMNO | varchar(8) | No |
| ALUMNO | Nomb_Alu | NOMBRE_COMPLETO | varchar(120) | No |
| ALUMNO | Correo_Alu | CORREO | varchar(150) | Si |
| ALUMNO | Fech_Nac | FECHA_NACIMIENTO | date | Si |
| ALUMNO | Cel_Alu | CELULAR | varchar(9) | Si |
| ALUMNO | Dir_Alu | DIRECCION | varchar(200) | Si |
| ALUMNO | Nomb_Apoderado | NOMBRE_APODERADO | varchar(120) | Si |
| ALUMNO | DNI_Apoderado | DNI_APODERADO | varchar(8) | Si |
| ALUMNO | Cel_Apoderado | CELULAR_APODERADO | varchar(9) | Si |
| ALUMNO | Correo_Apoderado | CORREO_APODERADO | varchar(150) | Si |
| ALUMNO | PARENTESCO_Cod_Paren | ID_PARENTESCO | varchar(5) | Si |
| ALUMNO | CARRERA_Cod_Carrera | ID_CARRERA | varchar(10) | No |
| ALUMNO | Es_Prueba | ES_PRUEBA | bit | No |
| ESTADO_ALUMNO | ALUMNO_DNI_Alu | DNI_ALUMNO | varchar(8) | No |
| ESTADO_ALUMNO | Activo | ACTIVO | bit | No |
| ESTADO_ALUMNO | Usuario_Activo_Anterior | ACCESO_ACTIVO_ANTERIOR | bit | Si |
| ESTADO_ALUMNO | Motivo | MOTIVO | varchar(250) | No |
| ESTADO_ALUMNO | Usuario_Cod_Usuario | ID_USUARIO_RESPONSABLE | varchar(20) | No |
| ESTADO_ALUMNO | Fecha | FECHA_EVENTO | datetime2 | No |
| AUDITORIA_SISTEMA | Id | ID | bigint | No |
| AUDITORIA_SISTEMA | Entidad | ENTIDAD | varchar(20) | No |
| AUDITORIA_SISTEMA | Codigo | ID_REGISTRO | varchar(20) | No |
| AUDITORIA_SISTEMA | Accion | ACCION | varchar(30) | No |
| AUDITORIA_SISTEMA | Anterior | DATOS_ANTERIORES | nvarchar(max) | Si |
| AUDITORIA_SISTEMA | Nuevo | DATOS_NUEVOS | nvarchar(max) | Si |
| AUDITORIA_SISTEMA | Usuario_Cod_Usuario | ID_USUARIO_RESPONSABLE | varchar(20) | No |
| AUDITORIA_SISTEMA | Motivo | MOTIVO | varchar(250) | Si |
| AUDITORIA_SISTEMA | Fecha | FECHA_EVENTO | datetime2 | No |
| AULA | Cod_Aula | ID_AULA | varchar(10) | No |
| AULA | Nomb_Aula | NOMBRE_AULA | varchar(60) | No |
| AULA | Capacidad | CAPACIDAD | smallint | No |
| AULA | Activa | ACTIVO | bit | No |
| CARRERA | Cod_Carrera | ID_CARRERA | varchar(10) | No |
| CARRERA | Nomb_Carrera | NOMBRE_CARRERA | varchar(120) | No |
| CICLO | Cod_Ciclo | ID_CICLO | varchar(20) | No |
| CICLO | Programa_Cod_Programa | ID_PROGRAMA | varchar(20) | No |
| CICLO | Nomb_Ciclo | NOMBRE_CICLO | varchar(100) | No |
| CICLO | Modalidad | MODALIDAD | varchar(12) | No |
| CICLO | Fech_Inicio | FECHA_INICIO | date | No |
| CICLO | Fech_Fin | FECHA_FIN | date | No |
| CICLO | Nro_Mensualidades | NUMERO_MENSUALIDADES | tinyint | No |
| CICLO | Precio_Mensual | PRECIO_MENSUAL | decimal(10,2) | No |
| CICLO | ESTADO_CICLO_Cod_Estado | ID_ESTADO_CICLO | varchar(15) | No |
| CONCEPTO_PAGO | Cod_Concepto | ID_CONCEPTO | varchar(20) | No |
| CONCEPTO_PAGO | Nomb_Concepto | NOMBRE_CONCEPTO | varchar(60) | No |
| CONTACTO_VERIFICADO | Id | ID | bigint | No |
| CONTACTO_VERIFICADO | ALUMNO_DNI_Alu | DNI_ALUMNO | varchar(8) | No |
| CONTACTO_VERIFICADO | Tipo | TIPO | varchar(7) | No |
| CONTACTO_VERIFICADO | Destino | DESTINO | varchar(150) | No |
| CONTACTO_VERIFICADO | Activo | ACTIVO | bit | No |
| CONTACTO_VERIFICADO | Metodo | METODO_VERIFICACION | varchar(12) | No |
| CONTACTO_VERIFICADO | Usuario_Cod_Usuario | ID_USUARIO_RESPONSABLE | varchar(20) | No |
| CONTACTO_VERIFICADO | Verificado | VERIFICADO | datetime2 | No |
| CONTROL_MIGRACION | Script | SCRIPT | varchar(100) | No |
| CONTROL_MIGRACION | Fecha | FECHA_EVENTO | datetime2 | No |
| CODIGO_CUENTA | Id | ID | uniqueidentifier | No |
| CODIGO_CUENTA | Usuario_Cod_Usuario | ID_USUARIO_RESPONSABLE | varchar(20) | No |
| CODIGO_CUENTA | Proposito | PROPOSITO | varchar(20) | No |
| CODIGO_CUENTA | Canal | CANAL | varchar(7) | No |
| CODIGO_CUENTA | Destino | DESTINO | varchar(150) | Si |
| CODIGO_CUENTA | Nonce | NONCE | char(32) | No |
| CODIGO_CUENTA | Codigo_Hash | CODIGO_HASH | char(64) | No |
| CODIGO_CUENTA | Desafio_Hash | DESAFIO_HASH | char(64) | Si |
| CODIGO_CUENTA | Expira | FECHA_VENCIMIENTO | datetime2 | No |
| CODIGO_CUENTA | Intentos | INTENTOS | tinyint | No |
| CODIGO_CUENTA | Consumido | CONSUMIDO | bit | No |
| CODIGO_CUENTA | Creado | FECHA_CREACION | datetime2 | No |
| CURSO | Cod_Curso | ID_CURSO | varchar(10) | No |
| CURSO | Nomb_Curso | NOMBRE_CURSO | varchar(100) | No |
| CURSO | Activa | ACTIVO | bit | No |
| DOCENTE | DNI_Doc | DNI_DOCENTE | varchar(8) | No |
| DOCENTE | Nom_Doc | NOMBRE_COMPLETO | varchar(120) | No |
| DOCENTE | Cel_Doc | CELULAR | varchar(9) | No |
| DOCENTE | Especialidad | ESPECIALIDAD | varchar(120) | Si |
| DOCENTE | Activo | ACTIVO | bit | No |
| CURSO_DOCENTE | CURSOS_Cod_Curso | ID_CURSO | varchar(10) | No |
| CURSO_DOCENTE | Docente_DNI_Doc | DNI_DOCENTE | varchar(8) | No |
| ESTADO_CICLO | Cod_Estado_Ciclo | ID_ESTADO_CICLO | varchar(15) | No |
| ESTADO_CICLO | Nomb_Estado_Ciclo | NOMBRE_ESTADO | varchar(60) | No |
| ESTADO_SIMULACRO | Cod_Estado_Examen | ID_ESTADO_SIMULACRO | varchar(15) | No |
| ESTADO_SIMULACRO | Nomb_Estado_Examen | NOMBRE_ESTADO | varchar(60) | No |
| ESTADO_MATRICULA | Cod_Estado_Matricula | ID_ESTADO_MATRICULA | varchar(15) | No |
| ESTADO_MATRICULA | Nomb_Estado_Matricula | NOMBRE_ESTADO | varchar(60) | No |
| ESTADO_PAGO | Cod_Estado | ID_ESTADO_PAGO | varchar(10) | No |
| ESTADO_PAGO | Nomb_Estado | NOMBRE_ESTADO | varchar(60) | No |
| SIMULACRO | Cod_Examen | ID_SIMULACRO | varchar(20) | No |
| SIMULACRO | Nomb_Examen | NOMBRE_SIMULACRO | nvarchar(150) | No |
| SIMULACRO | Descripcion | DESCRIPCION | nvarchar(300) | Si |
| SIMULACRO | puntaje_maximo | PUNTAJE_MAXIMO | decimal(8,2) | No |
| SIMULACRO | activo | ACTIVO | bit | No |
| SIMULACRO_HORARIO | Cod_examen_grupo | ID_SIMULACRO_HORARIO | varchar(20) | No |
| SIMULACRO_HORARIO | Fech_programada | FECHA_PROGRAMADA | date | No |
| SIMULACRO_HORARIO | Hr_inicio | HORA_INICIO | time | No |
| SIMULACRO_HORARIO | Duracion_minutos | DURACION_MINUTOS | smallint | No |
| SIMULACRO_HORARIO | Estado | ESTADO | varchar(15) | No |
| SIMULACRO_HORARIO | Publicado | PUBLICADO | bit | No |
| SIMULACRO_HORARIO | Examen_Cod_Examen | ID_SIMULACRO | varchar(20) | No |
| SIMULACRO_HORARIO | Grupo_Cod_Grupo | ID_HORARIO_ACADEMICO | varchar(20) | No |
| SIMULACRO_HORARIO | ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen | ID_ESTADO_SIMULACRO | varchar(15) | No |
| HORARIO_ACADEMICO | Cod_Grupo | ID_HORARIO_ACADEMICO | varchar(20) | No |
| HORARIO_ACADEMICO | Nomb_Grupo | NOMBRE_HORARIO | varchar(60) | No |
| HORARIO_ACADEMICO | Cupo_Max | CAPACIDAD_MAXIMA | smallint | No |
| HORARIO_ACADEMICO | Activo | ACTIVO | bit | No |
| HORARIO_ACADEMICO | Turno_Cod_Turno | ID_TURNO | varchar(10) | No |
| HORARIO_ACADEMICO | Aula_Cod_Aula | ID_AULA | varchar(10) | No |
| HORARIO_ACADEMICO | Ciclo_Cod_Ciclo | ID_CICLO | varchar(20) | No |
| HORARIO_ACADEMICO | Estado_Horario | ESTADO_HORARIO | varchar(10) | No |
| HORARIO_ACADEMICO | Version_Horario | VERSION_HORARIO | int | No |
| BLOQUE_HORARIO | Cod_Horario | ID_BLOQUE_HORARIO | varchar(20) | No |
| BLOQUE_HORARIO | Dia_Semana | DIA_SEMANA | tinyint | No |
| BLOQUE_HORARIO | Hr_Inicio | HORA_INICIO | time | No |
| BLOQUE_HORARIO | Hr_Fin | HORA_FIN | time | No |
| BLOQUE_HORARIO | Activo | ACTIVO | bit | No |
| BLOQUE_HORARIO | Grupo_Cod_Grupo | ID_HORARIO_ACADEMICO | varchar(20) | No |
| BLOQUE_HORARIO | TIPO_BLOQUE_Cod_Tipo | ID_TIPO_BLOQUE | varchar(10) | No |
| BLOQUE_HORARIO | Docente_Asignatura_CURSOS_Cod_Curso | ID_CURSO | varchar(10) | Si |
| BLOQUE_HORARIO | Docente_Asignatura_Docente_DNI_Doc | DNI_DOCENTE | varchar(8) | Si |
| BLOQUE_HORARIO | Excepcion_Turno | EXCEPCION_TURNO | bit | No |
| BLOQUE_HORARIO | Motivo_Excepcion | MOTIVO_EXCEPCION | nvarchar(250) | Si |
| BLOQUE_HORARIO | Autorizado_Por | ID_USUARIO_AUTORIZADOR | varchar(20) | Si |
| LINEA_BASE_MIGRACION | Tabla | NOMBRE_TABLA | sysname | No |
| LINEA_BASE_MIGRACION | Clave | CLAVE_REGISTRO | nvarchar(200) | No |
| LINEA_BASE_MIGRACION | Huella | HUELLA | varbinary | No |
| MATRICULA | ALUMNO_DNI_Alu | DNI_ALUMNO | varchar(8) | No |
| MATRICULA | Cod_Matricula | ID_MATRICULA | varchar(20) | No |
| MATRICULA | ESTADO_MATRICULA_Cod_Estado_Matricula | ID_ESTADO_MATRICULA | varchar(15) | No |
| MATRICULA | Fech_Matricula | FECHA_MATRICULA | date | No |
| MATRICULA | Observaciones | OBSERVACIONES | varchar(250) | Si |
| MATRICULA | Grupo_Cod_Grupo | ID_HORARIO_ACADEMICO | varchar(20) | No |
| MEDIO_PAGO | Cod_Medio | ID_MEDIO_PAGO | varchar(10) | No |
| MEDIO_PAGO | Nomb_Medio | NOMBRE_MEDIO_PAGO | varchar(60) | No |
| MEDIO_PAGO | Activo | ACTIVO | bit | No |
| ESTADO_RESULTADO | Nota_Examen_Cod_Nota | ID_RESULTADO | varchar(20) | No |
| ESTADO_RESULTADO | Anulada | ANULADO | bit | No |
| ESTADO_RESULTADO | Motivo | MOTIVO | varchar(250) | No |
| ESTADO_RESULTADO | Usuario_Cod_Usuario | ID_USUARIO_RESPONSABLE | varchar(20) | No |
| ESTADO_RESULTADO | Fecha | FECHA_EVENTO | datetime2 | No |
| RESULTADO_SIMULACRO | Cod_Nota | ID_RESULTADO | varchar(20) | No |
| RESULTADO_SIMULACRO | Puntaje_total | PUNTAJE_TOTAL | decimal(8,2) | No |
| RESULTADO_SIMULACRO | Fech_registro | FECHA_REGISTRO | datetime2 | No |
| RESULTADO_SIMULACRO | MATRICULA_Cod_Matricula | ID_MATRICULA | varchar(20) | No |
| RESULTADO_SIMULACRO | Examen_Grupo_Cod_examen_grupo | ID_SIMULACRO_HORARIO | varchar(20) | No |
| RESULTADO_SIMULACRO | Grupo_Cod_Grupo | ID_HORARIO_ACADEMICO | varchar(20) | No |
| PAGO | Cod_Pago | ID_PAGO | varchar(20) | No |
| PAGO | CONCEPTO_PAGO_Cod_Concepto | ID_CONCEPTO | varchar(20) | No |
| PAGO | Nro_Mensualidad | NUMERO_MENSUALIDAD | tinyint | Si |
| PAGO | Monto | MONTO | decimal(10,2) | No |
| PAGO | Fech_Vencimiento | FECHA_VENCIMIENTO | date | Si |
| PAGO | ESTADO_PAGO_Cod_Estado | ID_ESTADO_PAGO | varchar(10) | No |
| PAGO | Fech_Pago | FECHA_PAGO | datetime2 | Si |
| PAGO | Medio_Pago | ID_MEDIO_PAGO | varchar(10) | Si |
| PAGO | Usuario_Cod_Usuario | ID_USUARIO_RESPONSABLE | varchar(20) | Si |
| PAGO | ALUMNO_DNI_Alu | DNI_ALUMNO | varchar(8) | No |
| PAGO | MATRICULA_Cod_Matricula | ID_MATRICULA | varchar(20) | Si |
| PARENTESCO | Cod_Paren | ID_PARENTESCO | varchar(5) | No |
| PARENTESCO | Tipo_Paren | PARENTESCO | varchar(40) | No |
| PROGRAMA | Cod_Programa | ID_PROGRAMA | varchar(20) | No |
| PROGRAMA | Nomb_Programa | NOMBRE_PROGRAMA | varchar(100) | No |
| PROGRAMA | Descripcion | DESCRIPCION | varchar(250) | Si |
| PROGRAMA | Activo | ACTIVO | bit | No |
| ROL | Cod_Rol | ID_ROL | varchar(10) | No |
| ROL | Nomb_Rol | NOMBRE_ROL | varchar(60) | No |
| SOLICITUD_CONTACTO | Id | ID | uniqueidentifier | No |
| SOLICITUD_CONTACTO | ALUMNO_DNI_Alu | DNI_ALUMNO | varchar(8) | No |
| SOLICITUD_CONTACTO | Tipo | TIPO | varchar(7) | No |
| SOLICITUD_CONTACTO | Destino | DESTINO | varchar(150) | No |
| SOLICITUD_CONTACTO | Estado | ESTADO | varchar(20) | No |
| SOLICITUD_CONTACTO | Codigo_Id | ID_CODIGO | uniqueidentifier | Si |
| SOLICITUD_CONTACTO | Creado | FECHA_CREACION | datetime2 | No |
| SOLICITUD_CONTACTO | Resuelto | FECHA_RESOLUCION | datetime2 | Si |
| SOLICITUD_CONTACTO | Usuario_Cod_Usuario | ID_USUARIO_RESPONSABLE | varchar(20) | Si |
| SOLICITUD_CONTACTO | Motivo | MOTIVO | varchar(250) | Si |
| TIPO_BLOQUE | Cod_Tipo | ID_TIPO_BLOQUE | varchar(10) | No |
| TIPO_BLOQUE | Nomb_Tipo | NOMBRE_TIPO | varchar(60) | No |
| TURNO | Cod_Turno | ID_TURNO | varchar(10) | No |
| TURNO | Nomb_Turno | NOMBRE_TURNO | varchar(15) | No |
| TURNO | Hr_Inicio | HORA_INICIO | time | No |
| TURNO | Hr_Fin | HORA_FIN | time | No |
| USUARIO | Cod_Usuario | ID_USUARIO | varchar(20) | No |
| USUARIO | Nomb_Usuario | NOMBRE_USUARIO | varchar(80) | No |
| USUARIO | Clave_Hash | CLAVE_HASH | varchar(255) | No |
| USUARIO | ROL_Cod_Rol | ID_ROL | varchar(10) | No |
| USUARIO | Activo | ACTIVO | bit | No |
| USUARIO | Debe_Cambiar_Clave | DEBE_CAMBIAR_CLAVE | bit | No |
| USUARIO | ALUMNO_DNI_Alu | DNI_ALUMNO | varchar(8) | Si |
| USUARIO | Correo_Recuperacion | CORREO_RECUPERACION | varchar(150) | Si |
| USUARIO | Correo_Verificado | CORREO_VERIFICADO | bit | No |
| SEGURIDAD_USUARIO | Usuario_Cod_Usuario | ID_USUARIO_RESPONSABLE | varchar(20) | No |
| SEGURIDAD_USUARIO | Version_Sesion | VERSION_SESION | int | No |
| SEGURIDAD_USUARIO | Activacion_Requerida | ACTIVACION_REQUERIDA | bit | No |

## Objetos

| Objeto anterior | Objeto final |
|---|---|
| TR_Horario_Sin_Cruces | TR_BLOQUE_HORARIO_VALIDAR_CRUCES |
| TR_Matricula_CupoMaximo | TR_MATRICULA_VALIDAR_CAPACIDAD |
| TR_Nota_Examen_Puntaje | TR_RESULTADO_SIMULACRO_VALIDAR_PUNTAJE |
| TR_Pago_Mes_Valido | TR_PAGO_VALIDAR_MENSUALIDAD |
| TR_V4_Auditoria_Inmutable | TR_AUDITORIA_SISTEMA_PROTEGER |
| TR_V4_Ciclo_Historial | TR_CICLO_PROTEGER_HISTORIAL |
| TR_V4_Examen_Maximo | TR_SIMULACRO_VALIDAR_MAXIMO |
| TR_V4_Grupo_Historial | TR_HORARIO_ACADEMICO_PROTEGER_HISTORIAL |
| TR_V4_Matricula_Historial | TR_MATRICULA_PROTEGER_HISTORIAL |
| TR_V4_Nota_Unica | TR_RESULTADO_SIMULACRO_UNICIDAD |
| TR_V4_Pago_Obligacion | TR_PAGO_VALIDAR_OBLIGACION |
| TR_V41_Alumno_Contacto | TR_ALUMNO_PROTEGER_CONTACTO |
| TR_V43_MarcaPrueba | TR_ALUMNO_MARCA_PRUEBA_INMUTABLE |
| TR_V43_Tarifa_Ciclo | TR_CICLO_VALIDAR_TARIFA |
| TR_V43_Usuario_Correo | TR_USUARIO_VERIFICAR_CORREO |
| TR_V44_Grupo_Publicacion | TR_HORARIO_ACADEMICO_VALIDAR_PUBLICACION |
| TR_V44_Matricula_Publicada | TR_MATRICULA_VALIDAR_PUBLICACION |
| TR_V44_Nota_Eliminar | TR_RESULTADO_SIMULACRO_PROTEGER_ELIMINACION |
| TR_V44_Pago_Eliminar | TR_PAGO_PROTEGER_ELIMINACION |
| CK_ALUMNO_DNI | CK_ALUMNO_DNI |
| CK_ALUMNO_DNI_Apoderado | CK_ALUMNO_DNI_APODERADO |
| CK_Auditoria_V4_JSON | CK_AUDITORIA_SISTEMA_JSON |
| CK_Aula_Capacidad | CK_AULA_CAPACIDAD |
| CK_Ciclo_Fechas | CK_CICLO_FECHAS |
| CK_Ciclo_Modalidad | CK_CICLO_MODALIDAD |
| CK_Ciclo_Precio | CK_CICLO_PRECIO |
| CK_Codigo_V41_Canal | CK_CODIGO_CUENTA_CANAL |
| CK_Codigo_V41_Fechas | CK_CODIGO_CUENTA_FECHAS |
| CK_Codigo_V41_Hash | CK_CODIGO_CUENTA_HASH |
| CK_Codigo_V41_Intentos | CK_CODIGO_CUENTA_INTENTOS |
| CK_Codigo_V41_Proposito | CK_CODIGO_CUENTA_PROPOSITO |
| CK_CONCEPTO_PAGO_Codigos | CK_CONCEPTO_PAGO_CODIGOS |
| CK_Contacto_V41_Destino | CK_CONTACTO_VERIFICADO_DESTINO |
| CK_Contacto_V41_Metodo | CK_CONTACTO_VERIFICADO_METODO_VERIFICACION |
| CK_Contacto_V41_Tipo | CK_CONTACTO_VERIFICADO_TIPO |
| CK_Docente_DNI | CK_DOCENTE_DNI |
| CK_ESTADO_CICLO_Codigos | CK_ESTADO_CICLO_CODIGOS |
| CK_ESTADO_EXAMEN_GRUPO_Codigos | CK_ESTADO_SIMULACRO_CODIGOS |
| CK_ESTADO_MATRICULA_Codigos | CK_ESTADO_MATRICULA_CODIGOS |
| CK_ESTADO_PAGO_Codigos | CK_ESTADO_PAGO_CODIGOS |
| CK_Examen_Puntaje | CK_SIMULACRO_PUNTAJE |
| CK_ExamenGrupo_Duracion | CK_SIMULACRO_HORARIO_DURACION |
| CK_ExamenGrupo_Estado | CK_SIMULACRO_HORARIO_ESTADO |
| CK_Grupo_Cupo | CK_HORARIO_ACADEMICO_CUPO |
| CK_Grupo_EstadoHorario | CK_HORARIO_ACADEMICO_ESTADO_HORARIO |
| CK_Grupo_VersionHorario | CK_HORARIO_ACADEMICO_VERSION_HORARIO |
| CK_Horario_Bloque | CK_BLOQUE_HORARIO_BLOQUE |
| CK_Horario_Dia | CK_BLOQUE_HORARIO_DIA |
| CK_Horario_Excepcion | CK_BLOQUE_HORARIO_EXCEPCION |
| CK_Horario_Horas | CK_BLOQUE_HORARIO_HORAS |
| CK_MEDIO_PAGO_Codigo | CK_MEDIO_PAGO_ID_REGISTRO |
| CK_Nota_Puntaje | CK_RESULTADO_SIMULACRO_PUNTAJE |
| CK_Pago_Concepto | CK_PAGO_CONCEPTO |
| CK_Pago_Estado | CK_PAGO_ESTADO |
| CK_Pago_Monto | CK_PAGO_MONTO |
| CK_Parentesco_Lista | CK_PARENTESCO_LISTA |
| CK_Programa_SoloDos | CK_PROGRAMA_SOLO_DOS |
| CK_ROL_Codigos | CK_ROL_CODIGOS |
| CK_Seguridad_V41_Version | CK_SEGURIDAD_USUARIO_VERSION |
| CK_Solicitud_V41_Estado | CK_SOLICITUD_CONTACTO_ESTADO |
| CK_Solicitud_V41_Tipo | CK_SOLICITUD_CONTACTO_TIPO |
| CK_TIPO_BLOQUE_Codigos | CK_TIPO_BLOQUE_CODIGOS |
| CK_Turno_DosOpciones | CK_TURNO_DOS_OPCIONES |
| CK_Usuario_CorreoVerificado | CK_USUARIO_CORREO_VERIFICADO |
| CK_Usuario_Rol | CK_USUARIO_ROL |
| CK_V4_ALUMNO_Cel_Alu | CK_ALUMNO_CELULAR |
| CK_V4_ALUMNO_Cel_Apoderado | CK_ALUMNO_CELULAR_APODERADO |
| CK_V4_Docente_Cel_Doc | CK_DOCENTE_CELULAR |
| DF_ALUMNO_EsPrueba | DF_ALUMNO_ES_PRUEBA |
| DF_Alumno_Estado_V41_Fecha | DF_ESTADO_ALUMNO_FECHA_EVENTO |
| DF_Auditoria_V4_Fecha | DF_AUDITORIA_SISTEMA_FECHA_EVENTO |
| DF_Aula_Activa | DF_AULA_ACTIVO |
| DF_Ciclo_Precio | DF_CICLO_PRECIO_MENSUAL |
| DF_Codigo_V41_Consumido | DF_CODIGO_CUENTA_CONSUMIDO |
| DF_Codigo_V41_Creado | DF_CODIGO_CUENTA_FECHA_CREACION |
| DF_Codigo_V41_Intentos | DF_CODIGO_CUENTA_INTENTOS |
| DF_Contacto_V41_Activo | DF_CONTACTO_VERIFICADO_ACTIVO |
| DF_Contacto_V41_Fecha | DF_CONTACTO_VERIFICADO_VERIFICADO |
| DF_Control_V4_Fecha | DF_CONTROL_MIGRACION_FECHA_EVENTO |
| DF_Cursos_Activa | DF_CURSO_ACTIVO |
| DF_Docente_Activo | DF_DOCENTE_ACTIVO |
| DF_Examen_Activo | DF_SIMULACRO_ACTIVO |
| DF_ExamenGrupo_Estado | DF_SIMULACRO_HORARIO_ESTADO |
| DF_ExamenGrupo_Publicado | DF_SIMULACRO_HORARIO_PUBLICADO |
| DF_Grupo_Activo | DF_HORARIO_ACADEMICO_ACTIVO |
| DF_Grupo_EstadoHorario | DF_HORARIO_ACADEMICO_ESTADO_HORARIO |
| DF_Grupo_VersionHorario | DF_HORARIO_ACADEMICO_VERSION_HORARIO |
| DF_Horario_Activo | DF_BLOQUE_HORARIO_ACTIVO |
| DF_Horario_Excepcion | DF_BLOQUE_HORARIO_EXCEPCION_TURNO |
| DF_Matricula_Fecha | DF_MATRICULA_FECHA_MATRICULA |
| DF_MEDIO_PAGO_Activo | DF_MEDIO_PAGO_ACTIVO |
| DF_Nota_Estado_V41_Fecha | DF_ESTADO_RESULTADO_FECHA_EVENTO |
| DF_Nota_Fecha | DF_RESULTADO_SIMULACRO_FECHA_REGISTRO |
| DF_Programa_Activo | DF_PROGRAMA_ACTIVO |
| DF_Seguridad_V41_Activacion | DF_SEGURIDAD_USUARIO_ACTIVACION_REQUERIDA |
| DF_Seguridad_V41_Version | DF_SEGURIDAD_USUARIO_VERSION_SESION |
| DF_Solicitud_V41_Creado | DF_SOLICITUD_CONTACTO_FECHA_CREACION |
| DF_Usuario_Activo | DF_USUARIO_ACTIVO |
| DF_Usuario_Cambiar | DF_USUARIO_DEBE_CAMBIAR_CLAVE |
| DF_Usuario_CorreoVerificado | DF_USUARIO_CORREO_VERIFICADO |
| Ciclo_ESTADO_CICLO | FK_CICLO_ESTADO_CICLO |
| Docente_Asignatura_Docente | FK_CURSO_DOCENTE_DOCENTE |
| Examen_Grupo_ESTADO_EXAMEN_GRUPO | FK_SIMULACRO_HORARIO_ESTADO_SIMULACRO |
| Examen_Grupo_Examen | FK_SIMULACRO_HORARIO_SIMULACRO |
| Examen_Grupo_Grupo | FK_SIMULACRO_HORARIO_HORARIO_ACADEMICO |
| FK_Alumno_Carrera | FK_ALUMNO_CARRERA |
| FK_Alumno_Estado_V41_Alumno | FK_ESTADO_ALUMNO_ALUMNO |
| FK_Alumno_Estado_V41_Usuario | FK_ESTADO_ALUMNO_USUARIO |
| FK_Alumno_Parentesco | FK_ALUMNO_PARENTESCO |
| FK_Auditoria_V4_Usuario | FK_AUDITORIA_SISTEMA_USUARIO |
| FK_Ciclo_Programa | FK_CICLO_PROGRAMA |
| FK_Codigo_V41_Usuario | FK_CODIGO_CUENTA_USUARIO |
| FK_Contacto_V41_Alumno | FK_CONTACTO_VERIFICADO_ALUMNO |
| FK_Contacto_V41_Usuario | FK_CONTACTO_VERIFICADO_USUARIO |
| FK_DA_Curso | FK_CURSO_DOCENTE_CURSO |
| FK_Horario_Autorizador | FK_BLOQUE_HORARIO_USUARIO |
| FK_Nota_Estado_V41_Nota | FK_ESTADO_RESULTADO_RESULTADO_SIMULACRO |
| FK_Nota_Estado_V41_Usuario | FK_ESTADO_RESULTADO_USUARIO |
| FK_Seguridad_V41_Usuario | FK_SEGURIDAD_USUARIO_USUARIO |
| FK_Solicitud_V41_Alumno | FK_SOLICITUD_CONTACTO_ALUMNO |
| FK_Solicitud_V41_Codigo | FK_SOLICITUD_CONTACTO_CODIGO_CUENTA |
| FK_Solicitud_V41_Usuario | FK_SOLICITUD_CONTACTO_USUARIO |
| FK_V4_Pago_Medio | FK_PAGO_MEDIO_PAGO |
| Grupo_Aula | FK_HORARIO_ACADEMICO_AULA |
| Grupo_Ciclo | FK_HORARIO_ACADEMICO_CICLO |
| Grupo_Turno | FK_HORARIO_ACADEMICO_TURNO |
| Horario_Docente_Asignatura | FK_BLOQUE_HORARIO_CURSO_DOCENTE |
| Horario_Grupo | FK_BLOQUE_HORARIO_HORARIO_ACADEMICO |
| Horario_TIPO_BLOQUE | FK_BLOQUE_HORARIO_TIPO_BLOQUE |
| MATRICULA_ALUMNO | FK_MATRICULA_ALUMNO |
| MATRICULA_ESTADO_MATRICULA | FK_MATRICULA_ESTADO_MATRICULA |
| MATRICULA_Grupo | FK_MATRICULA_HORARIO_ACADEMICO |
| Nota_Examen_Examen_Grupo | FK_RESULTADO_SIMULACRO_SIMULACRO_HORARIO |
| Nota_Examen_MATRICULA | FK_RESULTADO_SIMULACRO_MATRICULA |
| Pago_ALUMNO | FK_PAGO_ALUMNO |
| Pago_CONCEPTO_PAGO | FK_PAGO_CONCEPTO_PAGO |
| Pago_ESTADO_PAGO | FK_PAGO_ESTADO_PAGO |
| Pago_MATRICULA | FK_PAGO_MATRICULA |
| Pago_Usuario | FK_PAGO_USUARIO |
| Usuario_ALUMNO | FK_USUARIO_ALUMNO |
| Usuario_ROL | FK_USUARIO_ROL |
| PK_ALUMNO | PK_ALUMNO |
| PK_Alumno_Estado_V41 | PK_ESTADO_ALUMNO |
| PK_Auditoria_V4 | PK_AUDITORIA_SISTEMA |
| PK_Aula | PK_AULA |
| PK_CARRERA | PK_CARRERA |
| PK_Ciclo | PK_CICLO |
| PK_CONCEPTO_PAGO | PK_CONCEPTO_PAGO |
| PK_Contacto_Verificado_V41 | PK_CONTACTO_VERIFICADO |
| PK_Control_Migracion_V4 | PK_CONTROL_MIGRACION |
| PK_Cuenta_Codigo_V41 | PK_CODIGO_CUENTA |
| PK_CURSOS | PK_CURSO |
| PK_Docente | PK_DOCENTE |
| PK_Docente_Asignatura | PK_CURSO_DOCENTE |
| PK_ESTADO_CICLO | PK_ESTADO_CICLO |
| PK_ESTADO_EXAMEN_GRUPO | PK_ESTADO_SIMULACRO |
| PK_ESTADO_MATRICULA | PK_ESTADO_MATRICULA |
| PK_ESTADO_PAGO | PK_ESTADO_PAGO |
| PK_Examen | PK_SIMULACRO |
| PK_Examen_Grupo | PK_SIMULACRO_HORARIO |
| PK_Grupo | PK_HORARIO_ACADEMICO |
| PK_Horario | PK_BLOQUE_HORARIO |
| PK_Linea_Base_V4 | PK_LINEA_BASE_MIGRACION |
| PK_MATRICULA | PK_MATRICULA |
| PK_MEDIO_PAGO | PK_MEDIO_PAGO |
| PK_Nota_Estado_V41 | PK_ESTADO_RESULTADO |
| PK_Nota_Examen | PK_RESULTADO_SIMULACRO |
| PK_Pago | PK_PAGO |
| PK_PARENTESCO | PK_PARENTESCO |
| PK_Programa | PK_PROGRAMA |
| PK_ROL | PK_ROL |
| PK_Solicitud_Contacto_V41 | PK_SOLICITUD_CONTACTO |
| PK_TIPO_BLOQUE | PK_TIPO_BLOQUE |
| PK_Turno | PK_TURNO |
| PK_Usuario | PK_USUARIO |
| PK_Usuario_Seguridad_V41 | PK_SEGURIDAD_USUARIO |
| UQ_Aula_Nombre | UQ_AULA_NOMBRE_AULA |
| UQ_CARRERA_Nombre | UQ_CARRERA_NOMBRE_CARRERA |
| UQ_Ciclo_Edicion | UQ_CICLO_ID_PROGRAMA_MODALIDAD_FECHA_INICIO |
| UQ_CONCEPTO_PAGO_Nombre | UQ_CONCEPTO_PAGO_NOMBRE_CONCEPTO |
| UQ_CURSOS_Nombre | UQ_CURSO_NOMBRE_CURSO |
| UQ_ESTADO_CICLO_Nombre | UQ_ESTADO_CICLO_NOMBRE_ESTADO |
| UQ_ESTADO_EXAMEN_GRUPO_Nombre | UQ_ESTADO_SIMULACRO_NOMBRE_ESTADO |
| UQ_ESTADO_MATRICULA_Nombre | UQ_ESTADO_MATRICULA_NOMBRE_ESTADO |
| UQ_ESTADO_PAGO_Nombre | UQ_ESTADO_PAGO_NOMBRE_ESTADO |
| UQ_ExamenGrupo_ExamenGrupo | UQ_SIMULACRO_HORARIO_ID_SIMULACRO_ID_HORARIO_ACADEMICO |
| UQ_ExamenGrupo_IdGrupo | UQ_SIMULACRO_HORARIO_ID_SIMULACRO_HORARIO_ID_HORARIO_ACADEMICO |
| UQ_Grupo_Ciclo_Nombre | UQ_HORARIO_ACADEMICO_ID_CICLO_NOMBRE_HORARIO |
| UQ_Matricula_Alumno_Grupo | UQ_MATRICULA_DNI_ALUMNO_ID_HORARIO_ACADEMICO |
| UQ_Matricula_IdAlumno | UQ_MATRICULA_ID_MATRICULA_DNI_ALUMNO |
| UQ_Matricula_IdGrupo | UQ_MATRICULA_ID_MATRICULA_ID_HORARIO_ACADEMICO |
| UQ_MEDIO_PAGO_Nombre | UQ_MEDIO_PAGO_NOMBRE_MEDIO_PAGO |
| UQ_Nota_ExamenMatricula | UQ_RESULTADO_SIMULACRO_ID_SIMULACRO_HORARIO_ID_MATRICULA |
| UQ_PARENTESCO_Tipo | UQ_PARENTESCO_PARENTESCO |
| UQ_Programa_Nombre | UQ_PROGRAMA_NOMBRE_PROGRAMA |
| UQ_ROL_Nombre | UQ_ROL_NOMBRE_ROL |
| UQ_TIPO_BLOQUE_Nombre | UQ_TIPO_BLOQUE_NOMBRE_TIPO |
| UQ_Turno_Nombre | UQ_TURNO_NOMBRE_TURNO |
| UQ_Usuario_Nombre | UQ_USUARIO_NOMBRE_USUARIO |
| IX_ALUMNO_APODERADO | IX_ALUMNO_DNI_APODERADO |
| IX_Auditoria_V4_Referencia | IX_AUDITORIA_SISTEMA_ENTIDAD_ID_REGISTRO_ID |
| IX_Auditoria_V41_Fecha | IX_AUDITORIA_SISTEMA_FECHA_EVENTO_ID |
| IX_Codigo_V41_Limites | IX_CODIGO_CUENTA_ID_USUARIO_RESPONSABLE_PROPOSITO_FECHA_CREACION |
| IX_Solicitud_V41_AlumnoFecha | IX_SOLICITUD_CONTACTO_DNI_ALUMNO_FECHA_CREACION |
| IX_V4_Horario_DiaGrupo | IX_BLOQUE_HORARIO_DIA_SEMANA_ID_HORARIO_ACADEMICO_HORA_INICIO |
| IX_V4_Matricula_GrupoEstado | IX_MATRICULA_ID_HORARIO_ACADEMICO_ID_ESTADO_MATRICULA |
| UX_Codigo_V41_Pendiente | UQ_CODIGO_CUENTA_ID_USUARIO_RESPONSABLE_PROPOSITO |
| UX_Contacto_V41_Actual | UQ_CONTACTO_VERIFICADO_DNI_ALUMNO_TIPO |
| UX_Grupo_UnidadPublicada | UQ_HORARIO_ACADEMICO_ID_CICLO_ID_TURNO_ID_AULA |
| UX_Pago_ConceptoUnicoAlumno | UQ_PAGO_DNI_ALUMNO_ID_CONCEPTO |
| UX_Pago_MensualidadMatricula | UQ_PAGO_ID_MATRICULA_NUMERO_MENSUALIDAD |
| UX_Usuario_UnicaCuentaAlumno | UQ_USUARIO_DNI_ALUMNO |
| Seq_Operacion_V4 | SECUENCIA_OPERACION |
