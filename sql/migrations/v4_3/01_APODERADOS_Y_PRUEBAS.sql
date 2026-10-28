-- Incremental y no destructivo. Revisar respaldo y ejecutar 00_DIAGNOSTICO.sql primero.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN ('master','model','msdb','tempdb') THROW 54300,'Confirma servidor y @BaseEsperada antes de migrar.',1;
IF OBJECT_ID('dbo.Control_Migracion_V4') IS NULL THROW 54301,'Completa V4 y V4.1 antes de V4.3.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V41_04_AUDITORIA_ADMINISTRATIVA') THROW 54301,'Completa V4.1 antes de V4.3.',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) THROW 54302,'Revisa restricciones deshabilitadas o no confiables.',1;
BEGIN TRY
 BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WITH (UPDLOCK,HOLDLOCK) WHERE Script='V43_01_APODERADOS_Y_PRUEBAS')
 BEGIN
  IF OBJECT_ID('dbo.APODERADO') IS NOT NULL OR COL_LENGTH('dbo.ALUMNO','Es_Prueba') IS NOT NULL OR COL_LENGTH('dbo.Usuario','Correo_Recuperacion') IS NOT NULL OR COL_LENGTH('dbo.Usuario','Correo_Verificado') IS NOT NULL THROW 54303,'Hay objetos V4.3 sin registro de migracion. No se asume su propiedad.',1;
  IF EXISTS(SELECT 1 FROM dbo.ALUMNO WHERE DNI_Apoderado IS NOT NULL GROUP BY DNI_Apoderado
   HAVING COUNT(DISTINCT Nomb_Apoderado)>1 OR COUNT(DISTINCT ISNULL(Cel_Apoderado,''))>1 OR COUNT(DISTINCT ISNULL(Correo_Apoderado,''))>1)
   THROW 54304,'Hay apoderados con el mismo DNI y datos distintos. Revisa el diagnostico sin sobrescribir personas.',1;
  CREATE TABLE dbo.APODERADO(
   DNI_Apoderado varchar(8) NOT NULL CONSTRAINT PK_APODERADO PRIMARY KEY,
   Nomb_Apoderado varchar(120) NOT NULL,
   Cel_Apoderado varchar(9) NULL,
   Correo_Apoderado varchar(150) NULL,
   CONSTRAINT CK_APODERADO_DNI CHECK(DATALENGTH(DNI_Apoderado)=8 AND DNI_Apoderado COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9]%'),
   CONSTRAINT CK_APODERADO_Cel CHECK(Cel_Apoderado IS NULL OR (DATALENGTH(Cel_Apoderado)=9 AND Cel_Apoderado COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9]%')),
   CONSTRAINT CK_APODERADO_Nombre CHECK(LEN(LTRIM(RTRIM(Nomb_Apoderado)))>0));
  INSERT dbo.APODERADO(DNI_Apoderado,Nomb_Apoderado,Cel_Apoderado,Correo_Apoderado)
   SELECT DNI_Apoderado,MAX(Nomb_Apoderado),MAX(Cel_Apoderado),MAX(Correo_Apoderado) FROM dbo.ALUMNO WHERE DNI_Apoderado IS NOT NULL GROUP BY DNI_Apoderado;
  -- Los alumnos antiguos sin DNI de apoderado permanecen sin vinculo, sin inventar identidad.
  ALTER TABLE dbo.ALUMNO WITH CHECK ADD CONSTRAINT FK_ALUMNO_APODERADO FOREIGN KEY(DNI_Apoderado) REFERENCES dbo.APODERADO(DNI_Apoderado);
  CREATE INDEX IX_ALUMNO_APODERADO ON dbo.ALUMNO(DNI_Apoderado);
  ALTER TABLE dbo.ALUMNO ADD Es_Prueba bit NOT NULL CONSTRAINT DF_ALUMNO_EsPrueba DEFAULT(0) WITH VALUES;
  ALTER TABLE dbo.Usuario ADD Correo_Recuperacion varchar(150) NULL,
   Correo_Verificado bit NOT NULL CONSTRAINT DF_Usuario_CorreoVerificado DEFAULT(0) WITH VALUES;
  EXEC sys.sp_executesql N'ALTER TABLE dbo.Usuario WITH CHECK ADD CONSTRAINT CK_Usuario_CorreoVerificado CHECK(Correo_Verificado=0 OR Correo_Recuperacion IS NOT NULL);';
  EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V43_Usuario_Correo ON dbo.Usuario AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Usuario=i.Cod_Usuario
     WHERE (ISNULL(i.Correo_Recuperacion,'''')<>ISNULL(d.Correo_Recuperacion,'''') OR d.Correo_Verificado=0) AND i.Correo_Verificado=1
     AND NOT EXISTS(SELECT 1 FROM dbo.Cuenta_Codigo_V41 c WHERE c.Usuario_Cod_Usuario=i.Cod_Usuario AND c.Proposito=''VERIFICAR_CONTACTO'' AND c.Canal=''EMAIL'' AND c.Destino=i.Correo_Recuperacion AND c.Consumido=1 AND c.Expira>SYSUTCDATETIME()))
    THROW 54309,''El correo de recuperacion debe verificarse con un codigo vigente.'',1;
  END;';
  -- La marca solo se establece al crear el registro; no convertir personas reales en pruebas.
  EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V43_MarcaPrueba ON dbo.ALUMNO AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.DNI_Alu=i.DNI_Alu WHERE i.Es_Prueba<>d.Es_Prueba)
    THROW 54305,''La identificacion de prueba solo se establece al crear el estudiante.'',1;
  END;';
  -- Las columnas antiguas se mantienen sincronizadas para los clientes anteriores.
  EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V43_Apoderado_Alumno ON dbo.ALUMNO AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.APODERADO p ON p.DNI_Apoderado=i.DNI_Apoderado
    WHERE i.Nomb_Apoderado<>p.Nomb_Apoderado OR ISNULL(i.Cel_Apoderado,'''')<>ISNULL(p.Cel_Apoderado,'''') OR ISNULL(i.Correo_Apoderado,'''')<>ISNULL(p.Correo_Apoderado,''''))
    THROW 54306,''Edita los datos compartidos desde Apoderados.'',1;
  END;';
  EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V43_Apoderado_Compartido ON dbo.APODERADO AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   UPDATE a SET Nomb_Apoderado=i.Nomb_Apoderado,Cel_Apoderado=i.Cel_Apoderado,Correo_Apoderado=i.Correo_Apoderado
   FROM dbo.ALUMNO a JOIN inserted i ON i.DNI_Apoderado=a.DNI_Apoderado;
  END;';
  -- Conservar tarifas históricas; nuevas ediciones o cambios de tarifa deben respetar S/250.
  EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V43_Tarifa_Ciclo ON dbo.Ciclo AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Ciclo=i.Cod_Ciclo WHERE i.Precio_Mensual<>250 AND (d.Cod_Ciclo IS NULL OR d.Precio_Mensual<>i.Precio_Mensual))
    THROW 54309,''La tarifa nueva debe ser S/250 por mensualidad. Las obligaciones historicas se conservan.'',1;
  END;';
  INSERT dbo.Control_Migracion_V4(Script) VALUES('V43_01_APODERADOS_Y_PRUEBAS');
 END;
 IF OBJECT_ID('dbo.PK_APODERADO','PK') IS NULL OR OBJECT_ID('dbo.FK_ALUMNO_APODERADO','F') IS NULL OR COL_LENGTH('dbo.ALUMNO','Es_Prueba') IS NULL
  THROW 54307,'El esquema V4.3 esta incompleto. Restaura o revisa; no reconstruyas tablas con historia.',1;
 IF EXISTS(SELECT 1 FROM (VALUES('DNI_Apoderado','varchar',8,0),('Nomb_Apoderado','varchar',120,0),('Cel_Apoderado','varchar',9,1),('Correo_Apoderado','varchar',150,1)) e(Nombre,Tipo,Longitud,Nulo)
  LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID('dbo.APODERADO') AND c.name=e.Nombre LEFT JOIN sys.types t ON t.user_type_id=c.user_type_id
  WHERE c.column_id IS NULL OR t.name<>e.Tipo OR c.max_length<>e.Longitud OR c.is_nullable<>e.Nulo)
  THROW 54307,'Tipos o nulabilidad inesperados en APODERADO.',1;
 IF NOT EXISTS(SELECT 1 FROM sys.columns c JOIN sys.types t ON t.user_type_id=c.user_type_id WHERE c.object_id=OBJECT_ID('dbo.ALUMNO') AND c.name='Es_Prueba' AND t.name='bit' AND c.is_nullable=0)
  THROW 54307,'La identificacion de pruebas tiene una estructura inesperada.',1;
 IF COL_LENGTH('dbo.Usuario','Correo_Recuperacion')<>150 OR COL_LENGTH('dbo.Usuario','Correo_Verificado') IS NULL THROW 54307,'Faltan campos de recuperacion de administradores.',1;
 IF EXISTS(SELECT 1 FROM (VALUES('TR_V43_MarcaPrueba'),('TR_V43_Apoderado_Alumno'),('TR_V43_Apoderado_Compartido'),('TR_V43_Tarifa_Ciclo'),('TR_V43_Usuario_Correo')) e(Nombre)
  LEFT JOIN sys.triggers t ON t.object_id=OBJECT_ID('dbo.'+e.Nombre) WHERE t.object_id IS NULL OR t.is_disabled=1)
  THROW 54307,'Falta una proteccion V4.3 o esta deshabilitada.',1;
 IF EXISTS(SELECT 1 FROM (VALUES('CK_APODERADO_DNI'),('CK_APODERADO_Cel'),('CK_APODERADO_Nombre')) e(Nombre)
  LEFT JOIN sys.check_constraints c ON c.object_id=OBJECT_ID('dbo.'+e.Nombre) WHERE c.object_id IS NULL OR c.is_disabled=1 OR c.is_not_trusted=1)
  THROW 54307,'Falta una restriccion validada de APODERADO.',1;
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
