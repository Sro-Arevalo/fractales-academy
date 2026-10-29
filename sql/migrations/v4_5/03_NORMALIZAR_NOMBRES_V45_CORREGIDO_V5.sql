-- V5: SOLAMENTE se ajusta la comparacion de los 19 triggers: normalizar CR en ambas definiciones.
-- NO cambia triggers, reglas ni los comandos de migracion. Probar en base de ensayo y disponer de recuperacion.
-- FRACTALES ACADEMY V4.5 - REVISION V4: normaliza CRLF y comentarios editoriales SOLO EN 19 VALIDACIONES DE TRIGGERS.
-- NO CAMBIA el cuerpo de los triggers ni desactiva ninguna regla SQL. Se requiere un respaldo y prueba de migracion.
-- FRACTALES ACADEMY V4.5 - SCRIPT 03 REVISION V3
-- Corrige solo el filtro de modulos inesperados: omite los esquemas internos de Azure SQL.
-- No elimina objetos ni relaja las verificaciones de objetos propios de la aplicacion.
-- REQUIERE respaldo y prueba previa sobre una copia de la base.

SET NOCOUNT ON; SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN('master','model','msdb','tempdb') THROW 54500,'Confirma servidor y @BaseEsperada.',1;
IF HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','VIEW DEFINITION')<>1 THROW 54501,'Se requiere VIEW DEFINITION para inspeccionar dependencias.',1;
IF OBJECT_ID('dbo.CONTROL_MIGRACION') IS NULL AND OBJECT_ID('dbo.Control_Migracion_V4') IS NULL THROW 54501,'Falta esquema de origen.',1;
BEGIN TRY BEGIN TRAN;
IF OBJECT_ID('dbo.Control_Migracion_V4') IS NOT NULL
BEGIN
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V45_02_MIGRAR') THROW 54501,'Falta 02.',1;
-- Control de modulos previo al renombrado: comparar por nombre y esquema.
-- Se toleran SOLO los triggers/funciones del modelo y los 8 modulos de diagramas.
-- No omitir otros procedimientos, vistas o funciones que puedan depender de nombres antiguos.
IF EXISTS (
    SELECT 1
    FROM sys.sql_modules AS m
    INNER JOIN sys.objects AS o ON o.object_id = m.object_id
    WHERE o.is_ms_shipped = 0
      AND SCHEMA_NAME(o.schema_id) NOT IN (N'sys', N'INFORMATION_SCHEMA')
      AND (SCHEMA_NAME(o.schema_id) <> N'dbo'
       OR o.name COLLATE Latin1_General_100_CI_AS NOT IN (
       N'TR_Horario_Sin_Cruces',
       N'TR_Matricula_CupoMaximo',
       N'TR_Nota_Examen_Puntaje',
       N'TR_Pago_Mes_Valido',
       N'TR_V4_Auditoria_Inmutable',
       N'TR_V4_Ciclo_Historial',
       N'TR_V4_Examen_Maximo',
       N'TR_V4_Grupo_Historial',
       N'TR_V4_Matricula_Historial',
       N'TR_V4_Nota_Unica',
       N'TR_V4_Pago_Obligacion',
       N'TR_V41_Alumno_Contacto',
       N'TR_V43_MarcaPrueba',
       N'TR_V43_Tarifa_Ciclo',
       N'TR_V43_Usuario_Correo',
       N'TR_V44_Grupo_Publicacion',
       N'TR_V44_Matricula_Publicada',
       N'TR_V44_Nota_Eliminar',
       N'TR_V44_Pago_Eliminar',
       N'FN_V45_NORMALIZAR_JSON',
       N'fn_diagramobjects',
       N'sp_alterdiagram',
       N'sp_creatediagram',
       N'sp_dropdiagram',
       N'sp_helpdiagramdefinition',
       N'sp_helpdiagrams',
       N'sp_renamediagram',
       N'sp_upgraddiagrams'
       ))
)
BEGIN
    SELECT SCHEMA_NAME(o.schema_id) AS ESQUEMA,
           o.name AS OBJETO_NO_PREVISTO,
           o.type_desc AS TIPO
    FROM sys.sql_modules AS m
    INNER JOIN sys.objects AS o ON o.object_id = m.object_id
    WHERE o.is_ms_shipped = 0
      AND SCHEMA_NAME(o.schema_id) NOT IN (N'sys', N'INFORMATION_SCHEMA')
      AND (SCHEMA_NAME(o.schema_id) <> N'dbo'
       OR o.name COLLATE Latin1_General_100_CI_AS NOT IN (
       N'TR_Horario_Sin_Cruces',
       N'TR_Matricula_CupoMaximo',
       N'TR_Nota_Examen_Puntaje',
       N'TR_Pago_Mes_Valido',
       N'TR_V4_Auditoria_Inmutable',
       N'TR_V4_Ciclo_Historial',
       N'TR_V4_Examen_Maximo',
       N'TR_V4_Grupo_Historial',
       N'TR_V4_Matricula_Historial',
       N'TR_V4_Nota_Unica',
       N'TR_V4_Pago_Obligacion',
       N'TR_V41_Alumno_Contacto',
       N'TR_V43_MarcaPrueba',
       N'TR_V43_Tarifa_Ciclo',
       N'TR_V43_Usuario_Correo',
       N'TR_V44_Grupo_Publicacion',
       N'TR_V44_Matricula_Publicada',
       N'TR_V44_Nota_Eliminar',
       N'TR_V44_Pago_Eliminar',
       N'FN_V45_NORMALIZAR_JSON',
       N'fn_diagramobjects',
       N'sp_alterdiagram',
       N'sp_creatediagram',
       N'sp_dropdiagram',
       N'sp_helpdiagramdefinition',
       N'sp_helpdiagrams',
       N'sp_renamediagram',
       N'sp_upgraddiagrams'
       ));
    THROW 54503, 'Hay modulos no previstos: revisar listado de resultados y dependencias antes de renombrar.', 1;
END;
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE name NOT IN(N'CK_ALUMNO_DNI',N'CK_ALUMNO_DNI_Apoderado',N'CK_Auditoria_V4_JSON',N'CK_Aula_Capacidad',N'CK_Ciclo_Fechas',N'CK_Ciclo_Modalidad',N'CK_Ciclo_Precio',N'CK_Codigo_V41_Canal',N'CK_Codigo_V41_Fechas',N'CK_Codigo_V41_Hash',N'CK_Codigo_V41_Intentos',N'CK_Codigo_V41_Proposito',N'CK_CONCEPTO_PAGO_Codigos',N'CK_Contacto_V41_Destino',N'CK_Contacto_V41_Metodo',N'CK_Contacto_V41_Tipo',N'CK_Docente_DNI',N'CK_ESTADO_CICLO_Codigos',N'CK_ESTADO_EXAMEN_GRUPO_Codigos',N'CK_ESTADO_MATRICULA_Codigos',N'CK_ESTADO_PAGO_Codigos',N'CK_Examen_Puntaje',N'CK_ExamenGrupo_Duracion',N'CK_ExamenGrupo_Estado',N'CK_Grupo_Cupo',N'CK_Grupo_EstadoHorario',N'CK_Grupo_VersionHorario',N'CK_Horario_Bloque',N'CK_Horario_Dia',N'CK_Horario_Excepcion',N'CK_Horario_Horas',N'CK_MEDIO_PAGO_Codigo',N'CK_Nota_Puntaje',N'CK_Pago_Concepto',N'CK_Pago_Estado',N'CK_Pago_Monto',N'CK_Parentesco_Lista',N'CK_Programa_SoloDos',N'CK_ROL_Codigos',N'CK_Seguridad_V41_Version',N'CK_Solicitud_V41_Estado',N'CK_Solicitud_V41_Tipo',N'CK_TIPO_BLOQUE_Codigos',N'CK_Turno_DosOpciones',N'CK_Usuario_CorreoVerificado',N'CK_Usuario_Rol',N'CK_V4_ALUMNO_Cel_Alu',N'CK_V4_ALUMNO_Cel_Apoderado',N'CK_V4_Docente_Cel_Doc')) THROW 54503,'CHECK adicional: revisar antes del refactor.',1;
IF OBJECT_ID(N'dbo.TR_Horario_Sin_Cruces', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_Horario_Sin_Cruces')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_Horario_Sin_Cruces ON dbo.Horario AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Grupo g ON g.Cod_Grupo=i.Grupo_Cod_Grupo JOIN dbo.Turno t ON t.Cod_Turno=g.Turno_Cod_Turno
    WHERE (i.Hr_Inicio<t.Hr_Inicio OR i.Hr_Fin>t.Hr_Fin) AND
    (i.Excepcion_Turno=0 OR NOT EXISTS(SELECT 1 FROM dbo.Usuario u WHERE u.Cod_Usuario=i.Autorizado_Por AND u.ROL_Cod_Rol=''ADMIN'' AND u.Activo=1)))
    THROW 54430,''Bloque fuera del turno sin excepcion administradora autorizada.'',1;
   IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Grupo gi ON gi.Cod_Grupo=i.Grupo_Cod_Grupo JOIN dbo.Ciclo ci ON ci.Cod_Ciclo=gi.Ciclo_Cod_Ciclo
    JOIN dbo.Horario h WITH(UPDLOCK,HOLDLOCK) ON h.Cod_Horario<>i.Cod_Horario AND h.Dia_Semana=i.Dia_Semana AND i.Hr_Inicio<h.Hr_Fin AND h.Hr_Inicio<i.Hr_Fin
    JOIN dbo.Grupo gh ON gh.Cod_Grupo=h.Grupo_Cod_Grupo JOIN dbo.Ciclo ch ON ch.Cod_Ciclo=gh.Ciclo_Cod_Ciclo
    WHERE (i.Grupo_Cod_Grupo=h.Grupo_Cod_Grupo OR (i.Activo=1 AND h.Activo=1 AND gi.Activo=1 AND gh.Activo=1
      AND ci.Fech_Inicio<=ch.Fech_Fin AND ch.Fech_Inicio<=ci.Fech_Fin AND
      (gi.Aula_Cod_Aula=gh.Aula_Cod_Aula OR i.Docente_Asignatura_Docente_DNI_Doc=h.Docente_Asignatura_Docente_DNI_Doc))))
    THROW 54431,''Cruce de horario: conjunto academico, aula o docente ocupado.'',1;
  END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_Horario_Sin_Cruces; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_Matricula_CupoMaximo', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_Matricula_CupoMaximo')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER TR_Matricula_CupoMaximo
ON MATRICULA AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM (SELECT DISTINCT Grupo_Cod_Grupo FROM inserted) AS gr
        JOIN Grupo AS g ON g.Cod_Grupo = gr.Grupo_Cod_Grupo
        CROSS APPLY (
            SELECT COUNT_BIG(*) AS Cantidad
            FROM MATRICULA AS m
            WHERE m.Grupo_Cod_Grupo = g.Cod_Grupo
              AND m.ESTADO_MATRICULA_Cod_Estado_Matricula = ''ACTIVA''
        ) AS ocupacion
        WHERE ocupacion.Cantidad > g.Cupo_Max
    )
        THROW 51005, ''La cantidad de matriculas activas supera el cupo del grupo.'', 1;
END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_Matricula_CupoMaximo; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_Nota_Examen_Puntaje', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_Nota_Examen_Puntaje')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER TR_Nota_Examen_Puntaje
ON Nota_Examen AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS n
        JOIN Examen_Grupo AS eg ON eg.Cod_examen_grupo = n.Examen_Grupo_Cod_examen_grupo
        JOIN Examen AS e ON e.Cod_Examen = eg.Examen_Cod_Examen
        WHERE n.Puntaje_total > e.puntaje_maximo
    )
        THROW 51004, ''La nota supera el puntaje maximo del simulacro.'', 1;
END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_Nota_Examen_Puntaje; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_Pago_Mes_Valido', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_Pago_Mes_Valido')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER TR_Pago_Mes_Valido
ON Pago AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM inserted AS p
        INNER JOIN MATRICULA AS m ON m.Cod_Matricula = p.MATRICULA_Cod_Matricula
        INNER JOIN Grupo AS g ON g.Cod_Grupo = m.Grupo_Cod_Grupo
        INNER JOIN Ciclo AS c ON c.Cod_Ciclo = g.Ciclo_Cod_Ciclo
        WHERE p.CONCEPTO_PAGO_Cod_Concepto = ''MENSUALIDAD''
          AND p.Nro_Mensualidad > c.Nro_Mensualidades
    )
    BEGIN
        THROW 51001, ''Numero de mensualidad fuera del ciclo del alumno.'', 1;
    END
END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_Pago_Mes_Valido; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V4_Auditoria_Inmutable', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V4_Auditoria_Inmutable')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V4_Auditoria_Inmutable ON dbo.Auditoria_V4 INSTEAD OF UPDATE,DELETE AS
BEGIN SET NOCOUNT ON; THROW 54037,''El historial de auditoria no se puede modificar ni eliminar.'',1; END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V4_Auditoria_Inmutable; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V4_Ciclo_Historial', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V4_Ciclo_Historial')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V4_Ciclo_Historial ON dbo.Ciclo AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Ciclo=i.Cod_Ciclo WHERE (i.Programa_Cod_Programa<>d.Programa_Cod_Programa OR i.Modalidad<>d.Modalidad OR i.Fech_Inicio<>d.Fech_Inicio OR i.Fech_Fin<>d.Fech_Fin OR i.Nro_Mensualidades<>d.Nro_Mensualidades)
 AND EXISTS (SELECT 1 FROM dbo.Grupo g WHERE g.Ciclo_Cod_Ciclo=i.Cod_Ciclo AND (EXISTS (SELECT 1 FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo) OR EXISTS (SELECT 1 FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=g.Cod_Grupo))))
 THROW 54055,''No se puede redefinir una edicion con matriculas u horarios.'',1;
END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V4_Ciclo_Historial; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V4_Examen_Maximo', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V4_Examen_Maximo')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V4_Examen_Maximo ON dbo.Examen AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted e JOIN dbo.Examen_Grupo eg ON eg.Examen_Cod_Examen=e.Cod_Examen JOIN dbo.Nota_Examen n ON n.Examen_Grupo_Cod_examen_grupo=eg.Cod_examen_grupo WHERE n.Puntaje_total>e.puntaje_maximo)
 THROW 54044,''El nuevo maximo es menor que un puntaje registrado.'',1;
END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V4_Examen_Maximo; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V4_Grupo_Historial', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V4_Grupo_Historial')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V4_Grupo_Historial ON dbo.Grupo AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo WHERE i.Ciclo_Cod_Ciclo<>d.Ciclo_Cod_Ciclo AND EXISTS (SELECT 1 FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=i.Cod_Grupo))
 THROW 54052,''No se puede cambiar el ciclo de un grupo con matriculas.'',1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo WHERE (i.Aula_Cod_Aula<>d.Aula_Cod_Aula OR i.Turno_Cod_Turno<>d.Turno_Cod_Turno OR i.Ciclo_Cod_Ciclo<>d.Ciclo_Cod_Ciclo) AND EXISTS (SELECT 1 FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=i.Cod_Grupo))
 THROW 54053,''Reorganice los bloques antes de cambiar aula, turno o ciclo.'',1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.Aula a ON a.Cod_Aula=i.Aula_Cod_Aula WHERE i.Cupo_Max>a.Capacidad OR i.Cupo_Max<(SELECT COUNT_BIG(*) FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=i.Cod_Grupo AND m.ESTADO_MATRICULA_Cod_Estado_Matricula=''ACTIVA''))
 THROW 54054,''Cupo incompatible con aula o matriculas activas.'',1;
