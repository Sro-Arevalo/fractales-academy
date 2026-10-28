-- Revisar el administrador responsable; snapshot completo de TODOS los apoderados,
-- incluso los no vinculados, en auditoria inmutable. No se descarta su informacion.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
DECLARE @AdministradorMigracion varchar(20)='AdminFractales';
IF DB_NAME()<>@BaseEsperada THROW 54400,'Confirma @BaseEsperada y servidor.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V44_01_PREPARAR') THROW 54401,'Ejecuta 01 primero.',1;
BEGIN TRY
 BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WITH(UPDLOCK,HOLDLOCK) WHERE Script='V44_02_MIGRAR')
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM dbo.Usuario WHERE Cod_Usuario=@AdministradorMigracion AND ROL_Cod_Rol='ADMIN' AND Activo=1) THROW 54404,'Indica una cuenta administradora activa responsable de la migracion.',1;
  IF EXISTS(SELECT 1 FROM dbo.ALUMNO a JOIN dbo.APODERADO p ON p.DNI_Apoderado=a.DNI_Apoderado WHERE
   (NULLIF(a.Nomb_Apoderado,'') IS NOT NULL AND a.Nomb_Apoderado<>p.Nomb_Apoderado)
   OR (a.Cel_Apoderado IS NOT NULL AND ISNULL(a.Cel_Apoderado,'')<>ISNULL(p.Cel_Apoderado,''))
   OR (a.Correo_Apoderado IS NOT NULL AND ISNULL(a.Correo_Apoderado,'')<>ISNULL(p.Correo_Apoderado,''))) THROW 54405,'Contactos distintos: resolver el conflicto sin sobrescribir informacion.',1;
  INSERT dbo.Auditoria_V4(Entidad,Codigo,Accion,Anterior,Nuevo,Usuario_Cod_Usuario,Motivo)
   SELECT 'APODERADO',p.DNI_Apoderado,'MIGRAR_V44',(SELECT p.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES),NULL,@AdministradorMigracion,
   'Respaldo V4.4 de la entidad retirada; incluye apoderados sin alumnos.' FROM dbo.APODERADO p WITH(TABLOCKX,HOLDLOCK);
  UPDATE a SET Nomb_Apoderado=p.Nomb_Apoderado,Cel_Apoderado=p.Cel_Apoderado,Correo_Apoderado=p.Correo_Apoderado FROM dbo.ALUMNO a JOIN dbo.APODERADO p ON p.DNI_Apoderado=a.DNI_Apoderado;
  -- Mantener bloques/ids y matriculas. Publicaciones heredadas sin bloques conservan su estado operativo.
  UPDATE g SET Estado_Horario='PUBLICADO' FROM dbo.Grupo g WHERE EXISTS(SELECT 1 FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=g.Cod_Grupo AND h.Activo=1)
   OR EXISTS(SELECT 1 FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo);
  IF EXISTS(SELECT 1 FROM dbo.Grupo WHERE Activo=1 AND Estado_Horario='PUBLICADO' GROUP BY Ciclo_Cod_Ciclo,Turno_Cod_Turno,Aula_Cod_Aula HAVING COUNT(*)>1)
   THROW 54406,'Existen horarios activos duplicados por ciclo, turno y aula. Revisar diagnostico; no se fusionan ni desactivan automaticamente.',1;
  CREATE UNIQUE INDEX UX_Grupo_UnidadPublicada ON dbo.Grupo(Ciclo_Cod_Ciclo,Turno_Cod_Turno,Aula_Cod_Aula) WHERE Activo=1 AND Estado_Horario='PUBLICADO';
  INSERT dbo.Control_Migracion_V4(Script) VALUES('V44_02_MIGRAR');
 END;
 COMMIT;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
