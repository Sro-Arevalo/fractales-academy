-- V4: ejecutar manualmente, en mantenimiento, después de respaldo verificado.
-- Cambiar SOLO @BaseEsperada por el nombre de la base independiente al ensayar.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN ('master','model','msdb','tempdb')
    THROW 54000, 'Base incorrecta. Verifique servidor y @BaseEsperada; no se hizo ningun cambio.', 1;
IF OBJECT_ID('dbo.Control_Migracion_V4') IS NULL OR OBJECT_ID('dbo.Linea_Base_V4') IS NULL OR OBJECT_ID('dbo.Auditoria_V4') IS NULL OR OBJECT_ID('dbo.Seq_Operacion_V4','SO') IS NULL THROW 54001, 'Ejecute primero 00A_PREPARACION_Y_LINEA_BASE.sql.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='00A_PREPARACION_Y_LINEA_BASE') THROW 54001,'Preparacion V4 incompleta.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='04_ACTUALIZACION_SIMULACROS') THROW 54008,'Falta una migracion anterior. Respetar el orden de la guia.',1;
BEGIN TRY
BEGIN TRAN;

-- Se conservan la FK compuesta docente/curso y los CHECK de turnos, días y recreos.
IF EXISTS (SELECT 1 FROM dbo.Horario h JOIN dbo.Grupo g ON g.Cod_Grupo=h.Grupo_Cod_Grupo JOIN dbo.Turno t ON t.Cod_Turno=g.Turno_Cod_Turno WHERE h.Activo=1 AND (h.Hr_Inicio<t.Hr_Inicio OR h.Hr_Fin>t.Hr_Fin))
 THROW 54050,'Hay bloques fuera de turno. Revisar antes de continuar.',1;
IF EXISTS (SELECT 1 FROM dbo.Horario i JOIN dbo.Grupo gi ON gi.Cod_Grupo=i.Grupo_Cod_Grupo JOIN dbo.Ciclo ci ON ci.Cod_Ciclo=gi.Ciclo_Cod_Ciclo
 JOIN dbo.Horario h ON h.Cod_Horario>i.Cod_Horario AND h.Activo=1 AND h.Dia_Semana=i.Dia_Semana AND h.Hr_Inicio<i.Hr_Fin AND i.Hr_Inicio<h.Hr_Fin
 JOIN dbo.Grupo gh ON gh.Cod_Grupo=h.Grupo_Cod_Grupo JOIN dbo.Ciclo ch ON ch.Cod_Ciclo=gh.Ciclo_Cod_Ciclo
 WHERE i.Activo=1 AND ci.Fech_Inicio<=ch.Fech_Fin AND ch.Fech_Inicio<=ci.Fech_Fin AND (i.Grupo_Cod_Grupo=h.Grupo_Cod_Grupo OR gi.Aula_Cod_Aula=gh.Aula_Cod_Aula OR i.Docente_Asignatura_Docente_DNI_Doc=h.Docente_Asignatura_Docente_DNI_Doc))
 THROW 54051,'Hay cruces de grupo, aula o docente en los datos actuales.',1;