END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V4_Grupo_Historial; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V4_Matricula_Historial', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V4_Matricula_Historial')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V4_Matricula_Historial ON dbo.MATRICULA AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Matricula=i.Cod_Matricula WHERE i.ALUMNO_DNI_Alu<>d.ALUMNO_DNI_Alu OR i.Grupo_Cod_Grupo<>d.Grupo_Cod_Grupo OR i.Fech_Matricula<>d.Fech_Matricula)
 THROW 54022,''No se permite reasignar alumno, grupo o fecha de una matricula historica.'',1;
 IF EXISTS (SELECT m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo
 JOIN (SELECT DISTINCT ALUMNO_DNI_Alu FROM inserted) i ON i.ALUMNO_DNI_Alu=m.ALUMNO_DNI_Alu GROUP BY m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo HAVING COUNT_BIG(*)>1)
 THROW 54023,''El alumno ya tiene matricula en este ciclo.'',1;
END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V4_Matricula_Historial; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V4_Nota_Unica', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V4_Nota_Unica')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V4_Nota_Unica ON dbo.Nota_Examen AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Nota=i.Cod_Nota WHERE i.MATRICULA_Cod_Matricula<>d.MATRICULA_Cod_Matricula OR i.Examen_Grupo_Cod_examen_grupo<>d.Examen_Grupo_Cod_examen_grupo OR i.Grupo_Cod_Grupo<>d.Grupo_Cod_Grupo OR i.Fech_registro<>d.Fech_registro)
 THROW 54042,''La correccion de puntaje no puede reasignar su historial.'',1;
 IF EXISTS (SELECT m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen FROM dbo.Nota_Examen n WITH (UPDLOCK,HOLDLOCK) JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula
 JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo
 WHERE eg.Examen_Cod_Examen IN (SELECT e.Examen_Cod_Examen FROM inserted i JOIN dbo.Examen_Grupo e ON e.Cod_examen_grupo=i.Examen_Grupo_Cod_examen_grupo)
 GROUP BY m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen HAVING COUNT_BIG(*)>1)
 THROW 54043,''Solo se permite un puntaje total por alumno y simulacro.'',1;
END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V4_Nota_Unica; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V4_Pago_Obligacion', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V4_Pago_Obligacion')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V4_Pago_Obligacion ON dbo.Pago AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Pago=i.Cod_Pago
 WHERE i.ALUMNO_DNI_Alu<>d.ALUMNO_DNI_Alu OR i.CONCEPTO_PAGO_Cod_Concepto<>d.CONCEPTO_PAGO_Cod_Concepto OR i.Monto<>d.Monto
 OR ISNULL(i.MATRICULA_Cod_Matricula,'''')<>ISNULL(d.MATRICULA_Cod_Matricula,'''') OR ISNULL(i.Nro_Mensualidad,0)<>ISNULL(d.Nro_Mensualidad,0)
 OR ISNULL(i.Fech_Vencimiento,CONVERT(date,''00010101''))<>ISNULL(d.Fech_Vencimiento,CONVERT(date,''00010101'')))
 THROW 54034,''Las obligaciones conservan alumno, concepto, matricula, cuota, importe y vencimiento originales.'',1;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Pago=i.Cod_Pago
 WHERE d.Cod_Pago IS NULL AND i.CONCEPTO_PAGO_Cod_Concepto IN (''MATRICULA_INICIAL'',''MATERIALES'') AND
 (SELECT COUNT_BIG(*) FROM dbo.Pago p WITH (UPDLOCK,HOLDLOCK) WHERE p.ALUMNO_DNI_Alu=i.ALUMNO_DNI_Alu AND p.CONCEPTO_PAGO_Cod_Concepto IN (''MATRICULA_INICIAL'',''MATERIALES''))>1)
 THROW 54035,''El alumno ya tiene un cargo inicial; no duplicar matricula y materiales.'',1;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Pago=i.Cod_Pago WHERE d.Cod_Pago IS NULL AND i.CONCEPTO_PAGO_Cod_Concepto=''MATRICULA_INICIAL'' AND i.Monto<>50)
 THROW 54036,''El cargo de inscripcion inicial nuevo debe ser S/ 50.'',1;
END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V4_Pago_Obligacion; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V41_Alumno_Contacto', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V41_Alumno_Contacto')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V41_Alumno_Contacto ON dbo.ALUMNO AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 UPDATE c SET Activo=0 FROM dbo.Contacto_Verificado_V41 c JOIN inserted i ON i.DNI_Alu=c.ALUMNO_DNI_Alu
 WHERE c.Activo=1 AND ((c.Tipo=''EMAIL'' AND (i.Correo_Alu IS NULL OR c.Destino<>i.Correo_Alu)) OR (c.Tipo=''SMS'' AND (i.Cel_Alu IS NULL OR c.Destino<>i.Cel_Alu)));
END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V41_Alumno_Contacto; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V43_MarcaPrueba', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V43_MarcaPrueba')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V43_MarcaPrueba ON dbo.ALUMNO AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.DNI_Alu=i.DNI_Alu WHERE i.Es_Prueba<>d.Es_Prueba)
    THROW 54305,''La identificacion de prueba solo se establece al crear el estudiante.'',1;
  END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V43_MarcaPrueba; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V43_Tarifa_Ciclo', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V43_Tarifa_Ciclo')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V43_Tarifa_Ciclo ON dbo.Ciclo AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Ciclo=i.Cod_Ciclo WHERE i.Precio_Mensual<>250 AND (d.Cod_Ciclo IS NULL OR d.Precio_Mensual<>i.Precio_Mensual))
    THROW 54309,''La tarifa nueva debe ser S/250 por mensualidad. Las obligaciones historicas se conservan.'',1;
  END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V43_Tarifa_Ciclo; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V43_Usuario_Correo', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V43_Usuario_Correo')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V43_Usuario_Correo ON dbo.Usuario AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Usuario=i.Cod_Usuario
     WHERE (ISNULL(i.Correo_Recuperacion,'''')<>ISNULL(d.Correo_Recuperacion,'''') OR d.Correo_Verificado=0) AND i.Correo_Verificado=1
     AND NOT EXISTS(SELECT 1 FROM dbo.Cuenta_Codigo_V41 c WHERE c.Usuario_Cod_Usuario=i.Cod_Usuario AND c.Proposito=''VERIFICAR_CONTACTO'' AND c.Canal=''EMAIL'' AND c.Destino=i.Correo_Recuperacion AND c.Consumido=1 AND c.Expira>SYSUTCDATETIME()))
    THROW 54309,''El correo de recuperacion debe verificarse con un codigo vigente.'',1;
  END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V43_Usuario_Correo; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V44_Grupo_Publicacion', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V44_Grupo_Publicacion')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V44_Grupo_Publicacion ON dbo.Grupo AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   UPDATE h SET Activo=CASE WHEN i.Estado_Horario=''PUBLICADO'' THEN 1 ELSE 0 END
   FROM dbo.Horario h JOIN inserted i ON i.Cod_Grupo=h.Grupo_Cod_Grupo JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo
   WHERE i.Activo<>d.Activo OR i.Estado_Horario<>d.Estado_Horario;
  END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V44_Grupo_Publicacion; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V44_Matricula_Publicada', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V44_Matricula_Publicada')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V44_Matricula_Publicada ON dbo.MATRICULA AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Matricula=i.Cod_Matricula JOIN dbo.Grupo g ON g.Cod_Grupo=i.Grupo_Cod_Grupo
   WHERE i.ESTADO_MATRICULA_Cod_Estado_Matricula=''ACTIVA'' AND (d.Cod_Matricula IS NULL OR d.ESTADO_MATRICULA_Cod_Estado_Matricula<>''ACTIVA'') AND (g.Estado_Horario<>''PUBLICADO'' OR g.Activo=0))
    THROW 54432,''El horario debe estar activo y publicado para matricular o restaurar la matricula.'',1;
  END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V44_Matricula_Publicada; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V44_Nota_Eliminar', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V44_Nota_Eliminar')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V44_Nota_Eliminar ON dbo.Nota_Examen AFTER DELETE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM deleted n JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula JOIN dbo.ALUMNO a ON a.DNI_Alu=m.ALUMNO_DNI_Alu WHERE a.Es_Prueba=0)
    THROW 54433,''Las notas de personas reales se conservan; utiliza correccion o anulacion auditada.'',1;
  END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V44_Nota_Eliminar; revisar antes de continuar.',1;
