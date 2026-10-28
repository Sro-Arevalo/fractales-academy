-- Modo mantenimiento desde este paso hasta terminar 05. Backup/PITR comprobado antes.
-- No elimina tablas ni filas. Grupo se reutiliza como cabecera, Horario como detalle.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
IF DB_NAME()<>@BaseEsperada THROW 54400,'Confirma @BaseEsperada y servidor.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V43_01_APODERADOS_Y_PRUEBAS') THROW 54401,'Se requiere V4.3 completa.',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) THROW 54402,'Hay relaciones no confiables.',1;
BEGIN TRY
 BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WITH(UPDLOCK,HOLDLOCK) WHERE Script='V44_01_PREPARAR')
 BEGIN
  IF COL_LENGTH('dbo.Grupo','Estado_Horario') IS NOT NULL THROW 54403,'Estructura parcial sin registro: revisar antes de continuar.',1;
  ALTER TABLE dbo.ALUMNO ALTER COLUMN Nomb_Apoderado varchar(120) NULL;
  ALTER TABLE dbo.ALUMNO ALTER COLUMN PARENTESCO_Cod_Paren varchar(5) NULL;
  ALTER TABLE dbo.Grupo ADD Estado_Horario varchar(10) NOT NULL CONSTRAINT DF_Grupo_EstadoHorario DEFAULT('BORRADOR') WITH VALUES,
   Version_Horario int NOT NULL CONSTRAINT DF_Grupo_VersionHorario DEFAULT(1) WITH VALUES;
  EXEC(N'ALTER TABLE dbo.Grupo ADD CONSTRAINT CK_Grupo_EstadoHorario CHECK(Estado_Horario IN(''BORRADOR'',''PUBLICADO'')),CONSTRAINT CK_Grupo_VersionHorario CHECK(Version_Horario>0);');
  ALTER TABLE dbo.Horario ADD Excepcion_Turno bit NOT NULL CONSTRAINT DF_Horario_Excepcion DEFAULT(0) WITH VALUES,
   Motivo_Excepcion nvarchar(250) NULL,Autorizado_Por varchar(20) NULL;
  EXEC(N'ALTER TABLE dbo.Horario WITH CHECK ADD CONSTRAINT FK_Horario_Autorizador FOREIGN KEY(Autorizado_Por) REFERENCES dbo.Usuario(Cod_Usuario);
   ALTER TABLE dbo.Horario ADD CONSTRAINT CK_Horario_Excepcion CHECK((Excepcion_Turno=0 AND Motivo_Excepcion IS NULL AND Autorizado_Por IS NULL) OR
   (Excepcion_Turno=1 AND LEN(LTRIM(RTRIM(Motivo_Excepcion)))>=5 AND Autorizado_Por IS NOT NULL));');
  -- Huellas de las filas previas. Se excluyen SOLO columnas nuevas y contactos que se completaran desde la entidad antigua.
  DECLARE @t sysname,@pk sysname,@label sysname,@cols nvarchar(max),@q nvarchar(max);
  DECLARE bases CURSOR LOCAL FAST_FORWARD FOR SELECT * FROM(VALUES('ALUMNO','DNI_Alu'),('Usuario','Cod_Usuario'),('MATRICULA','Cod_Matricula'),('Pago','Cod_Pago'),('Grupo','Cod_Grupo'),('Horario','Cod_Horario'),('Nota_Examen','Cod_Nota')) x(t,p);
  OPEN bases; FETCH NEXT FROM bases INTO @t,@pk;
  WHILE @@FETCH_STATUS=0
  BEGIN
   SELECT @cols=STRING_AGG(CONVERT(nvarchar(max),'r.'+QUOTENAME(name)),',') WITHIN GROUP(ORDER BY column_id) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.'+@t)
    AND name NOT IN('Estado_Horario','Version_Horario','Excepcion_Turno','Motivo_Excepcion','Autorizado_Por')
    AND NOT(@t='ALUMNO' AND name IN('Nomb_Apoderado','Cel_Apoderado','Correo_Apoderado'));
   SET @q=N'INSERT dbo.Linea_Base_V4(Tabla,Clave,Huella) SELECT @label,CONVERT(nvarchar(200),r.'+QUOTENAME(@pk)+'),HASHBYTES(''SHA2_256'',(SELECT '+@cols+' FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES)) FROM dbo.'+QUOTENAME(@t)+' r WITH(TABLOCKX,HOLDLOCK);';
   SET @label=N'V44/'+@t;
   EXEC sys.sp_executesql @q,N'@label sysname',@label=@label;
   FETCH NEXT FROM bases INTO @t,@pk;
  END;
  CLOSE bases; DEALLOCATE bases;
  INSERT dbo.Control_Migracion_V4(Script) VALUES('V44_01_PREPARAR');
 END;
 COMMIT;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
