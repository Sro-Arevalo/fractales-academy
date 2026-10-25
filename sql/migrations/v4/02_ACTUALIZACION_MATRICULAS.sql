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
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='01_ACTUALIZACION_CELULARES') THROW 54008,'Falta una migracion anterior. Respetar el orden de la guia.',1;
BEGIN TRY
BEGIN TRAN;

-- MATRICULA ya conserva alumno, grupo y fecha; Grupo ya relaciona ciclo, turno y aula.
-- No se duplican estas columnas. Se usa Seq_Operacion_V4 (00A) para los códigos nuevos.
IF EXISTS (SELECT m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo FROM dbo.MATRICULA m JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo GROUP BY m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo HAVING COUNT_BIG(*)>1)
 THROW 54020,'Hay matriculas repetidas de un alumno en el mismo ciclo. Revisar sin borrar historiales.',1;
IF EXISTS (SELECT 1 FROM dbo.Grupo g WHERE (SELECT COUNT_BIG(*) FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo AND m.ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA')>g.Cupo_Max)
 THROW 54021,'Hay grupos con cupo excedido; requiere revision.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.MATRICULA') AND name='IX_V4_Matricula_GrupoEstado')
 CREATE INDEX IX_V4_Matricula_GrupoEstado ON dbo.MATRICULA(Grupo_Cod_Grupo,ESTADO_MATRICULA_Cod_Estado_Matricula);
IF OBJECT_ID('dbo.TR_Matricula_CupoMaximo','TR') IS NULL EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER TR_Matricula_CupoMaximo
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
END;
';
IF EXISTS (SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID('dbo.TR_Matricula_CupoMaximo') AND is_disabled=1) THROW 54007,'Trigger original deshabilitado: TR_Matricula_CupoMaximo. Revisar manualmente.',1;
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V4_Matricula_Historial ON dbo.MATRICULA AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Matricula=i.Cod_Matricula WHERE i.ALUMNO_DNI_Alu<>d.ALUMNO_DNI_Alu OR i.Grupo_Cod_Grupo<>d.Grupo_Cod_Grupo OR i.Fech_Matricula<>d.Fech_Matricula)
 THROW 54022,''No se permite reasignar alumno, grupo o fecha de una matricula historica.'',1;
 IF EXISTS (SELECT m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo
 JOIN (SELECT DISTINCT ALUMNO_DNI_Alu FROM inserted) i ON i.ALUMNO_DNI_Alu=m.ALUMNO_DNI_Alu GROUP BY m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo HAVING COUNT_BIG(*)>1)
 THROW 54023,''El alumno ya tiene matricula en este ciclo.'',1;
END;';

IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='02_ACTUALIZACION_MATRICULAS')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES ('02_ACTUALIZACION_MATRICULAS');
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT name,is_disabled FROM sys.triggers WHERE parent_id=OBJECT_ID('dbo.MATRICULA');