IF OBJECT_ID(N'dbo.TR_V44_Pago_Eliminar', N'TR') IS NULL OR ISNULL(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.TR_V44_Pago_Eliminar')), NCHAR(13), N''), N'<TRIGGER NO VISIBLE>') COLLATE Latin1_General_100_BIN2<>REPLACE(N'CREATE   TRIGGER dbo.TR_V44_Pago_Eliminar ON dbo.Pago AFTER DELETE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM deleted d WHERE d.ESTADO_PAGO_Cod_Estado<>''PENDIENTE'' OR d.Fech_Pago IS NOT NULL OR d.Medio_Pago IS NOT NULL OR d.Usuario_Cod_Usuario IS NOT NULL
    OR EXISTS(SELECT 1 FROM dbo.Auditoria_V4 a WHERE a.Entidad=''Pago'' AND a.Codigo=d.Cod_Pago AND a.Accion IN(''CONFIRMAR_PAGO'',''ANULAR_CONFIRMACION'')))
    THROW 54434,''Se conserva todo cobro realizado, incluso si fue revertido.'',1;
  END;', NCHAR(13), N'') COLLATE Latin1_General_100_BIN2 THROW 54503,N'Trigger distinto: TR_V44_Pago_Eliminar; revisar antes de continuar.',1;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_ALUMNO_DNI' AND definition COLLATE Latin1_General_100_BIN2=N'([DNI_Alu] like ''[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_ALUMNO_DNI; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ALUMNO] DROP CONSTRAINT [CK_ALUMNO_DNI];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_ALUMNO_DNI_Apoderado' AND definition COLLATE Latin1_General_100_BIN2=N'([DNI_Apoderado] IS NULL OR [DNI_Apoderado] like ''[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_ALUMNO_DNI_Apoderado; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ALUMNO] DROP CONSTRAINT [CK_ALUMNO_DNI_Apoderado];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Auditoria_V4_JSON' AND definition COLLATE Latin1_General_100_BIN2=N'(([Anterior] IS NULL OR isjson([Anterior])=(1)) AND ([Nuevo] IS NULL OR isjson([Nuevo])=(1)))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Auditoria_V4_JSON; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Auditoria_V4] DROP CONSTRAINT [CK_Auditoria_V4_JSON];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Aula_Capacidad' AND definition COLLATE Latin1_General_100_BIN2=N'([Capacidad]>(0))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Aula_Capacidad; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Aula] DROP CONSTRAINT [CK_Aula_Capacidad];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Ciclo_Fechas' AND definition COLLATE Latin1_General_100_BIN2=N'([Fech_Fin]>[Fech_Inicio])' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Ciclo_Fechas; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Ciclo] DROP CONSTRAINT [CK_Ciclo_Fechas];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Ciclo_Modalidad' AND definition COLLATE Latin1_General_100_BIN2=N'([Modalidad]=''REGULAR'' AND [Nro_Mensualidades]=(4) OR [Modalidad]=''ACELERADO'' AND [Nro_Mensualidades]=(2))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Ciclo_Modalidad; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Ciclo] DROP CONSTRAINT [CK_Ciclo_Modalidad];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Ciclo_Precio' AND definition COLLATE Latin1_General_100_BIN2=N'([Precio_Mensual]>(0))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Ciclo_Precio; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Ciclo] DROP CONSTRAINT [CK_Ciclo_Precio];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Codigo_V41_Canal' AND definition COLLATE Latin1_General_100_BIN2=N'([Canal]=''DIRECTO'' OR [Canal]=''SMS'' OR [Canal]=''EMAIL'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Codigo_V41_Canal; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Cuenta_Codigo_V41] DROP CONSTRAINT [CK_Codigo_V41_Canal];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Codigo_V41_Fechas' AND definition COLLATE Latin1_General_100_BIN2=N'([Expira]>[Creado])' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Codigo_V41_Fechas; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Cuenta_Codigo_V41] DROP CONSTRAINT [CK_Codigo_V41_Fechas];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Codigo_V41_Hash' AND definition COLLATE Latin1_General_100_BIN2=N'(datalength([Codigo_Hash])=(64) AND NOT ([Codigo_Hash]) collate Latin1_General_100_BIN2 like ''%[^0-9a-f]%'' AND datalength([Nonce])=(32) AND NOT ([Nonce]) collate Latin1_General_100_BIN2 like ''%[^0-9a-f]%'' AND ([Desafio_Hash] IS NULL OR datalength([Desafio_Hash])=(64) AND NOT ([Desafio_Hash]) collate Latin1_General_100_BIN2 like ''%[^0-9a-f]%''))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Codigo_V41_Hash; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Cuenta_Codigo_V41] DROP CONSTRAINT [CK_Codigo_V41_Hash];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Codigo_V41_Intentos' AND definition COLLATE Latin1_General_100_BIN2=N'([Intentos]<=(5))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Codigo_V41_Intentos; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Cuenta_Codigo_V41] DROP CONSTRAINT [CK_Codigo_V41_Intentos];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Codigo_V41_Proposito' AND definition COLLATE Latin1_General_100_BIN2=N'([Proposito]=''VERIFICAR_CONTACTO'' OR [Proposito]=''RECUPERACION'' OR [Proposito]=''ACTIVACION'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Codigo_V41_Proposito; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Cuenta_Codigo_V41] DROP CONSTRAINT [CK_Codigo_V41_Proposito];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_CONCEPTO_PAGO_Codigos' AND definition COLLATE Latin1_General_100_BIN2=N'([Cod_Concepto]=''MENSUALIDAD'' OR [Cod_Concepto]=''MATERIALES'' OR [Cod_Concepto]=''MATRICULA_INICIAL'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_CONCEPTO_PAGO_Codigos; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CONCEPTO_PAGO] DROP CONSTRAINT [CK_CONCEPTO_PAGO_Codigos];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Contacto_V41_Destino' AND definition COLLATE Latin1_General_100_BIN2=N'([Tipo]=''SMS'' AND datalength([Destino])=(9) AND NOT ([Destino]) collate Latin1_General_100_BIN2 like ''%[^0-9]%'' OR [Tipo]=''EMAIL'' AND [Destino] like ''%_@_%._%'' AND NOT [Destino] like ''% %'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Contacto_V41_Destino; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Contacto_Verificado_V41] DROP CONSTRAINT [CK_Contacto_V41_Destino];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Contacto_V41_Metodo' AND definition COLLATE Latin1_General_100_BIN2=N'([Metodo]=''PRESENCIAL'' OR [Metodo]=''CODIGO'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Contacto_V41_Metodo; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Contacto_Verificado_V41] DROP CONSTRAINT [CK_Contacto_V41_Metodo];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Contacto_V41_Tipo' AND definition COLLATE Latin1_General_100_BIN2=N'([Tipo]=''SMS'' OR [Tipo]=''EMAIL'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Contacto_V41_Tipo; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Contacto_Verificado_V41] DROP CONSTRAINT [CK_Contacto_V41_Tipo];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Docente_DNI' AND definition COLLATE Latin1_General_100_BIN2=N'([DNI_Doc] like ''[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Docente_DNI; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Docente] DROP CONSTRAINT [CK_Docente_DNI];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_ESTADO_CICLO_Codigos' AND definition COLLATE Latin1_General_100_BIN2=N'([Cod_Estado_Ciclo]=''CANCELADO'' OR [Cod_Estado_Ciclo]=''FINALIZADO'' OR [Cod_Estado_Ciclo]=''ACTIVO'' OR [Cod_Estado_Ciclo]=''PROGRAMADO'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_ESTADO_CICLO_Codigos; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ESTADO_CICLO] DROP CONSTRAINT [CK_ESTADO_CICLO_Codigos];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_ESTADO_EXAMEN_GRUPO_Codigos' AND definition COLLATE Latin1_General_100_BIN2=N'([Cod_Estado_Examen]=''CANCELADO'' OR [Cod_Estado_Examen]=''RENDIDO'' OR [Cod_Estado_Examen]=''PROGRAMADO'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_ESTADO_EXAMEN_GRUPO_Codigos; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ESTADO_EXAMEN_GRUPO] DROP CONSTRAINT [CK_ESTADO_EXAMEN_GRUPO_Codigos];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_ESTADO_MATRICULA_Codigos' AND definition COLLATE Latin1_General_100_BIN2=N'([Cod_Estado_Matricula]=''ANULADA'' OR [Cod_Estado_Matricula]=''RETIRADA'' OR [Cod_Estado_Matricula]=''FINALIZADA'' OR [Cod_Estado_Matricula]=''ACTIVA'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_ESTADO_MATRICULA_Codigos; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ESTADO_MATRICULA] DROP CONSTRAINT [CK_ESTADO_MATRICULA_Codigos];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_ESTADO_PAGO_Codigos' AND definition COLLATE Latin1_General_100_BIN2=N'([Cod_Estado]=''PAGADO'' OR [Cod_Estado]=''PENDIENTE'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_ESTADO_PAGO_Codigos; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ESTADO_PAGO] DROP CONSTRAINT [CK_ESTADO_PAGO_Codigos];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Examen_Puntaje' AND definition COLLATE Latin1_General_100_BIN2=N'([puntaje_maximo]>(0))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Examen_Puntaje; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Examen] DROP CONSTRAINT [CK_Examen_Puntaje];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_ExamenGrupo_Duracion' AND definition COLLATE Latin1_General_100_BIN2=N'([duracion_minutos]>(0))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_ExamenGrupo_Duracion; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Examen_Grupo] DROP CONSTRAINT [CK_ExamenGrupo_Duracion];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_ExamenGrupo_Estado' AND definition COLLATE Latin1_General_100_BIN2=N'([Estado]=[ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen])' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_ExamenGrupo_Estado; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Examen_Grupo] DROP CONSTRAINT [CK_ExamenGrupo_Estado];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Grupo_Cupo' AND definition COLLATE Latin1_General_100_BIN2=N'([Cupo_Max]>(0))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Grupo_Cupo; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Grupo] DROP CONSTRAINT [CK_Grupo_Cupo];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Grupo_EstadoHorario' AND definition COLLATE Latin1_General_100_BIN2=N'([Estado_Horario]=''PUBLICADO'' OR [Estado_Horario]=''BORRADOR'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Grupo_EstadoHorario; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Grupo] DROP CONSTRAINT [CK_Grupo_EstadoHorario];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Grupo_VersionHorario' AND definition COLLATE Latin1_General_100_BIN2=N'([Version_Horario]>(0))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Grupo_VersionHorario; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Grupo] DROP CONSTRAINT [CK_Grupo_VersionHorario];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Horario_Bloque' AND definition COLLATE Latin1_General_100_BIN2=N'([TIPO_BLOQUE_Cod_Tipo]=''CLASE'' AND [Docente_Asignatura_Docente_DNI_Doc] IS NOT NULL AND [Docente_Asignatura_CURSOS_Cod_Curso] IS NOT NULL OR [TIPO_BLOQUE_Cod_Tipo]=''RECREO'' AND [Docente_Asignatura_Docente_DNI_Doc] IS NULL AND [Docente_Asignatura_CURSOS_Cod_Curso] IS NULL)' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Horario_Bloque; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Horario] DROP CONSTRAINT [CK_Horario_Bloque];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Horario_Dia' AND definition COLLATE Latin1_General_100_BIN2=N'([Dia_Semana]>=(1) AND [Dia_Semana]<=(7))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Horario_Dia; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Horario] DROP CONSTRAINT [CK_Horario_Dia];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Horario_Excepcion' AND definition COLLATE Latin1_General_100_BIN2=N'([Excepcion_Turno]=(0) AND [Motivo_Excepcion] IS NULL AND [Autorizado_Por] IS NULL OR [Excepcion_Turno]=(1) AND len(ltrim(rtrim([Motivo_Excepcion])))>=(5) AND [Autorizado_Por] IS NOT NULL)' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Horario_Excepcion; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Horario] DROP CONSTRAINT [CK_Horario_Excepcion];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Horario_Horas' AND definition COLLATE Latin1_General_100_BIN2=N'([Hr_Fin]>[Hr_Inicio])' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Horario_Horas; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Horario] DROP CONSTRAINT [CK_Horario_Horas];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_MEDIO_PAGO_Codigo' AND definition COLLATE Latin1_General_100_BIN2=N'(datalength([Cod_Medio])>=(1) AND datalength([Cod_Medio])<=(10) AND NOT ([Cod_Medio]) collate Latin1_General_100_BIN2 like ''%[^A-Z0-9_-]%'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_MEDIO_PAGO_Codigo; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[MEDIO_PAGO] DROP CONSTRAINT [CK_MEDIO_PAGO_Codigo];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Nota_Puntaje' AND definition COLLATE Latin1_General_100_BIN2=N'([puntaje_total]>=(0))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Nota_Puntaje; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Nota_Examen] DROP CONSTRAINT [CK_Nota_Puntaje];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Pago_Concepto' AND definition COLLATE Latin1_General_100_BIN2=N'(([CONCEPTO_PAGO_Cod_Concepto]=''MATERIALES'' OR [CONCEPTO_PAGO_Cod_Concepto]=''MATRICULA_INICIAL'') AND [MATRICULA_Cod_Matricula] IS NULL AND [Nro_Mensualidad] IS NULL OR [CONCEPTO_PAGO_Cod_Concepto]=''MENSUALIDAD'' AND [MATRICULA_Cod_Matricula] IS NOT NULL AND ([Nro_Mensualidad]>=(1) AND [Nro_Mensualidad]<=(4)))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Pago_Concepto; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Pago] DROP CONSTRAINT [CK_Pago_Concepto];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Pago_Estado' AND definition COLLATE Latin1_General_100_BIN2=N'([ESTADO_PAGO_Cod_Estado]=''PENDIENTE'' AND [Fech_Pago] IS NULL AND [Medio_Pago] IS NULL AND [Usuario_Cod_Usuario] IS NULL OR [ESTADO_PAGO_Cod_Estado]=''PAGADO'' AND [Fech_Pago] IS NOT NULL AND [Medio_Pago] IS NOT NULL AND [Usuario_Cod_Usuario] IS NOT NULL)' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Pago_Estado; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Pago] DROP CONSTRAINT [CK_Pago_Estado];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Pago_Monto' AND definition COLLATE Latin1_General_100_BIN2=N'([Monto]>(0))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Pago_Monto; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Pago] DROP CONSTRAINT [CK_Pago_Monto];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Parentesco_Lista' AND definition COLLATE Latin1_General_100_BIN2=N'([Cod_Paren]=''OTRO'' OR [Cod_Paren]=''TUTOR'' OR [Cod_Paren]=''ABUEL'' OR [Cod_Paren]=''HERM'' OR [Cod_Paren]=''TIO'' OR [Cod_Paren]=''MADRE'' OR [Cod_Paren]=''PADRE'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Parentesco_Lista; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[PARENTESCO] DROP CONSTRAINT [CK_Parentesco_Lista];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Programa_SoloDos' AND definition COLLATE Latin1_General_100_BIN2=N'([Cod_Programa]=''PREUNIV'' OR [Cod_Programa]=''REFUERZO'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Programa_SoloDos; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Programa] DROP CONSTRAINT [CK_Programa_SoloDos];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_ROL_Codigos' AND definition COLLATE Latin1_General_100_BIN2=N'([Cod_Rol]=''ALUMNO'' OR [Cod_Rol]=''ADMIN'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_ROL_Codigos; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ROL] DROP CONSTRAINT [CK_ROL_Codigos];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Seguridad_V41_Version' AND definition COLLATE Latin1_General_100_BIN2=N'([Version_Sesion]>=(0))' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Seguridad_V41_Version; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Usuario_Seguridad_V41] DROP CONSTRAINT [CK_Seguridad_V41_Version];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Solicitud_V41_Estado' AND definition COLLATE Latin1_General_100_BIN2=N'([Estado]=''REEMPLAZADA'' OR [Estado]=''RECHAZADA'' OR [Estado]=''APROBADA'' OR [Estado]=''VERIFICADA'' OR [Estado]=''PENDIENTE_ADMIN'' OR [Estado]=''PENDIENTE'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Solicitud_V41_Estado; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Solicitud_Contacto_V41] DROP CONSTRAINT [CK_Solicitud_V41_Estado];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Solicitud_V41_Tipo' AND definition COLLATE Latin1_General_100_BIN2=N'([Tipo]=''SMS'' OR [Tipo]=''EMAIL'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Solicitud_V41_Tipo; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Solicitud_Contacto_V41] DROP CONSTRAINT [CK_Solicitud_V41_Tipo];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_TIPO_BLOQUE_Codigos' AND definition COLLATE Latin1_General_100_BIN2=N'([Cod_Tipo]=''RECREO'' OR [Cod_Tipo]=''CLASE'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_TIPO_BLOQUE_Codigos; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[TIPO_BLOQUE] DROP CONSTRAINT [CK_TIPO_BLOQUE_Codigos];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Turno_DosOpciones' AND definition COLLATE Latin1_General_100_BIN2=N'([Cod_Turno]=''MANANA'' AND [Nomb_Turno]=''MANANA'' AND [Hr_Inicio]=''07:00'' AND [Hr_Fin]=''13:00'' OR [Cod_Turno]=''TARDE'' AND [Nomb_Turno]=''TARDE'' AND [Hr_Inicio]=''15:00'' AND [Hr_Fin]=''21:00'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Turno_DosOpciones; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Turno] DROP CONSTRAINT [CK_Turno_DosOpciones];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Usuario_CorreoVerificado' AND definition COLLATE Latin1_General_100_BIN2=N'([Correo_Verificado]=(0) OR [Correo_Recuperacion] IS NOT NULL)' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Usuario_CorreoVerificado; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Usuario] DROP CONSTRAINT [CK_Usuario_CorreoVerificado];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Usuario_Rol' AND definition COLLATE Latin1_General_100_BIN2=N'([ROL_Cod_Rol]=''ADMIN'' AND [ALUMNO_DNI_Alu] IS NULL OR [ROL_Cod_Rol]=''ALUMNO'' AND [ALUMNO_DNI_Alu] IS NOT NULL)' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_Usuario_Rol; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Usuario] DROP CONSTRAINT [CK_Usuario_Rol];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_V4_ALUMNO_Cel_Alu' AND definition COLLATE Latin1_General_100_BIN2=N'([Cel_Alu] IS NULL OR datalength([Cel_Alu])=(9) AND NOT ([Cel_Alu]) collate Latin1_General_100_BIN2 like ''%[^0-9]%'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_V4_ALUMNO_Cel_Alu; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ALUMNO] DROP CONSTRAINT [CK_V4_ALUMNO_Cel_Alu];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_V4_ALUMNO_Cel_Apoderado' AND definition COLLATE Latin1_General_100_BIN2=N'([Cel_Apoderado] IS NULL OR datalength([Cel_Apoderado])=(9) AND NOT ([Cel_Apoderado]) collate Latin1_General_100_BIN2 like ''%[^0-9]%'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_V4_ALUMNO_Cel_Apoderado; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ALUMNO] DROP CONSTRAINT [CK_V4_ALUMNO_Cel_Apoderado];';
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=N'CK_V4_Docente_Cel_Doc' AND definition COLLATE Latin1_General_100_BIN2=N'(datalength([Cel_Doc])=(9) AND NOT ([Cel_Doc]) collate Latin1_General_100_BIN2 like ''%[^0-9]%'')' COLLATE Latin1_General_100_BIN2) THROW 54503,N'Definicion CHECK distinta: CK_V4_Docente_Cel_Doc; revisar diagnostico antes de continuar.',1;
EXEC sys.sp_executesql N'ALTER TABLE dbo.[Docente] DROP CONSTRAINT [CK_V4_Docente_Cel_Doc];';
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Cuenta_Codigo_V41') AND name=N'UX_Codigo_V41_Pendiente' AND filter_definition COLLATE Latin1_General_100_BIN2=N'([Consumido]=(0))' COLLATE Latin1_General_100_BIN2) THROW 54503,'Indice filtrado distinto; revisar antes de renombrar.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Contacto_Verificado_V41') AND name=N'UX_Contacto_V41_Actual' AND filter_definition COLLATE Latin1_General_100_BIN2=N'([Activo]=(1))' COLLATE Latin1_General_100_BIN2) THROW 54503,'Indice filtrado distinto; revisar antes de renombrar.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Grupo') AND name=N'UX_Grupo_UnidadPublicada' AND filter_definition COLLATE Latin1_General_100_BIN2=N'([Activo]=(1) AND [Estado_Horario]=''PUBLICADO'')' COLLATE Latin1_General_100_BIN2) THROW 54503,'Indice filtrado distinto; revisar antes de renombrar.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Pago') AND name=N'UX_Pago_ConceptoUnicoAlumno' AND filter_definition COLLATE Latin1_General_100_BIN2=N'([CONCEPTO_PAGO_Cod_Concepto] IN (''MATRICULA_INICIAL'', ''MATERIALES''))' COLLATE Latin1_General_100_BIN2) THROW 54503,'Indice filtrado distinto; revisar antes de renombrar.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Pago') AND name=N'UX_Pago_MensualidadMatricula' AND filter_definition COLLATE Latin1_General_100_BIN2=N'([CONCEPTO_PAGO_Cod_Concepto]=''MENSUALIDAD'')' COLLATE Latin1_General_100_BIN2) THROW 54503,'Indice filtrado distinto; revisar antes de renombrar.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Usuario') AND name=N'UX_Usuario_UnicaCuentaAlumno' AND filter_definition COLLATE Latin1_General_100_BIN2=N'([ALUMNO_DNI_Alu] IS NOT NULL)' COLLATE Latin1_General_100_BIN2) THROW 54503,'Indice filtrado distinto; revisar antes de renombrar.',1;
EXEC sys.sp_executesql N'DROP INDEX [UX_Codigo_V41_Pendiente] ON dbo.[Cuenta_Codigo_V41];';
EXEC sys.sp_executesql N'DROP INDEX [UX_Contacto_V41_Actual] ON dbo.[Contacto_Verificado_V41];';
EXEC sys.sp_executesql N'DROP INDEX [UX_Grupo_UnidadPublicada] ON dbo.[Grupo];';
EXEC sys.sp_executesql N'DROP INDEX [UX_Pago_ConceptoUnicoAlumno] ON dbo.[Pago];';
EXEC sys.sp_executesql N'DROP INDEX [UX_Pago_MensualidadMatricula] ON dbo.[Pago];';
EXEC sys.sp_executesql N'DROP INDEX [UX_Usuario_UnicaCuentaAlumno] ON dbo.[Usuario];';
IF OBJECT_ID(N'dbo.ALUMNO','U') IS NULL THROW 54503,N'Falta tabla origen ALUMNO',1;
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.DNI_Alu',@newname=N'DNI_ALUMNO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.Nomb_Alu',@newname=N'NOMBRE_COMPLETO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.Correo_Alu',@newname=N'CORREO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.Fech_Nac',@newname=N'FECHA_NACIMIENTO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.Cel_Alu',@newname=N'CELULAR',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.Dir_Alu',@newname=N'DIRECCION',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.Nomb_Apoderado',@newname=N'NOMBRE_APODERADO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.DNI_Apoderado',@newname=N'DNI_APODERADO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.Cel_Apoderado',@newname=N'CELULAR_APODERADO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.Correo_Apoderado',@newname=N'CORREO_APODERADO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.PARENTESCO_Cod_Paren',@newname=N'ID_PARENTESCO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.CARRERA_Cod_Carrera',@newname=N'ID_CARRERA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.Es_Prueba',@newname=N'ES_PRUEBA',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Alumno_Estado_V41','U') IS NULL THROW 54503,N'Falta tabla origen Alumno_Estado_V41',1;
EXEC sys.sp_rename @objname=N'dbo.Alumno_Estado_V41',@newname=N'ESTADO_ALUMNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_ALUMNO.ALUMNO_DNI_Alu',@newname=N'DNI_ALUMNO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_ALUMNO.Activo',@newname=N'ACTIVO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_ALUMNO.Usuario_Activo_Anterior',@newname=N'ACCESO_ACTIVO_ANTERIOR',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_ALUMNO.Motivo',@newname=N'MOTIVO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_ALUMNO.Usuario_Cod_Usuario',@newname=N'ID_USUARIO_RESPONSABLE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_ALUMNO.Fecha',@newname=N'FECHA_EVENTO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Auditoria_V4','U') IS NULL THROW 54503,N'Falta tabla origen Auditoria_V4',1;
EXEC sys.sp_rename @objname=N'dbo.Auditoria_V4',@newname=N'AUDITORIA_SISTEMA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.AUDITORIA_SISTEMA.Id',@newname=N'ID',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.AUDITORIA_SISTEMA.Entidad',@newname=N'ENTIDAD',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.AUDITORIA_SISTEMA.Codigo',@newname=N'ID_REGISTRO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.AUDITORIA_SISTEMA.Accion',@newname=N'ACCION',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.AUDITORIA_SISTEMA.Anterior',@newname=N'DATOS_ANTERIORES',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.AUDITORIA_SISTEMA.Nuevo',@newname=N'DATOS_NUEVOS',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.AUDITORIA_SISTEMA.Usuario_Cod_Usuario',@newname=N'ID_USUARIO_RESPONSABLE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.AUDITORIA_SISTEMA.Motivo',@newname=N'MOTIVO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.AUDITORIA_SISTEMA.Fecha',@newname=N'FECHA_EVENTO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Aula','U') IS NULL THROW 54503,N'Falta tabla origen Aula',1;
EXEC sys.sp_rename @objname=N'dbo.Aula',@newname=N'AULA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.AULA.Cod_Aula',@newname=N'ID_AULA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.AULA.Nomb_Aula',@newname=N'NOMBRE_AULA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.AULA.Capacidad',@newname=N'CAPACIDAD',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.AULA.Activa',@newname=N'ACTIVO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.CARRERA','U') IS NULL THROW 54503,N'Falta tabla origen CARRERA',1;
EXEC sys.sp_rename @objname=N'dbo.CARRERA.Cod_Carrera',@newname=N'ID_CARRERA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CARRERA.Nomb_Carrera',@newname=N'NOMBRE_CARRERA',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Ciclo','U') IS NULL THROW 54503,N'Falta tabla origen Ciclo',1;
EXEC sys.sp_rename @objname=N'dbo.Ciclo',@newname=N'CICLO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.CICLO.Cod_Ciclo',@newname=N'ID_CICLO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CICLO.Programa_Cod_Programa',@newname=N'ID_PROGRAMA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CICLO.Nomb_Ciclo',@newname=N'NOMBRE_CICLO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CICLO.Modalidad',@newname=N'MODALIDAD',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CICLO.Fech_Inicio',@newname=N'FECHA_INICIO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CICLO.Fech_Fin',@newname=N'FECHA_FIN',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CICLO.Nro_Mensualidades',@newname=N'NUMERO_MENSUALIDADES',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CICLO.Precio_Mensual',@newname=N'PRECIO_MENSUAL',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CICLO.ESTADO_CICLO_Cod_Estado',@newname=N'ID_ESTADO_CICLO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.CONCEPTO_PAGO','U') IS NULL THROW 54503,N'Falta tabla origen CONCEPTO_PAGO',1;
EXEC sys.sp_rename @objname=N'dbo.CONCEPTO_PAGO.Cod_Concepto',@newname=N'ID_CONCEPTO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CONCEPTO_PAGO.Nomb_Concepto',@newname=N'NOMBRE_CONCEPTO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Contacto_Verificado_V41','U') IS NULL THROW 54503,N'Falta tabla origen Contacto_Verificado_V41',1;
EXEC sys.sp_rename @objname=N'dbo.Contacto_Verificado_V41',@newname=N'CONTACTO_VERIFICADO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.CONTACTO_VERIFICADO.Id',@newname=N'ID',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CONTACTO_VERIFICADO.ALUMNO_DNI_Alu',@newname=N'DNI_ALUMNO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CONTACTO_VERIFICADO.Tipo',@newname=N'TIPO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CONTACTO_VERIFICADO.Destino',@newname=N'DESTINO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CONTACTO_VERIFICADO.Activo',@newname=N'ACTIVO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CONTACTO_VERIFICADO.Metodo',@newname=N'METODO_VERIFICACION',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CONTACTO_VERIFICADO.Usuario_Cod_Usuario',@newname=N'ID_USUARIO_RESPONSABLE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CONTACTO_VERIFICADO.Verificado',@newname=N'VERIFICADO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Control_Migracion_V4','U') IS NULL THROW 54503,N'Falta tabla origen Control_Migracion_V4',1;
EXEC sys.sp_rename @objname=N'dbo.Control_Migracion_V4',@newname=N'CONTROL_MIGRACION',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.CONTROL_MIGRACION.Script',@newname=N'SCRIPT',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CONTROL_MIGRACION.Fecha',@newname=N'FECHA_EVENTO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Cuenta_Codigo_V41','U') IS NULL THROW 54503,N'Falta tabla origen Cuenta_Codigo_V41',1;
EXEC sys.sp_rename @objname=N'dbo.Cuenta_Codigo_V41',@newname=N'CODIGO_CUENTA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.Id',@newname=N'ID',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.Usuario_Cod_Usuario',@newname=N'ID_USUARIO_RESPONSABLE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.Proposito',@newname=N'PROPOSITO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.Canal',@newname=N'CANAL',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.Destino',@newname=N'DESTINO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.Nonce',@newname=N'NONCE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.Codigo_Hash',@newname=N'CODIGO_HASH',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.Desafio_Hash',@newname=N'DESAFIO_HASH',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.Expira',@newname=N'FECHA_VENCIMIENTO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.Intentos',@newname=N'INTENTOS',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.Consumido',@newname=N'CONSUMIDO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.Creado',@newname=N'FECHA_CREACION',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.CURSOS','U') IS NULL THROW 54503,N'Falta tabla origen CURSOS',1;
EXEC sys.sp_rename @objname=N'dbo.CURSOS',@newname=N'CURSO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.CURSO.Cod_Curso',@newname=N'ID_CURSO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CURSO.Nomb_Curso',@newname=N'NOMBRE_CURSO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CURSO.Activa',@newname=N'ACTIVO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Docente','U') IS NULL THROW 54503,N'Falta tabla origen Docente',1;
EXEC sys.sp_rename @objname=N'dbo.Docente',@newname=N'DOCENTE',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DOCENTE.DNI_Doc',@newname=N'DNI_DOCENTE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.DOCENTE.Nom_Doc',@newname=N'NOMBRE_COMPLETO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.DOCENTE.Cel_Doc',@newname=N'CELULAR',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.DOCENTE.Especialidad',@newname=N'ESPECIALIDAD',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.DOCENTE.Activo',@newname=N'ACTIVO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Docente_Asignatura','U') IS NULL THROW 54503,N'Falta tabla origen Docente_Asignatura',1;
EXEC sys.sp_rename @objname=N'dbo.Docente_Asignatura',@newname=N'CURSO_DOCENTE',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.CURSO_DOCENTE.CURSOS_Cod_Curso',@newname=N'ID_CURSO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.CURSO_DOCENTE.Docente_DNI_Doc',@newname=N'DNI_DOCENTE',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.ESTADO_CICLO','U') IS NULL THROW 54503,N'Falta tabla origen ESTADO_CICLO',1;
EXEC sys.sp_rename @objname=N'dbo.ESTADO_CICLO.Cod_Estado_Ciclo',@newname=N'ID_ESTADO_CICLO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_CICLO.Nomb_Estado_Ciclo',@newname=N'NOMBRE_ESTADO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.ESTADO_EXAMEN_GRUPO','U') IS NULL THROW 54503,N'Falta tabla origen ESTADO_EXAMEN_GRUPO',1;
EXEC sys.sp_rename @objname=N'dbo.ESTADO_EXAMEN_GRUPO',@newname=N'ESTADO_SIMULACRO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_SIMULACRO.Cod_Estado_Examen',@newname=N'ID_ESTADO_SIMULACRO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_SIMULACRO.Nomb_Estado_Examen',@newname=N'NOMBRE_ESTADO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.ESTADO_MATRICULA','U') IS NULL THROW 54503,N'Falta tabla origen ESTADO_MATRICULA',1;
EXEC sys.sp_rename @objname=N'dbo.ESTADO_MATRICULA.Cod_Estado_Matricula',@newname=N'ID_ESTADO_MATRICULA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_MATRICULA.Nomb_Estado_Matricula',@newname=N'NOMBRE_ESTADO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.ESTADO_PAGO','U') IS NULL THROW 54503,N'Falta tabla origen ESTADO_PAGO',1;
EXEC sys.sp_rename @objname=N'dbo.ESTADO_PAGO.Cod_Estado',@newname=N'ID_ESTADO_PAGO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_PAGO.Nomb_Estado',@newname=N'NOMBRE_ESTADO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Examen','U') IS NULL THROW 54503,N'Falta tabla origen Examen',1;
EXEC sys.sp_rename @objname=N'dbo.Examen',@newname=N'SIMULACRO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO.Cod_Examen',@newname=N'ID_SIMULACRO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO.Nomb_Examen',@newname=N'NOMBRE_SIMULACRO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO.Descripcion',@newname=N'DESCRIPCION',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO.puntaje_maximo',@newname=N'PUNTAJE_MAXIMO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO.activo',@newname=N'ACTIVO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Examen_Grupo','U') IS NULL THROW 54503,N'Falta tabla origen Examen_Grupo',1;
EXEC sys.sp_rename @objname=N'dbo.Examen_Grupo',@newname=N'SIMULACRO_HORARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO_HORARIO.Cod_examen_grupo',@newname=N'ID_SIMULACRO_HORARIO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO_HORARIO.Fech_programada',@newname=N'FECHA_PROGRAMADA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO_HORARIO.Hr_inicio',@newname=N'HORA_INICIO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO_HORARIO.Duracion_minutos',@newname=N'DURACION_MINUTOS',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO_HORARIO.Estado',@newname=N'ESTADO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO_HORARIO.Publicado',@newname=N'PUBLICADO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO_HORARIO.Examen_Cod_Examen',@newname=N'ID_SIMULACRO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO_HORARIO.Grupo_Cod_Grupo',@newname=N'ID_HORARIO_ACADEMICO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SIMULACRO_HORARIO.ESTADO_EXAMEN_GRUPO_Cod_Estado_Examen',@newname=N'ID_ESTADO_SIMULACRO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Grupo','U') IS NULL THROW 54503,N'Falta tabla origen Grupo',1;
EXEC sys.sp_rename @objname=N'dbo.Grupo',@newname=N'HORARIO_ACADEMICO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.HORARIO_ACADEMICO.Cod_Grupo',@newname=N'ID_HORARIO_ACADEMICO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.HORARIO_ACADEMICO.Nomb_Grupo',@newname=N'NOMBRE_HORARIO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.HORARIO_ACADEMICO.Cupo_Max',@newname=N'CAPACIDAD_MAXIMA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.HORARIO_ACADEMICO.Activo',@newname=N'ACTIVO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.HORARIO_ACADEMICO.Turno_Cod_Turno',@newname=N'ID_TURNO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.HORARIO_ACADEMICO.Aula_Cod_Aula',@newname=N'ID_AULA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.HORARIO_ACADEMICO.Ciclo_Cod_Ciclo',@newname=N'ID_CICLO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.HORARIO_ACADEMICO.Estado_Horario',@newname=N'ESTADO_HORARIO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.HORARIO_ACADEMICO.Version_Horario',@newname=N'VERSION_HORARIO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Horario','U') IS NULL THROW 54503,N'Falta tabla origen Horario',1;
EXEC sys.sp_rename @objname=N'dbo.Horario',@newname=N'BLOQUE_HORARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.Cod_Horario',@newname=N'ID_BLOQUE_HORARIO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.Dia_Semana',@newname=N'DIA_SEMANA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.Hr_Inicio',@newname=N'HORA_INICIO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.Hr_Fin',@newname=N'HORA_FIN',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.Activo',@newname=N'ACTIVO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.Grupo_Cod_Grupo',@newname=N'ID_HORARIO_ACADEMICO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.TIPO_BLOQUE_Cod_Tipo',@newname=N'ID_TIPO_BLOQUE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.Docente_Asignatura_CURSOS_Cod_Curso',@newname=N'ID_CURSO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.Docente_Asignatura_Docente_DNI_Doc',@newname=N'DNI_DOCENTE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.Excepcion_Turno',@newname=N'EXCEPCION_TURNO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.Motivo_Excepcion',@newname=N'MOTIVO_EXCEPCION',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.Autorizado_Por',@newname=N'ID_USUARIO_AUTORIZADOR',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Linea_Base_V4','U') IS NULL THROW 54503,N'Falta tabla origen Linea_Base_V4',1;
EXEC sys.sp_rename @objname=N'dbo.Linea_Base_V4',@newname=N'LINEA_BASE_MIGRACION',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.LINEA_BASE_MIGRACION.Tabla',@newname=N'NOMBRE_TABLA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.LINEA_BASE_MIGRACION.Clave',@newname=N'CLAVE_REGISTRO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.LINEA_BASE_MIGRACION.Huella',@newname=N'HUELLA',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.MATRICULA','U') IS NULL THROW 54503,N'Falta tabla origen MATRICULA',1;
EXEC sys.sp_rename @objname=N'dbo.MATRICULA.ALUMNO_DNI_Alu',@newname=N'DNI_ALUMNO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.MATRICULA.Cod_Matricula',@newname=N'ID_MATRICULA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.MATRICULA.ESTADO_MATRICULA_Cod_Estado_Matricula',@newname=N'ID_ESTADO_MATRICULA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.MATRICULA.Fech_Matricula',@newname=N'FECHA_MATRICULA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.MATRICULA.Observaciones',@newname=N'OBSERVACIONES',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.MATRICULA.Grupo_Cod_Grupo',@newname=N'ID_HORARIO_ACADEMICO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.MEDIO_PAGO','U') IS NULL THROW 54503,N'Falta tabla origen MEDIO_PAGO',1;
EXEC sys.sp_rename @objname=N'dbo.MEDIO_PAGO.Cod_Medio',@newname=N'ID_MEDIO_PAGO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.MEDIO_PAGO.Nomb_Medio',@newname=N'NOMBRE_MEDIO_PAGO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.MEDIO_PAGO.Activo',@newname=N'ACTIVO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Nota_Estado_V41','U') IS NULL THROW 54503,N'Falta tabla origen Nota_Estado_V41',1;
EXEC sys.sp_rename @objname=N'dbo.Nota_Estado_V41',@newname=N'ESTADO_RESULTADO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_RESULTADO.Nota_Examen_Cod_Nota',@newname=N'ID_RESULTADO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_RESULTADO.Anulada',@newname=N'ANULADO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_RESULTADO.Motivo',@newname=N'MOTIVO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_RESULTADO.Usuario_Cod_Usuario',@newname=N'ID_USUARIO_RESPONSABLE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ESTADO_RESULTADO.Fecha',@newname=N'FECHA_EVENTO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Nota_Examen','U') IS NULL THROW 54503,N'Falta tabla origen Nota_Examen',1;
EXEC sys.sp_rename @objname=N'dbo.Nota_Examen',@newname=N'RESULTADO_SIMULACRO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.RESULTADO_SIMULACRO.Cod_Nota',@newname=N'ID_RESULTADO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.RESULTADO_SIMULACRO.Puntaje_total',@newname=N'PUNTAJE_TOTAL',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.RESULTADO_SIMULACRO.Fech_registro',@newname=N'FECHA_REGISTRO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.RESULTADO_SIMULACRO.MATRICULA_Cod_Matricula',@newname=N'ID_MATRICULA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.RESULTADO_SIMULACRO.Examen_Grupo_Cod_examen_grupo',@newname=N'ID_SIMULACRO_HORARIO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.RESULTADO_SIMULACRO.Grupo_Cod_Grupo',@newname=N'ID_HORARIO_ACADEMICO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Pago','U') IS NULL THROW 54503,N'Falta tabla origen Pago',1;
EXEC sys.sp_rename @objname=N'dbo.Pago',@newname=N'PAGO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PAGO.Cod_Pago',@newname=N'ID_PAGO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PAGO.CONCEPTO_PAGO_Cod_Concepto',@newname=N'ID_CONCEPTO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PAGO.Nro_Mensualidad',@newname=N'NUMERO_MENSUALIDAD',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PAGO.Monto',@newname=N'MONTO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PAGO.Fech_Vencimiento',@newname=N'FECHA_VENCIMIENTO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PAGO.ESTADO_PAGO_Cod_Estado',@newname=N'ID_ESTADO_PAGO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PAGO.Fech_Pago',@newname=N'FECHA_PAGO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PAGO.Medio_Pago',@newname=N'ID_MEDIO_PAGO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PAGO.Usuario_Cod_Usuario',@newname=N'ID_USUARIO_RESPONSABLE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PAGO.ALUMNO_DNI_Alu',@newname=N'DNI_ALUMNO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PAGO.MATRICULA_Cod_Matricula',@newname=N'ID_MATRICULA',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.PARENTESCO','U') IS NULL THROW 54503,N'Falta tabla origen PARENTESCO',1;
EXEC sys.sp_rename @objname=N'dbo.PARENTESCO.Cod_Paren',@newname=N'ID_PARENTESCO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PARENTESCO.Tipo_Paren',@newname=N'PARENTESCO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Programa','U') IS NULL THROW 54503,N'Falta tabla origen Programa',1;
EXEC sys.sp_rename @objname=N'dbo.Programa',@newname=N'PROGRAMA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PROGRAMA.Cod_Programa',@newname=N'ID_PROGRAMA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PROGRAMA.Nomb_Programa',@newname=N'NOMBRE_PROGRAMA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PROGRAMA.Descripcion',@newname=N'DESCRIPCION',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.PROGRAMA.Activo',@newname=N'ACTIVO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.ROL','U') IS NULL THROW 54503,N'Falta tabla origen ROL',1;
EXEC sys.sp_rename @objname=N'dbo.ROL.Cod_Rol',@newname=N'ID_ROL',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.ROL.Nomb_Rol',@newname=N'NOMBRE_ROL',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Solicitud_Contacto_V41','U') IS NULL THROW 54503,N'Falta tabla origen Solicitud_Contacto_V41',1;
EXEC sys.sp_rename @objname=N'dbo.Solicitud_Contacto_V41',@newname=N'SOLICITUD_CONTACTO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.SOLICITUD_CONTACTO.Id',@newname=N'ID',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SOLICITUD_CONTACTO.ALUMNO_DNI_Alu',@newname=N'DNI_ALUMNO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SOLICITUD_CONTACTO.Tipo',@newname=N'TIPO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SOLICITUD_CONTACTO.Destino',@newname=N'DESTINO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SOLICITUD_CONTACTO.Estado',@newname=N'ESTADO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SOLICITUD_CONTACTO.Codigo_Id',@newname=N'ID_CODIGO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SOLICITUD_CONTACTO.Creado',@newname=N'FECHA_CREACION',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SOLICITUD_CONTACTO.Resuelto',@newname=N'FECHA_RESOLUCION',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SOLICITUD_CONTACTO.Usuario_Cod_Usuario',@newname=N'ID_USUARIO_RESPONSABLE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SOLICITUD_CONTACTO.Motivo',@newname=N'MOTIVO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.TIPO_BLOQUE','U') IS NULL THROW 54503,N'Falta tabla origen TIPO_BLOQUE',1;
EXEC sys.sp_rename @objname=N'dbo.TIPO_BLOQUE.Cod_Tipo',@newname=N'ID_TIPO_BLOQUE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.TIPO_BLOQUE.Nomb_Tipo',@newname=N'NOMBRE_TIPO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Turno','U') IS NULL THROW 54503,N'Falta tabla origen Turno',1;
EXEC sys.sp_rename @objname=N'dbo.Turno',@newname=N'TURNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TURNO.Cod_Turno',@newname=N'ID_TURNO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.TURNO.Nomb_Turno',@newname=N'NOMBRE_TURNO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.TURNO.Hr_Inicio',@newname=N'HORA_INICIO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.TURNO.Hr_Fin',@newname=N'HORA_FIN',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Usuario','U') IS NULL THROW 54503,N'Falta tabla origen Usuario',1;
EXEC sys.sp_rename @objname=N'dbo.Usuario',@newname=N'USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.USUARIO.Cod_Usuario',@newname=N'ID_USUARIO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.USUARIO.Nomb_Usuario',@newname=N'NOMBRE_USUARIO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.USUARIO.Clave_Hash',@newname=N'CLAVE_HASH',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.USUARIO.ROL_Cod_Rol',@newname=N'ID_ROL',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.USUARIO.Activo',@newname=N'ACTIVO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.USUARIO.Debe_Cambiar_Clave',@newname=N'DEBE_CAMBIAR_CLAVE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.USUARIO.ALUMNO_DNI_Alu',@newname=N'DNI_ALUMNO',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.USUARIO.Correo_Recuperacion',@newname=N'CORREO_RECUPERACION',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.USUARIO.Correo_Verificado',@newname=N'CORREO_VERIFICADO',@objtype=N'COLUMN';
IF OBJECT_ID(N'dbo.Usuario_Seguridad_V41','U') IS NULL THROW 54503,N'Falta tabla origen Usuario_Seguridad_V41',1;
EXEC sys.sp_rename @objname=N'dbo.Usuario_Seguridad_V41',@newname=N'SEGURIDAD_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.SEGURIDAD_USUARIO.Usuario_Cod_Usuario',@newname=N'ID_USUARIO_RESPONSABLE',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SEGURIDAD_USUARIO.Version_Sesion',@newname=N'VERSION_SESION',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.SEGURIDAD_USUARIO.Activacion_Requerida',@newname=N'ACTIVACION_REQUERIDA',@objtype=N'COLUMN';
EXEC sys.sp_rename @objname=N'dbo.DF_ALUMNO_EsPrueba',@newname=N'DF_ALUMNO_ES_PRUEBA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Alumno_Estado_V41_Fecha',@newname=N'DF_ESTADO_ALUMNO_FECHA_EVENTO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Auditoria_V4_Fecha',@newname=N'DF_AUDITORIA_SISTEMA_FECHA_EVENTO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Aula_Activa',@newname=N'DF_AULA_ACTIVO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Ciclo_Precio',@newname=N'DF_CICLO_PRECIO_MENSUAL',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Codigo_V41_Consumido',@newname=N'DF_CODIGO_CUENTA_CONSUMIDO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Codigo_V41_Creado',@newname=N'DF_CODIGO_CUENTA_FECHA_CREACION',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Codigo_V41_Intentos',@newname=N'DF_CODIGO_CUENTA_INTENTOS',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Contacto_V41_Activo',@newname=N'DF_CONTACTO_VERIFICADO_ACTIVO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Contacto_V41_Fecha',@newname=N'DF_CONTACTO_VERIFICADO_VERIFICADO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Control_V4_Fecha',@newname=N'DF_CONTROL_MIGRACION_FECHA_EVENTO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Cursos_Activa',@newname=N'DF_CURSO_ACTIVO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Docente_Activo',@newname=N'DF_DOCENTE_ACTIVO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Examen_Activo',@newname=N'DF_SIMULACRO_ACTIVO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_ExamenGrupo_Estado',@newname=N'DF_SIMULACRO_HORARIO_ESTADO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_ExamenGrupo_Publicado',@newname=N'DF_SIMULACRO_HORARIO_PUBLICADO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Grupo_Activo',@newname=N'DF_HORARIO_ACADEMICO_ACTIVO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Grupo_EstadoHorario',@newname=N'DF_HORARIO_ACADEMICO_ESTADO_HORARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Grupo_VersionHorario',@newname=N'DF_HORARIO_ACADEMICO_VERSION_HORARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Horario_Activo',@newname=N'DF_BLOQUE_HORARIO_ACTIVO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Horario_Excepcion',@newname=N'DF_BLOQUE_HORARIO_EXCEPCION_TURNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Matricula_Fecha',@newname=N'DF_MATRICULA_FECHA_MATRICULA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_MEDIO_PAGO_Activo',@newname=N'DF_MEDIO_PAGO_ACTIVO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Nota_Estado_V41_Fecha',@newname=N'DF_ESTADO_RESULTADO_FECHA_EVENTO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Nota_Fecha',@newname=N'DF_RESULTADO_SIMULACRO_FECHA_REGISTRO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Programa_Activo',@newname=N'DF_PROGRAMA_ACTIVO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Seguridad_V41_Activacion',@newname=N'DF_SEGURIDAD_USUARIO_ACTIVACION_REQUERIDA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Seguridad_V41_Version',@newname=N'DF_SEGURIDAD_USUARIO_VERSION_SESION',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Solicitud_V41_Creado',@newname=N'DF_SOLICITUD_CONTACTO_FECHA_CREACION',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Usuario_Activo',@newname=N'DF_USUARIO_ACTIVO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Usuario_Cambiar',@newname=N'DF_USUARIO_DEBE_CAMBIAR_CLAVE',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.DF_Usuario_CorreoVerificado',@newname=N'DF_USUARIO_CORREO_VERIFICADO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Ciclo_ESTADO_CICLO',@newname=N'FK_CICLO_ESTADO_CICLO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Docente_Asignatura_Docente',@newname=N'FK_CURSO_DOCENTE_DOCENTE',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Examen_Grupo_ESTADO_EXAMEN_GRUPO',@newname=N'FK_SIMULACRO_HORARIO_ESTADO_SIMULACRO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Examen_Grupo_Examen',@newname=N'FK_SIMULACRO_HORARIO_SIMULACRO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Examen_Grupo_Grupo',@newname=N'FK_SIMULACRO_HORARIO_HORARIO_ACADEMICO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Alumno_Carrera',@newname=N'FK_ALUMNO_CARRERA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Alumno_Estado_V41_Alumno',@newname=N'FK_ESTADO_ALUMNO_ALUMNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Alumno_Estado_V41_Usuario',@newname=N'FK_ESTADO_ALUMNO_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Alumno_Parentesco',@newname=N'FK_ALUMNO_PARENTESCO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Auditoria_V4_Usuario',@newname=N'FK_AUDITORIA_SISTEMA_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Ciclo_Programa',@newname=N'FK_CICLO_PROGRAMA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Codigo_V41_Usuario',@newname=N'FK_CODIGO_CUENTA_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Contacto_V41_Alumno',@newname=N'FK_CONTACTO_VERIFICADO_ALUMNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Contacto_V41_Usuario',@newname=N'FK_CONTACTO_VERIFICADO_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_DA_Curso',@newname=N'FK_CURSO_DOCENTE_CURSO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Horario_Autorizador',@newname=N'FK_BLOQUE_HORARIO_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Nota_Estado_V41_Nota',@newname=N'FK_ESTADO_RESULTADO_RESULTADO_SIMULACRO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Nota_Estado_V41_Usuario',@newname=N'FK_ESTADO_RESULTADO_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Seguridad_V41_Usuario',@newname=N'FK_SEGURIDAD_USUARIO_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Solicitud_V41_Alumno',@newname=N'FK_SOLICITUD_CONTACTO_ALUMNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Solicitud_V41_Codigo',@newname=N'FK_SOLICITUD_CONTACTO_CODIGO_CUENTA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_Solicitud_V41_Usuario',@newname=N'FK_SOLICITUD_CONTACTO_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.FK_V4_Pago_Medio',@newname=N'FK_PAGO_MEDIO_PAGO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Grupo_Aula',@newname=N'FK_HORARIO_ACADEMICO_AULA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Grupo_Ciclo',@newname=N'FK_HORARIO_ACADEMICO_CICLO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Grupo_Turno',@newname=N'FK_HORARIO_ACADEMICO_TURNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Horario_Docente_Asignatura',@newname=N'FK_BLOQUE_HORARIO_CURSO_DOCENTE',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Horario_Grupo',@newname=N'FK_BLOQUE_HORARIO_HORARIO_ACADEMICO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Horario_TIPO_BLOQUE',@newname=N'FK_BLOQUE_HORARIO_TIPO_BLOQUE',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.MATRICULA_ALUMNO',@newname=N'FK_MATRICULA_ALUMNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.MATRICULA_ESTADO_MATRICULA',@newname=N'FK_MATRICULA_ESTADO_MATRICULA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.MATRICULA_Grupo',@newname=N'FK_MATRICULA_HORARIO_ACADEMICO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Nota_Examen_Examen_Grupo',@newname=N'FK_RESULTADO_SIMULACRO_SIMULACRO_HORARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Nota_Examen_MATRICULA',@newname=N'FK_RESULTADO_SIMULACRO_MATRICULA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Pago_ALUMNO',@newname=N'FK_PAGO_ALUMNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Pago_CONCEPTO_PAGO',@newname=N'FK_PAGO_CONCEPTO_PAGO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Pago_ESTADO_PAGO',@newname=N'FK_PAGO_ESTADO_PAGO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Pago_MATRICULA',@newname=N'FK_PAGO_MATRICULA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Pago_Usuario',@newname=N'FK_PAGO_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Usuario_ALUMNO',@newname=N'FK_USUARIO_ALUMNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.Usuario_ROL',@newname=N'FK_USUARIO_ROL',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Alumno_Estado_V41',@newname=N'PK_ESTADO_ALUMNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Auditoria_V4',@newname=N'PK_AUDITORIA_SISTEMA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Aula',@newname=N'PK_AULA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Ciclo',@newname=N'PK_CICLO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Contacto_Verificado_V41',@newname=N'PK_CONTACTO_VERIFICADO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Control_Migracion_V4',@newname=N'PK_CONTROL_MIGRACION',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Cuenta_Codigo_V41',@newname=N'PK_CODIGO_CUENTA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_CURSOS',@newname=N'PK_CURSO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Docente',@newname=N'PK_DOCENTE',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Docente_Asignatura',@newname=N'PK_CURSO_DOCENTE',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_ESTADO_EXAMEN_GRUPO',@newname=N'PK_ESTADO_SIMULACRO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Examen',@newname=N'PK_SIMULACRO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Examen_Grupo',@newname=N'PK_SIMULACRO_HORARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Grupo',@newname=N'PK_HORARIO_ACADEMICO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Horario',@newname=N'PK_BLOQUE_HORARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Linea_Base_V4',@newname=N'PK_LINEA_BASE_MIGRACION',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Nota_Estado_V41',@newname=N'PK_ESTADO_RESULTADO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Nota_Examen',@newname=N'PK_RESULTADO_SIMULACRO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Pago',@newname=N'PK_PAGO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Programa',@newname=N'PK_PROGRAMA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Solicitud_Contacto_V41',@newname=N'PK_SOLICITUD_CONTACTO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Turno',@newname=N'PK_TURNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Usuario',@newname=N'PK_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.PK_Usuario_Seguridad_V41',@newname=N'PK_SEGURIDAD_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_Horario_Sin_Cruces',@newname=N'TR_BLOQUE_HORARIO_VALIDAR_CRUCES',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_Matricula_CupoMaximo',@newname=N'TR_MATRICULA_VALIDAR_CAPACIDAD',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_Nota_Examen_Puntaje',@newname=N'TR_RESULTADO_SIMULACRO_VALIDAR_PUNTAJE',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_Pago_Mes_Valido',@newname=N'TR_PAGO_VALIDAR_MENSUALIDAD',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V4_Auditoria_Inmutable',@newname=N'TR_AUDITORIA_SISTEMA_PROTEGER',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V4_Ciclo_Historial',@newname=N'TR_CICLO_PROTEGER_HISTORIAL',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V4_Examen_Maximo',@newname=N'TR_SIMULACRO_VALIDAR_MAXIMO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V4_Grupo_Historial',@newname=N'TR_HORARIO_ACADEMICO_PROTEGER_HISTORIAL',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V4_Matricula_Historial',@newname=N'TR_MATRICULA_PROTEGER_HISTORIAL',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V4_Nota_Unica',@newname=N'TR_RESULTADO_SIMULACRO_UNICIDAD',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V4_Pago_Obligacion',@newname=N'TR_PAGO_VALIDAR_OBLIGACION',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V41_Alumno_Contacto',@newname=N'TR_ALUMNO_PROTEGER_CONTACTO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V43_MarcaPrueba',@newname=N'TR_ALUMNO_MARCA_PRUEBA_INMUTABLE',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V43_Tarifa_Ciclo',@newname=N'TR_CICLO_VALIDAR_TARIFA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V43_Usuario_Correo',@newname=N'TR_USUARIO_VERIFICAR_CORREO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V44_Grupo_Publicacion',@newname=N'TR_HORARIO_ACADEMICO_VALIDAR_PUBLICACION',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V44_Matricula_Publicada',@newname=N'TR_MATRICULA_VALIDAR_PUBLICACION',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V44_Nota_Eliminar',@newname=N'TR_RESULTADO_SIMULACRO_PROTEGER_ELIMINACION',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.TR_V44_Pago_Eliminar',@newname=N'TR_PAGO_PROTEGER_ELIMINACION',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_Aula_Nombre',@newname=N'UQ_AULA_NOMBRE_AULA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_CARRERA_Nombre',@newname=N'UQ_CARRERA_NOMBRE_CARRERA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_Ciclo_Edicion',@newname=N'UQ_CICLO_ID_PROGRAMA_MODALIDAD_FECHA_INICIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_CONCEPTO_PAGO_Nombre',@newname=N'UQ_CONCEPTO_PAGO_NOMBRE_CONCEPTO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_CURSOS_Nombre',@newname=N'UQ_CURSO_NOMBRE_CURSO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_ESTADO_CICLO_Nombre',@newname=N'UQ_ESTADO_CICLO_NOMBRE_ESTADO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_ESTADO_EXAMEN_GRUPO_Nombre',@newname=N'UQ_ESTADO_SIMULACRO_NOMBRE_ESTADO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_ESTADO_MATRICULA_Nombre',@newname=N'UQ_ESTADO_MATRICULA_NOMBRE_ESTADO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_ESTADO_PAGO_Nombre',@newname=N'UQ_ESTADO_PAGO_NOMBRE_ESTADO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_ExamenGrupo_ExamenGrupo',@newname=N'UQ_SIMULACRO_HORARIO_ID_SIMULACRO_ID_HORARIO_ACADEMICO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_ExamenGrupo_IdGrupo',@newname=N'UQ_SIMULACRO_HORARIO_ID_SIMULACRO_HORARIO_ID_HORARIO_ACADEMICO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_Grupo_Ciclo_Nombre',@newname=N'UQ_HORARIO_ACADEMICO_ID_CICLO_NOMBRE_HORARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_Matricula_Alumno_Grupo',@newname=N'UQ_MATRICULA_DNI_ALUMNO_ID_HORARIO_ACADEMICO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_Matricula_IdAlumno',@newname=N'UQ_MATRICULA_ID_MATRICULA_DNI_ALUMNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_Matricula_IdGrupo',@newname=N'UQ_MATRICULA_ID_MATRICULA_ID_HORARIO_ACADEMICO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_MEDIO_PAGO_Nombre',@newname=N'UQ_MEDIO_PAGO_NOMBRE_MEDIO_PAGO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_Nota_ExamenMatricula',@newname=N'UQ_RESULTADO_SIMULACRO_ID_SIMULACRO_HORARIO_ID_MATRICULA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_PARENTESCO_Tipo',@newname=N'UQ_PARENTESCO_PARENTESCO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_Programa_Nombre',@newname=N'UQ_PROGRAMA_NOMBRE_PROGRAMA',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_ROL_Nombre',@newname=N'UQ_ROL_NOMBRE_ROL',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_TIPO_BLOQUE_Nombre',@newname=N'UQ_TIPO_BLOQUE_NOMBRE_TIPO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_Turno_Nombre',@newname=N'UQ_TURNO_NOMBRE_TURNO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.UQ_Usuario_Nombre',@newname=N'UQ_USUARIO_NOMBRE_USUARIO',@objtype=N'OBJECT';
EXEC sys.sp_rename @objname=N'dbo.ALUMNO.IX_ALUMNO_APODERADO',@newname=N'IX_ALUMNO_DNI_APODERADO',@objtype=N'INDEX';
EXEC sys.sp_rename @objname=N'dbo.AUDITORIA_SISTEMA.IX_Auditoria_V4_Referencia',@newname=N'IX_AUDITORIA_SISTEMA_ENTIDAD_ID_REGISTRO_ID',@objtype=N'INDEX';
EXEC sys.sp_rename @objname=N'dbo.AUDITORIA_SISTEMA.IX_Auditoria_V41_Fecha',@newname=N'IX_AUDITORIA_SISTEMA_FECHA_EVENTO_ID',@objtype=N'INDEX';
EXEC sys.sp_rename @objname=N'dbo.CODIGO_CUENTA.IX_Codigo_V41_Limites',@newname=N'IX_CODIGO_CUENTA_ID_USUARIO_RESPONSABLE_PROPOSITO_FECHA_CREACION',@objtype=N'INDEX';
EXEC sys.sp_rename @objname=N'dbo.SOLICITUD_CONTACTO.IX_Solicitud_V41_AlumnoFecha',@newname=N'IX_SOLICITUD_CONTACTO_DNI_ALUMNO_FECHA_CREACION',@objtype=N'INDEX';
EXEC sys.sp_rename @objname=N'dbo.BLOQUE_HORARIO.IX_V4_Horario_DiaGrupo',@newname=N'IX_BLOQUE_HORARIO_DIA_SEMANA_ID_HORARIO_ACADEMICO_HORA_INICIO',@objtype=N'INDEX';
EXEC sys.sp_rename @objname=N'dbo.MATRICULA.IX_V4_Matricula_GrupoEstado',@newname=N'IX_MATRICULA_ID_HORARIO_ACADEMICO_ID_ESTADO_MATRICULA',@objtype=N'INDEX';
EXEC sys.sp_executesql N'CREATE UNIQUE NONCLUSTERED INDEX [UQ_CODIGO_CUENTA_ID_USUARIO_RESPONSABLE_PROPOSITO] ON dbo.[CODIGO_CUENTA]([ID_USUARIO_RESPONSABLE],[PROPOSITO]) WHERE ([CONSUMIDO]=(0));';
EXEC sys.sp_executesql N'CREATE UNIQUE NONCLUSTERED INDEX [UQ_CONTACTO_VERIFICADO_DNI_ALUMNO_TIPO] ON dbo.[CONTACTO_VERIFICADO]([DNI_ALUMNO],[TIPO]) WHERE ([ACTIVO]=(1));';
EXEC sys.sp_executesql N'CREATE UNIQUE NONCLUSTERED INDEX [UQ_HORARIO_ACADEMICO_ID_CICLO_ID_TURNO_ID_AULA] ON dbo.[HORARIO_ACADEMICO]([ID_CICLO],[ID_TURNO],[ID_AULA]) WHERE ([ACTIVO]=(1) AND [ESTADO_HORARIO]=''PUBLICADO'');';
EXEC sys.sp_executesql N'CREATE UNIQUE NONCLUSTERED INDEX [UQ_PAGO_DNI_ALUMNO_ID_CONCEPTO] ON dbo.[PAGO]([DNI_ALUMNO],[ID_CONCEPTO]) WHERE ([ID_CONCEPTO] IN (''MATRICULA_INICIAL'', ''MATERIALES''));';
EXEC sys.sp_executesql N'CREATE UNIQUE NONCLUSTERED INDEX [UQ_PAGO_ID_MATRICULA_NUMERO_MENSUALIDAD] ON dbo.[PAGO]([ID_MATRICULA],[NUMERO_MENSUALIDAD]) WHERE ([ID_CONCEPTO]=''MENSUALIDAD'');';
EXEC sys.sp_executesql N'CREATE UNIQUE NONCLUSTERED INDEX [UQ_USUARIO_DNI_ALUMNO] ON dbo.[USUARIO]([DNI_ALUMNO]) WHERE ([DNI_ALUMNO] IS NOT NULL);';
EXEC sys.sp_rename @objname=N'dbo.Seq_Operacion_V4',@newname=N'SECUENCIA_OPERACION',@objtype=N'OBJECT';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_BLOQUE_HORARIO_VALIDAR_CRUCES ON dbo.BLOQUE_HORARIO AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=i.ID_HORARIO_ACADEMICO JOIN dbo.TURNO t ON t.ID_TURNO=g.ID_TURNO
    WHERE (i.HORA_INICIO<t.HORA_INICIO OR i.HORA_FIN>t.HORA_FIN) AND
    (i.EXCEPCION_TURNO=0 OR NOT EXISTS(SELECT 1 FROM dbo.USUARIO u WHERE u.ID_USUARIO=i.ID_USUARIO_AUTORIZADOR AND u.ID_ROL=''ADMIN'' AND u.ACTIVO=1)))
    THROW 54430,''Bloque fuera del turno sin excepcion administradora autorizada.'',1;
   IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.HORARIO_ACADEMICO gi ON gi.ID_HORARIO_ACADEMICO=i.ID_HORARIO_ACADEMICO JOIN dbo.CICLO ci ON ci.ID_CICLO=gi.ID_CICLO
    JOIN dbo.BLOQUE_HORARIO h WITH(UPDLOCK,HOLDLOCK) ON h.ID_BLOQUE_HORARIO<>i.ID_BLOQUE_HORARIO AND h.DIA_SEMANA=i.DIA_SEMANA AND i.HORA_INICIO<h.HORA_FIN AND h.HORA_INICIO<i.HORA_FIN
    JOIN dbo.HORARIO_ACADEMICO gh ON gh.ID_HORARIO_ACADEMICO=h.ID_HORARIO_ACADEMICO JOIN dbo.CICLO ch ON ch.ID_CICLO=gh.ID_CICLO
    WHERE (i.ID_HORARIO_ACADEMICO=h.ID_HORARIO_ACADEMICO OR (i.ACTIVO=1 AND h.ACTIVO=1 AND gi.ACTIVO=1 AND gh.ACTIVO=1
      AND ci.FECHA_INICIO<=ch.FECHA_FIN AND ch.FECHA_INICIO<=ci.FECHA_FIN AND
      (gi.ID_AULA=gh.ID_AULA OR i.DNI_DOCENTE=h.DNI_DOCENTE))))
    THROW 54431,''Cruce de horario: conjunto academico, aula o docente ocupado.'',1;
  END;';
