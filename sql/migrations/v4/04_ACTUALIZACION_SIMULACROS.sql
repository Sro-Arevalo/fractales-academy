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
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='03_ACTUALIZACION_PAGOS') THROW 54008,'Falta una migracion anterior. Respetar el orden de la guia.',1;
BEGIN TRY
BEGIN TRAN;

-- Examen, Examen_Grupo y Nota_Examen YA representan simulacros generales.
-- No hay asignatura ni curso en estas tablas. Las dos FK compuestas garantizan pertenencia al grupo.
IF EXISTS (SELECT 1 FROM dbo.Nota_Examen n JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo JOIN dbo.Examen e ON e.Cod_Examen=eg.Examen_Cod_Examen WHERE n.Puntaje_total<0 OR n.Puntaje_total>e.puntaje_maximo)
 THROW 54040,'Hay puntajes fuera de rango; requiere revision autorizada.',1;
IF EXISTS (SELECT m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen FROM dbo.Nota_Examen n JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo GROUP BY m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen HAVING COUNT_BIG(*)>1)
 THROW 54041,'Hay varios resultados del mismo alumno para un simulacro.',1;
IF OBJECT_ID('dbo.TR_Nota_Examen_Puntaje','TR') IS NULL EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER TR_Nota_Examen_Puntaje
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
END;
';
IF EXISTS (SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID('dbo.TR_Nota_Examen_Puntaje') AND is_disabled=1) THROW 54007,'Trigger original deshabilitado: TR_Nota_Examen_Puntaje. Revisar manualmente.',1;
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V4_Nota_Unica ON dbo.Nota_Examen AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Nota=i.Cod_Nota WHERE i.MATRICULA_Cod_Matricula<>d.MATRICULA_Cod_Matricula OR i.Examen_Grupo_Cod_examen_grupo<>d.Examen_Grupo_Cod_examen_grupo OR i.Grupo_Cod_Grupo<>d.Grupo_Cod_Grupo OR i.Fech_registro<>d.Fech_registro)
 THROW 54042,''La correccion de puntaje no puede reasignar su historial.'',1;
 IF EXISTS (SELECT m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen FROM dbo.Nota_Examen n WITH (UPDLOCK,HOLDLOCK) JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula
 JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo
 WHERE eg.Examen_Cod_Examen IN (SELECT e.Examen_Cod_Examen FROM inserted i JOIN dbo.Examen_Grupo e ON e.Cod_examen_grupo=i.Examen_Grupo_Cod_examen_grupo)
 GROUP BY m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen HAVING COUNT_BIG(*)>1)
 THROW 54043,''Solo se permite un puntaje total por alumno y simulacro.'',1;
END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V4_Examen_Maximo ON dbo.Examen AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted e JOIN dbo.Examen_Grupo eg ON eg.Examen_Cod_Examen=e.Cod_Examen JOIN dbo.Nota_Examen n ON n.Examen_Grupo_Cod_examen_grupo=eg.Cod_examen_grupo WHERE n.Puntaje_total>e.puntaje_maximo)
 THROW 54044,''El nuevo maximo es menor que un puntaje registrado.'',1;
END;';

IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='04_ACTUALIZACION_SIMULACROS')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES ('04_ACTUALIZACION_SIMULACROS');
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT name,is_disabled FROM sys.triggers WHERE parent_id IN (OBJECT_ID('dbo.Nota_Examen'),OBJECT_ID('dbo.Examen'));