IF OBJECT_ID('dbo.TR_Horario_Sin_Cruces','TR') IS NULL EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER TR_Horario_Sin_Cruces
ON Horario AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 FROM inserted AS i
        JOIN Grupo AS g ON g.Cod_Grupo = i.Grupo_Cod_Grupo
        JOIN Turno AS t ON t.Cod_Turno = g.Turno_Cod_Turno
        WHERE i.Activo = 1
          AND (i.Hr_Inicio < t.Hr_Inicio OR i.Hr_Fin > t.Hr_Fin)
    )
        THROW 51002, ''Clase o recreo fuera del turno asignado al grupo.'', 1;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        JOIN Grupo AS gi ON gi.Cod_Grupo = i.Grupo_Cod_Grupo
        JOIN Ciclo AS ci ON ci.Cod_Ciclo = gi.Ciclo_Cod_Ciclo
        JOIN Horario AS h ON h.Cod_Horario <> i.Cod_Horario
            AND h.Activo = 1
            AND h.Dia_Semana = i.Dia_Semana
            AND i.Hr_Inicio < h.Hr_Fin
            AND h.Hr_Inicio < i.Hr_Fin
        JOIN Grupo AS gh ON gh.Cod_Grupo = h.Grupo_Cod_Grupo
        JOIN Ciclo AS ch ON ch.Cod_Ciclo = gh.Ciclo_Cod_Ciclo
        WHERE i.Activo = 1
          AND ci.Fech_Inicio <= ch.Fech_Fin
          AND ch.Fech_Inicio <= ci.Fech_Fin
          AND (
               i.Grupo_Cod_Grupo = h.Grupo_Cod_Grupo
            OR gi.Aula_Cod_Aula = gh.Aula_Cod_Aula
            OR (i.Docente_Asignatura_Docente_DNI_Doc IS NOT NULL
                AND i.Docente_Asignatura_Docente_DNI_Doc = h.Docente_Asignatura_Docente_DNI_Doc)
          )
    )
        THROW 51003, ''Cruce de horario: grupo, aula o docente ocupado.'', 1;
END;
';
IF EXISTS (SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID('dbo.TR_Horario_Sin_Cruces') AND is_disabled=1) THROW 54007,'Trigger original deshabilitado: TR_Horario_Sin_Cruces. Revisar manualmente.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Horario') AND name='IX_V4_Horario_DiaGrupo')
 CREATE INDEX IX_V4_Horario_DiaGrupo ON dbo.Horario(Dia_Semana,Grupo_Cod_Grupo,Hr_Inicio) INCLUDE (Hr_Fin,Activo,Docente_Asignatura_Docente_DNI_Doc);
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V4_Grupo_Historial ON dbo.Grupo AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo WHERE i.Ciclo_Cod_Ciclo<>d.Ciclo_Cod_Ciclo AND EXISTS (SELECT 1 FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=i.Cod_Grupo))
 THROW 54052,''No se puede cambiar el ciclo de un grupo con matriculas.'',1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo WHERE (i.Aula_Cod_Aula<>d.Aula_Cod_Aula OR i.Turno_Cod_Turno<>d.Turno_Cod_Turno OR i.Ciclo_Cod_Ciclo<>d.Ciclo_Cod_Ciclo) AND EXISTS (SELECT 1 FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=i.Cod_Grupo))
 THROW 54053,''Reorganice los bloques antes de cambiar aula, turno o ciclo.'',1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.Aula a ON a.Cod_Aula=i.Aula_Cod_Aula WHERE i.Cupo_Max>a.Capacidad OR i.Cupo_Max<(SELECT COUNT_BIG(*) FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=i.Cod_Grupo AND m.ESTADO_MATRICULA_Cod_Estado_Matricula=''ACTIVA''))
 THROW 54054,''Cupo incompatible con aula o matriculas activas.'',1;
END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V4_Ciclo_Historial ON dbo.Ciclo AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Ciclo=i.Cod_Ciclo WHERE (i.Programa_Cod_Programa<>d.Programa_Cod_Programa OR i.Modalidad<>d.Modalidad OR i.Fech_Inicio<>d.Fech_Inicio OR i.Fech_Fin<>d.Fech_Fin OR i.Nro_Mensualidades<>d.Nro_Mensualidades)
 AND EXISTS (SELECT 1 FROM dbo.Grupo g WHERE g.Ciclo_Cod_Ciclo=i.Cod_Ciclo AND (EXISTS (SELECT 1 FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo) OR EXISTS (SELECT 1 FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=g.Cod_Grupo))))
 THROW 54055,''No se puede redefinir una edicion con matriculas u horarios.'',1;
END;';

IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='05_ACTUALIZACION_HORARIOS')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES ('05_ACTUALIZACION_HORARIOS');
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT name,is_disabled FROM sys.triggers WHERE parent_id=OBJECT_ID('dbo.Horario');