EXEC sys.sp_executesql N'-- Restringe cupos en matriculas ACTIVAS.
CREATE OR ALTER TRIGGER TR_MATRICULA_VALIDAR_CAPACIDAD
ON MATRICULA AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM (SELECT DISTINCT ID_HORARIO_ACADEMICO FROM inserted) AS gr
        JOIN HORARIO_ACADEMICO AS g ON g.ID_HORARIO_ACADEMICO = gr.ID_HORARIO_ACADEMICO
        CROSS APPLY (
            SELECT COUNT_BIG(*) AS Cantidad
            FROM MATRICULA AS m
            WHERE m.ID_HORARIO_ACADEMICO = g.ID_HORARIO_ACADEMICO
              AND m.ID_ESTADO_MATRICULA = ''ACTIVA''
        ) AS ocupacion
        WHERE ocupacion.Cantidad > g.CAPACIDAD_MAXIMA
    )
        THROW 51005, ''La cantidad de matriculas activas supera el cupo del grupo.'', 1;
END;';
EXEC sys.sp_executesql N'-- La nota debe estar dentro del maximo permitido por el examen.
CREATE OR ALTER TRIGGER TR_RESULTADO_SIMULACRO_VALIDAR_PUNTAJE
ON RESULTADO_SIMULACRO AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS n
        JOIN SIMULACRO_HORARIO AS eg ON eg.ID_SIMULACRO_HORARIO = n.ID_SIMULACRO_HORARIO
        JOIN SIMULACRO AS e ON e.ID_SIMULACRO = eg.ID_SIMULACRO
        WHERE n.PUNTAJE_TOTAL > e.PUNTAJE_MAXIMO
    )
        THROW 51004, ''La nota supera el puntaje maximo del simulacro.'', 1;
