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
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='02_ACTUALIZACION_MATRICULAS') THROW 54008,'Falta una migracion anterior. Respetar el orden de la guia.',1;
BEGIN TRY
BEGIN TRAN;

-- Pago es la obligación y conserva su importe original; no se crea otra tabla de deudas.
IF EXISTS (SELECT MATRICULA_Cod_Matricula,Nro_Mensualidad FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD' GROUP BY MATRICULA_Cod_Matricula,Nro_Mensualidad HAVING COUNT_BIG(*)>1)
 THROW 54030,'Hay mensualidades duplicadas. No se realizo ninguna conciliacion automatica.',1;
IF EXISTS (SELECT ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES') GROUP BY ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto HAVING COUNT_BIG(*)>1)
 THROW 54031,'Hay conceptos unicos duplicados.',1;
IF EXISTS (SELECT 1 FROM dbo.Pago p JOIN dbo.MATRICULA m ON m.Cod_Matricula=p.MATRICULA_Cod_Matricula JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo WHERE p.CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD' AND p.Nro_Mensualidad>c.Nro_Mensualidades)
 THROW 54032,'Existen mensualidades incompatibles con su ciclo.',1;
IF EXISTS (SELECT 1 FROM dbo.Pago WHERE Medio_Pago IS NOT NULL AND Medio_Pago NOT IN ('YAPE','EFECTIVO','TARJETA'))
 AND OBJECT_ID('dbo.MEDIO_PAGO') IS NULL
 THROW 54033,'Hay medios de pago ajenos al modelo original. Catalogarlos mediante una migracion revisada.',1;
IF OBJECT_ID('dbo.MEDIO_PAGO') IS NULL
 CREATE TABLE dbo.MEDIO_PAGO (Cod_Medio varchar(10) NOT NULL CONSTRAINT PK_MEDIO_PAGO PRIMARY KEY,Nomb_Medio varchar(60) NOT NULL,
 Activo bit NOT NULL CONSTRAINT DF_MEDIO_PAGO_Activo DEFAULT (1),CONSTRAINT UQ_MEDIO_PAGO_Nombre UNIQUE(Nomb_Medio),
 CONSTRAINT CK_MEDIO_PAGO_Codigo CHECK (DATALENGTH(Cod_Medio) BETWEEN 1 AND 10 AND Cod_Medio COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^A-Z0-9_-]%'));
IF NOT EXISTS(SELECT 1 FROM dbo.MEDIO_PAGO WHERE Cod_Medio='EFECTIVO') INSERT dbo.MEDIO_PAGO(Cod_Medio,Nomb_Medio) VALUES('EFECTIVO','Efectivo');
IF NOT EXISTS(SELECT 1 FROM dbo.MEDIO_PAGO WHERE Cod_Medio='YAPE') INSERT dbo.MEDIO_PAGO(Cod_Medio,Nomb_Medio) VALUES('YAPE','Yape');
IF NOT EXISTS(SELECT 1 FROM dbo.MEDIO_PAGO WHERE Cod_Medio='TARJETA') INSERT dbo.MEDIO_PAGO(Cod_Medio,Nomb_Medio) VALUES('TARJETA','Tarjeta');
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID('dbo.Pago') AND name='FK_V4_Pago_Medio')
 ALTER TABLE dbo.Pago WITH CHECK ADD CONSTRAINT FK_V4_Pago_Medio FOREIGN KEY(Medio_Pago) REFERENCES dbo.MEDIO_PAGO(Cod_Medio);
-- Reemplazo atómico del CHECK cerrado por una FK validada; ningún dato se elimina.
IF OBJECT_ID('dbo.CK_Pago_Medio','C') IS NOT NULL ALTER TABLE dbo.Pago DROP CONSTRAINT CK_Pago_Medio;
ALTER TABLE dbo.Pago WITH CHECK CHECK CONSTRAINT FK_V4_Pago_Medio;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Pago') AND name='UX_Pago_ConceptoUnicoAlumno')
 CREATE UNIQUE INDEX UX_Pago_ConceptoUnicoAlumno ON dbo.Pago(ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto) WHERE CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Pago') AND name='UX_Pago_MensualidadMatricula')
 CREATE UNIQUE INDEX UX_Pago_MensualidadMatricula ON dbo.Pago(MATRICULA_Cod_Matricula,Nro_Mensualidad) WHERE CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD';
IF OBJECT_ID('dbo.TR_Pago_Mes_Valido','TR') IS NULL EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER TR_Pago_Mes_Valido
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
END;
';
IF EXISTS (SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID('dbo.TR_Pago_Mes_Valido') AND is_disabled=1) THROW 54007,'Trigger original deshabilitado: TR_Pago_Mes_Valido. Revisar manualmente.',1;
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V4_Pago_Obligacion ON dbo.Pago AFTER INSERT,UPDATE AS
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
END;';
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V4_Auditoria_Inmutable ON dbo.Auditoria_V4 INSTEAD OF UPDATE,DELETE AS
BEGIN SET NOCOUNT ON; THROW 54037,''El historial de auditoria no se puede modificar ni eliminar.'',1; END;';

IF NOT EXISTS (SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='03_ACTUALIZACION_PAGOS')
 INSERT dbo.Control_Migracion_V4 (Script) VALUES ('03_ACTUALIZACION_PAGOS');
COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT * FROM dbo.MEDIO_PAGO; SELECT name,is_disabled,is_not_trusted FROM sys.foreign_keys WHERE name='FK_V4_Pago_Medio';