END;';
EXEC sys.sp_executesql N'-- Evita registrar mensualidad 3 o 4 cuando un ciclo acelerado dura solo 2 meses.
CREATE OR ALTER TRIGGER TR_PAGO_VALIDAR_MENSUALIDAD
ON PAGO AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM inserted AS p
        INNER JOIN MATRICULA AS m ON m.ID_MATRICULA = p.ID_MATRICULA
        INNER JOIN HORARIO_ACADEMICO AS g ON g.ID_HORARIO_ACADEMICO = m.ID_HORARIO_ACADEMICO
        INNER JOIN CICLO AS c ON c.ID_CICLO = g.ID_CICLO
        WHERE p.ID_CONCEPTO = ''MENSUALIDAD''
          AND p.NUMERO_MENSUALIDAD > c.NUMERO_MENSUALIDADES
    )
    BEGIN
        THROW 51001, ''Numero de mensualidad fuera del ciclo del alumno.'', 1;
    END
END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_AUDITORIA_SISTEMA_PROTEGER ON dbo.AUDITORIA_SISTEMA INSTEAD OF UPDATE,DELETE AS
BEGIN SET NOCOUNT ON; THROW 54037,''El historial de auditoria no se puede modificar ni eliminar.'',1; END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_CICLO_PROTEGER_HISTORIAL ON dbo.CICLO AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.ID_CICLO=i.ID_CICLO WHERE (i.ID_PROGRAMA<>d.ID_PROGRAMA OR i.MODALIDAD<>d.MODALIDAD OR i.FECHA_INICIO<>d.FECHA_INICIO OR i.FECHA_FIN<>d.FECHA_FIN OR i.NUMERO_MENSUALIDADES<>d.NUMERO_MENSUALIDADES)
 AND EXISTS (SELECT 1 FROM dbo.HORARIO_ACADEMICO g WHERE g.ID_CICLO=i.ID_CICLO AND (EXISTS (SELECT 1 FROM dbo.MATRICULA m WHERE m.ID_HORARIO_ACADEMICO=g.ID_HORARIO_ACADEMICO) OR EXISTS (SELECT 1 FROM dbo.BLOQUE_HORARIO h WHERE h.ID_HORARIO_ACADEMICO=g.ID_HORARIO_ACADEMICO))))
 THROW 54055,''No se puede redefinir una edicion con matriculas u horarios.'',1;
END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_SIMULACRO_VALIDAR_MAXIMO ON dbo.SIMULACRO AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted e JOIN dbo.SIMULACRO_HORARIO eg ON eg.ID_SIMULACRO=e.ID_SIMULACRO JOIN dbo.RESULTADO_SIMULACRO n ON n.ID_SIMULACRO_HORARIO=eg.ID_SIMULACRO_HORARIO WHERE n.PUNTAJE_TOTAL>e.PUNTAJE_MAXIMO)
 THROW 54044,''El nuevo maximo es menor que un puntaje registrado.'',1;
END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_HORARIO_ACADEMICO_PROTEGER_HISTORIAL ON dbo.HORARIO_ACADEMICO AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.ID_HORARIO_ACADEMICO=i.ID_HORARIO_ACADEMICO WHERE i.ID_CICLO<>d.ID_CICLO AND EXISTS (SELECT 1 FROM dbo.MATRICULA m WHERE m.ID_HORARIO_ACADEMICO=i.ID_HORARIO_ACADEMICO))
 THROW 54052,''No se puede cambiar el ciclo de un grupo con matriculas.'',1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.ID_HORARIO_ACADEMICO=i.ID_HORARIO_ACADEMICO WHERE (i.ID_AULA<>d.ID_AULA OR i.ID_TURNO<>d.ID_TURNO OR i.ID_CICLO<>d.ID_CICLO) AND EXISTS (SELECT 1 FROM dbo.BLOQUE_HORARIO h WHERE h.ID_HORARIO_ACADEMICO=i.ID_HORARIO_ACADEMICO))
 THROW 54053,''Reorganice los bloques antes de cambiar aula, turno o ciclo.'',1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.AULA a ON a.ID_AULA=i.ID_AULA WHERE i.CAPACIDAD_MAXIMA>a.CAPACIDAD OR i.CAPACIDAD_MAXIMA<(SELECT COUNT_BIG(*) FROM dbo.MATRICULA m WHERE m.ID_HORARIO_ACADEMICO=i.ID_HORARIO_ACADEMICO AND m.ID_ESTADO_MATRICULA=''ACTIVA''))
 THROW 54054,''Cupo incompatible con aula o matriculas activas.'',1;
END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_MATRICULA_PROTEGER_HISTORIAL ON dbo.MATRICULA AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.ID_MATRICULA=i.ID_MATRICULA WHERE i.DNI_ALUMNO<>d.DNI_ALUMNO OR i.ID_HORARIO_ACADEMICO<>d.ID_HORARIO_ACADEMICO OR i.FECHA_MATRICULA<>d.FECHA_MATRICULA)
 THROW 54022,''No se permite reasignar alumno, grupo o fecha de una matricula historica.'',1;
 IF EXISTS (SELECT m.DNI_ALUMNO,g.ID_CICLO FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK) JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=m.ID_HORARIO_ACADEMICO
 JOIN (SELECT DISTINCT DNI_ALUMNO FROM inserted) i ON i.DNI_ALUMNO=m.DNI_ALUMNO GROUP BY m.DNI_ALUMNO,g.ID_CICLO HAVING COUNT_BIG(*)>1)
 THROW 54023,''El alumno ya tiene matricula en este ciclo.'',1;
END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_RESULTADO_SIMULACRO_UNICIDAD ON dbo.RESULTADO_SIMULACRO AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.ID_RESULTADO=i.ID_RESULTADO WHERE i.ID_MATRICULA<>d.ID_MATRICULA OR i.ID_SIMULACRO_HORARIO<>d.ID_SIMULACRO_HORARIO OR i.ID_HORARIO_ACADEMICO<>d.ID_HORARIO_ACADEMICO OR i.FECHA_REGISTRO<>d.FECHA_REGISTRO)
 THROW 54042,''La correccion de puntaje no puede reasignar su historial.'',1;
 IF EXISTS (SELECT m.DNI_ALUMNO,eg.ID_SIMULACRO FROM dbo.RESULTADO_SIMULACRO n WITH (UPDLOCK,HOLDLOCK) JOIN dbo.MATRICULA m ON m.ID_MATRICULA=n.ID_MATRICULA
 JOIN dbo.SIMULACRO_HORARIO eg ON eg.ID_SIMULACRO_HORARIO=n.ID_SIMULACRO_HORARIO
 WHERE eg.ID_SIMULACRO IN (SELECT e.ID_SIMULACRO FROM inserted i JOIN dbo.SIMULACRO_HORARIO e ON e.ID_SIMULACRO_HORARIO=i.ID_SIMULACRO_HORARIO)
 GROUP BY m.DNI_ALUMNO,eg.ID_SIMULACRO HAVING COUNT_BIG(*)>1)
 THROW 54043,''Solo se permite un puntaje total por alumno y simulacro.'',1;
END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_PAGO_VALIDAR_OBLIGACION ON dbo.PAGO AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.ID_PAGO=i.ID_PAGO
 WHERE i.DNI_ALUMNO<>d.DNI_ALUMNO OR i.ID_CONCEPTO<>d.ID_CONCEPTO OR i.MONTO<>d.MONTO
 OR ISNULL(i.ID_MATRICULA,'''')<>ISNULL(d.ID_MATRICULA,'''') OR ISNULL(i.NUMERO_MENSUALIDAD,0)<>ISNULL(d.NUMERO_MENSUALIDAD,0)
 OR ISNULL(i.FECHA_VENCIMIENTO,CONVERT(date,''00010101''))<>ISNULL(d.FECHA_VENCIMIENTO,CONVERT(date,''00010101'')))
 THROW 54034,''Las obligaciones conservan alumno, concepto, matricula, cuota, importe y vencimiento originales.'',1;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.ID_PAGO=i.ID_PAGO
 WHERE d.ID_PAGO IS NULL AND i.ID_CONCEPTO IN (''MATRICULA_INICIAL'',''MATERIALES'') AND
 (SELECT COUNT_BIG(*) FROM dbo.PAGO p WITH (UPDLOCK,HOLDLOCK) WHERE p.DNI_ALUMNO=i.DNI_ALUMNO AND p.ID_CONCEPTO IN (''MATRICULA_INICIAL'',''MATERIALES''))>1)
 THROW 54035,''El alumno ya tiene un cargo inicial; no duplicar matricula y materiales.'',1;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.ID_PAGO=i.ID_PAGO WHERE d.ID_PAGO IS NULL AND i.ID_CONCEPTO=''MATRICULA_INICIAL'' AND i.MONTO<>50)
 THROW 54036,''El cargo de inscripcion inicial nuevo debe ser S/ 50.'',1;
END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_ALUMNO_PROTEGER_CONTACTO ON dbo.ALUMNO AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 UPDATE c SET ACTIVO=0 FROM dbo.CONTACTO_VERIFICADO c JOIN inserted i ON i.DNI_ALUMNO=c.DNI_ALUMNO
 WHERE c.ACTIVO=1 AND ((c.TIPO=''EMAIL'' AND (i.CORREO IS NULL OR c.DESTINO<>i.CORREO)) OR (c.TIPO=''SMS'' AND (i.CELULAR IS NULL OR c.DESTINO<>i.CELULAR)));
END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_ALUMNO_MARCA_PRUEBA_INMUTABLE ON dbo.ALUMNO AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.DNI_ALUMNO=i.DNI_ALUMNO WHERE i.ES_PRUEBA<>d.ES_PRUEBA)
    THROW 54305,''La identificacion de prueba solo se establece al crear el estudiante.'',1;
  END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_CICLO_VALIDAR_TARIFA ON dbo.CICLO AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.ID_CICLO=i.ID_CICLO WHERE i.PRECIO_MENSUAL<>250 AND (d.ID_CICLO IS NULL OR d.PRECIO_MENSUAL<>i.PRECIO_MENSUAL))
    THROW 54309,''La tarifa nueva debe ser S/250 por mensualidad. Las obligaciones historicas se conservan.'',1;
  END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_USUARIO_VERIFICAR_CORREO ON dbo.USUARIO AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.ID_USUARIO=i.ID_USUARIO
     WHERE (ISNULL(i.CORREO_RECUPERACION,'''')<>ISNULL(d.CORREO_RECUPERACION,'''') OR d.CORREO_VERIFICADO=0) AND i.CORREO_VERIFICADO=1
     AND NOT EXISTS(SELECT 1 FROM dbo.CODIGO_CUENTA c WHERE c.ID_USUARIO_RESPONSABLE=i.ID_USUARIO AND c.PROPOSITO=''VERIFICAR_CONTACTO'' AND c.CANAL=''EMAIL'' AND c.DESTINO=i.CORREO_RECUPERACION AND c.CONSUMIDO=1 AND c.FECHA_VENCIMIENTO>SYSUTCDATETIME()))
    THROW 54309,''El correo de recuperacion debe verificarse con un codigo vigente.'',1;
  END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_HORARIO_ACADEMICO_VALIDAR_PUBLICACION ON dbo.HORARIO_ACADEMICO AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   UPDATE h SET ACTIVO=CASE WHEN i.ESTADO_HORARIO=''PUBLICADO'' THEN 1 ELSE 0 END
   FROM dbo.BLOQUE_HORARIO h JOIN inserted i ON i.ID_HORARIO_ACADEMICO=h.ID_HORARIO_ACADEMICO JOIN deleted d ON d.ID_HORARIO_ACADEMICO=i.ID_HORARIO_ACADEMICO
   WHERE i.ACTIVO<>d.ACTIVO OR i.ESTADO_HORARIO<>d.ESTADO_HORARIO;
  END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_MATRICULA_VALIDAR_PUBLICACION ON dbo.MATRICULA AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.ID_MATRICULA=i.ID_MATRICULA JOIN dbo.HORARIO_ACADEMICO g ON g.ID_HORARIO_ACADEMICO=i.ID_HORARIO_ACADEMICO
   WHERE i.ID_ESTADO_MATRICULA=''ACTIVA'' AND (d.ID_MATRICULA IS NULL OR d.ID_ESTADO_MATRICULA<>''ACTIVA'') AND (g.ESTADO_HORARIO<>''PUBLICADO'' OR g.ACTIVO=0))
    THROW 54432,''El horario debe estar ACTIVO y publicado para matricular o restaurar la matricula.'',1;
  END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_RESULTADO_SIMULACRO_PROTEGER_ELIMINACION ON dbo.RESULTADO_SIMULACRO AFTER DELETE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM deleted n JOIN dbo.MATRICULA m ON m.ID_MATRICULA=n.ID_MATRICULA JOIN dbo.ALUMNO a ON a.DNI_ALUMNO=m.DNI_ALUMNO WHERE a.ES_PRUEBA=0)
    THROW 54433,''Las notas de personas reales se conservan; utiliza correccion o anulacion auditada.'',1;
  END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_PAGO_PROTEGER_ELIMINACION ON dbo.PAGO AFTER DELETE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM deleted d WHERE d.ID_ESTADO_PAGO<>''PENDIENTE'' OR d.FECHA_PAGO IS NOT NULL OR d.ID_MEDIO_PAGO IS NOT NULL OR d.ID_USUARIO_RESPONSABLE IS NOT NULL
    OR EXISTS(SELECT 1 FROM dbo.AUDITORIA_SISTEMA a WHERE a.ENTIDAD=''PAGO'' AND a.ID_REGISTRO=d.ID_PAGO AND a.ACCION IN(''CONFIRMAR_PAGO'',''ANULAR_CONFIRMACION'')))
    THROW 54434,''Se conserva todo cobro realizado, incluso si fue revertido.'',1;
  END;';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ALUMNO] WITH CHECK ADD CONSTRAINT [CK_ALUMNO_DNI] CHECK ([DNI_ALUMNO] like ''[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ALUMNO] WITH CHECK ADD CONSTRAINT [CK_ALUMNO_DNI_APODERADO] CHECK ([DNI_APODERADO] IS NULL OR [DNI_APODERADO] like ''[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[AUDITORIA_SISTEMA] WITH CHECK ADD CONSTRAINT [CK_AUDITORIA_SISTEMA_JSON] CHECK (([DATOS_ANTERIORES] IS NULL OR isjson([DATOS_ANTERIORES])=(1)) AND ([DATOS_NUEVOS] IS NULL OR isjson([DATOS_NUEVOS])=(1)));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[AULA] WITH CHECK ADD CONSTRAINT [CK_AULA_CAPACIDAD] CHECK ([CAPACIDAD]>(0));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CICLO] WITH CHECK ADD CONSTRAINT [CK_CICLO_FECHAS] CHECK ([FECHA_FIN]>[FECHA_INICIO]);';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CICLO] WITH CHECK ADD CONSTRAINT [CK_CICLO_MODALIDAD] CHECK ([MODALIDAD]=''REGULAR'' AND [NUMERO_MENSUALIDADES]=(4) OR [MODALIDAD]=''ACELERADO'' AND [NUMERO_MENSUALIDADES]=(2));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CICLO] WITH CHECK ADD CONSTRAINT [CK_CICLO_PRECIO] CHECK ([PRECIO_MENSUAL]>(0));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CODIGO_CUENTA] WITH CHECK ADD CONSTRAINT [CK_CODIGO_CUENTA_CANAL] CHECK ([CANAL]=''DIRECTO'' OR [CANAL]=''SMS'' OR [CANAL]=''EMAIL'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CODIGO_CUENTA] WITH CHECK ADD CONSTRAINT [CK_CODIGO_CUENTA_FECHAS] CHECK ([FECHA_VENCIMIENTO]>[FECHA_CREACION]);';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CODIGO_CUENTA] WITH CHECK ADD CONSTRAINT [CK_CODIGO_CUENTA_HASH] CHECK (datalength([CODIGO_HASH])=(64) AND NOT ([CODIGO_HASH]) collate Latin1_General_100_BIN2 like ''%[^0-9a-f]%'' AND datalength([NONCE])=(32) AND NOT ([NONCE]) collate Latin1_General_100_BIN2 like ''%[^0-9a-f]%'' AND ([DESAFIO_HASH] IS NULL OR datalength([DESAFIO_HASH])=(64) AND NOT ([DESAFIO_HASH]) collate Latin1_General_100_BIN2 like ''%[^0-9a-f]%''));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CODIGO_CUENTA] WITH CHECK ADD CONSTRAINT [CK_CODIGO_CUENTA_INTENTOS] CHECK ([INTENTOS]<=(5));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CODIGO_CUENTA] WITH CHECK ADD CONSTRAINT [CK_CODIGO_CUENTA_PROPOSITO] CHECK ([PROPOSITO]=''VERIFICAR_CONTACTO'' OR [PROPOSITO]=''RECUPERACION'' OR [PROPOSITO]=''ACTIVACION'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CONCEPTO_PAGO] WITH CHECK ADD CONSTRAINT [CK_CONCEPTO_PAGO_CODIGOS] CHECK ([ID_CONCEPTO]=''MENSUALIDAD'' OR [ID_CONCEPTO]=''MATERIALES'' OR [ID_CONCEPTO]=''MATRICULA_INICIAL'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CONTACTO_VERIFICADO] WITH CHECK ADD CONSTRAINT [CK_CONTACTO_VERIFICADO_DESTINO] CHECK ([TIPO]=''SMS'' AND datalength([DESTINO])=(9) AND NOT ([DESTINO]) collate Latin1_General_100_BIN2 like ''%[^0-9]%'' OR [TIPO]=''EMAIL'' AND [DESTINO] like ''%_@_%._%'' AND NOT [DESTINO] like ''% %'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CONTACTO_VERIFICADO] WITH CHECK ADD CONSTRAINT [CK_CONTACTO_VERIFICADO_METODO_VERIFICACION] CHECK ([METODO_VERIFICACION]=''PRESENCIAL'' OR [METODO_VERIFICACION]=''CODIGO'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[CONTACTO_VERIFICADO] WITH CHECK ADD CONSTRAINT [CK_CONTACTO_VERIFICADO_TIPO] CHECK ([TIPO]=''SMS'' OR [TIPO]=''EMAIL'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[DOCENTE] WITH CHECK ADD CONSTRAINT [CK_DOCENTE_DNI] CHECK ([DNI_DOCENTE] like ''[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ESTADO_CICLO] WITH CHECK ADD CONSTRAINT [CK_ESTADO_CICLO_CODIGOS] CHECK ([ID_ESTADO_CICLO]=''CANCELADO'' OR [ID_ESTADO_CICLO]=''FINALIZADO'' OR [ID_ESTADO_CICLO]=''ACTIVO'' OR [ID_ESTADO_CICLO]=''PROGRAMADO'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ESTADO_SIMULACRO] WITH CHECK ADD CONSTRAINT [CK_ESTADO_SIMULACRO_CODIGOS] CHECK ([ID_ESTADO_SIMULACRO]=''CANCELADO'' OR [ID_ESTADO_SIMULACRO]=''RENDIDO'' OR [ID_ESTADO_SIMULACRO]=''PROGRAMADO'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ESTADO_MATRICULA] WITH CHECK ADD CONSTRAINT [CK_ESTADO_MATRICULA_CODIGOS] CHECK ([ID_ESTADO_MATRICULA]=''ANULADA'' OR [ID_ESTADO_MATRICULA]=''RETIRADA'' OR [ID_ESTADO_MATRICULA]=''FINALIZADA'' OR [ID_ESTADO_MATRICULA]=''ACTIVA'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ESTADO_PAGO] WITH CHECK ADD CONSTRAINT [CK_ESTADO_PAGO_CODIGOS] CHECK ([ID_ESTADO_PAGO]=''PAGADO'' OR [ID_ESTADO_PAGO]=''PENDIENTE'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[SIMULACRO] WITH CHECK ADD CONSTRAINT [CK_SIMULACRO_PUNTAJE] CHECK ([PUNTAJE_MAXIMO]>(0));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[SIMULACRO_HORARIO] WITH CHECK ADD CONSTRAINT [CK_SIMULACRO_HORARIO_DURACION] CHECK ([duracion_minutos]>(0));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[SIMULACRO_HORARIO] WITH CHECK ADD CONSTRAINT [CK_SIMULACRO_HORARIO_ESTADO] CHECK ([ESTADO]=[ID_ESTADO_SIMULACRO]);';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[HORARIO_ACADEMICO] WITH CHECK ADD CONSTRAINT [CK_HORARIO_ACADEMICO_CUPO] CHECK ([CAPACIDAD_MAXIMA]>(0));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[HORARIO_ACADEMICO] WITH CHECK ADD CONSTRAINT [CK_HORARIO_ACADEMICO_ESTADO_HORARIO] CHECK ([ESTADO_HORARIO]=''PUBLICADO'' OR [ESTADO_HORARIO]=''BORRADOR'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[HORARIO_ACADEMICO] WITH CHECK ADD CONSTRAINT [CK_HORARIO_ACADEMICO_VERSION_HORARIO] CHECK ([VERSION_HORARIO]>(0));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[BLOQUE_HORARIO] WITH CHECK ADD CONSTRAINT [CK_BLOQUE_HORARIO_BLOQUE] CHECK ([ID_TIPO_BLOQUE]=''CLASE'' AND [DNI_DOCENTE] IS NOT NULL AND [ID_CURSO] IS NOT NULL OR [ID_TIPO_BLOQUE]=''RECREO'' AND [DNI_DOCENTE] IS NULL AND [ID_CURSO] IS NULL);';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[BLOQUE_HORARIO] WITH CHECK ADD CONSTRAINT [CK_BLOQUE_HORARIO_DIA] CHECK ([DIA_SEMANA]>=(1) AND [DIA_SEMANA]<=(7));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[BLOQUE_HORARIO] WITH CHECK ADD CONSTRAINT [CK_BLOQUE_HORARIO_EXCEPCION] CHECK ([EXCEPCION_TURNO]=(0) AND [MOTIVO_EXCEPCION] IS NULL AND [ID_USUARIO_AUTORIZADOR] IS NULL OR [EXCEPCION_TURNO]=(1) AND len(ltrim(rtrim([MOTIVO_EXCEPCION])))>=(5) AND [ID_USUARIO_AUTORIZADOR] IS NOT NULL);';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[BLOQUE_HORARIO] WITH CHECK ADD CONSTRAINT [CK_BLOQUE_HORARIO_HORAS] CHECK ([HORA_FIN]>[HORA_INICIO]);';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[MEDIO_PAGO] WITH CHECK ADD CONSTRAINT [CK_MEDIO_PAGO_ID_REGISTRO] CHECK (datalength([ID_MEDIO_PAGO])>=(1) AND datalength([ID_MEDIO_PAGO])<=(10) AND NOT ([ID_MEDIO_PAGO]) collate Latin1_General_100_BIN2 like ''%[^A-Z0-9_-]%'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[RESULTADO_SIMULACRO] WITH CHECK ADD CONSTRAINT [CK_RESULTADO_SIMULACRO_PUNTAJE] CHECK ([puntaje_total]>=(0));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[PAGO] WITH CHECK ADD CONSTRAINT [CK_PAGO_CONCEPTO] CHECK (([ID_CONCEPTO]=''MATERIALES'' OR [ID_CONCEPTO]=''MATRICULA_INICIAL'') AND [ID_MATRICULA] IS NULL AND [NUMERO_MENSUALIDAD] IS NULL OR [ID_CONCEPTO]=''MENSUALIDAD'' AND [ID_MATRICULA] IS NOT NULL AND ([NUMERO_MENSUALIDAD]>=(1) AND [NUMERO_MENSUALIDAD]<=(4)));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[PAGO] WITH CHECK ADD CONSTRAINT [CK_PAGO_ESTADO] CHECK ([ID_ESTADO_PAGO]=''PENDIENTE'' AND [FECHA_PAGO] IS NULL AND [ID_MEDIO_PAGO] IS NULL AND [ID_USUARIO_RESPONSABLE] IS NULL OR [ID_ESTADO_PAGO]=''PAGADO'' AND [FECHA_PAGO] IS NOT NULL AND [ID_MEDIO_PAGO] IS NOT NULL AND [ID_USUARIO_RESPONSABLE] IS NOT NULL);';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[PAGO] WITH CHECK ADD CONSTRAINT [CK_PAGO_MONTO] CHECK ([MONTO]>(0));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[PARENTESCO] WITH CHECK ADD CONSTRAINT [CK_PARENTESCO_LISTA] CHECK ([ID_PARENTESCO]=''OTRO'' OR [ID_PARENTESCO]=''TUTOR'' OR [ID_PARENTESCO]=''ABUEL'' OR [ID_PARENTESCO]=''HERM'' OR [ID_PARENTESCO]=''TIO'' OR [ID_PARENTESCO]=''MADRE'' OR [ID_PARENTESCO]=''PADRE'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[PROGRAMA] WITH CHECK ADD CONSTRAINT [CK_PROGRAMA_SOLO_DOS] CHECK ([ID_PROGRAMA]=''PREUNIV'' OR [ID_PROGRAMA]=''REFUERZO'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ROL] WITH CHECK ADD CONSTRAINT [CK_ROL_CODIGOS] CHECK ([ID_ROL]=''ALUMNO'' OR [ID_ROL]=''ADMIN'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[SEGURIDAD_USUARIO] WITH CHECK ADD CONSTRAINT [CK_SEGURIDAD_USUARIO_VERSION] CHECK ([VERSION_SESION]>=(0));';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[SOLICITUD_CONTACTO] WITH CHECK ADD CONSTRAINT [CK_SOLICITUD_CONTACTO_ESTADO] CHECK ([ESTADO]=''REEMPLAZADA'' OR [ESTADO]=''RECHAZADA'' OR [ESTADO]=''APROBADA'' OR [ESTADO]=''VERIFICADA'' OR [ESTADO]=''PENDIENTE_ADMIN'' OR [ESTADO]=''PENDIENTE'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[SOLICITUD_CONTACTO] WITH CHECK ADD CONSTRAINT [CK_SOLICITUD_CONTACTO_TIPO] CHECK ([TIPO]=''SMS'' OR [TIPO]=''EMAIL'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[TIPO_BLOQUE] WITH CHECK ADD CONSTRAINT [CK_TIPO_BLOQUE_CODIGOS] CHECK ([ID_TIPO_BLOQUE]=''RECREO'' OR [ID_TIPO_BLOQUE]=''CLASE'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[TURNO] WITH CHECK ADD CONSTRAINT [CK_TURNO_DOS_OPCIONES] CHECK ([ID_TURNO]=''MANANA'' AND [NOMBRE_TURNO]=''MANANA'' AND [HORA_INICIO]=''07:00'' AND [HORA_FIN]=''13:00'' OR [ID_TURNO]=''TARDE'' AND [NOMBRE_TURNO]=''TARDE'' AND [HORA_INICIO]=''15:00'' AND [HORA_FIN]=''21:00'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[USUARIO] WITH CHECK ADD CONSTRAINT [CK_USUARIO_CORREO_VERIFICADO] CHECK ([CORREO_VERIFICADO]=(0) OR [CORREO_RECUPERACION] IS NOT NULL);';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[USUARIO] WITH CHECK ADD CONSTRAINT [CK_USUARIO_ROL] CHECK ([ID_ROL]=''ADMIN'' AND [DNI_ALUMNO] IS NULL OR [ID_ROL]=''ALUMNO'' AND [DNI_ALUMNO] IS NOT NULL);';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ALUMNO] WITH CHECK ADD CONSTRAINT [CK_ALUMNO_CELULAR] CHECK ([CELULAR] IS NULL OR datalength([CELULAR])=(9) AND NOT ([CELULAR]) collate Latin1_General_100_BIN2 like ''%[^0-9]%'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[ALUMNO] WITH CHECK ADD CONSTRAINT [CK_ALUMNO_CELULAR_APODERADO] CHECK ([CELULAR_APODERADO] IS NULL OR datalength([CELULAR_APODERADO])=(9) AND NOT ([CELULAR_APODERADO]) collate Latin1_General_100_BIN2 like ''%[^0-9]%'');';
EXEC sys.sp_executesql N'ALTER TABLE dbo.[DOCENTE] WITH CHECK ADD CONSTRAINT [CK_DOCENTE_CELULAR] CHECK (datalength([CELULAR])=(9) AND NOT ([CELULAR]) collate Latin1_General_100_BIN2 like ''%[^0-9]%'');';

INSERT dbo.CONTROL_MIGRACION(SCRIPT) VALUES('V45_03_NOMBRES');
END ELSE IF NOT EXISTS(SELECT 1 FROM dbo.CONTROL_MIGRACION WHERE SCRIPT='V45_03_NOMBRES') THROW 54503,'Renombrado incompleto.',1;
COMMIT; END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
