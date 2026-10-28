-- SOLO LOCAL/BASE INDEPENDIENTE DE PRUEBAS. Nunca Azure/producción.
-- Requiere V4.3 y un administrador de pruebas previamente creado con seed:admin.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @Confirmacion varchar(40)=''; -- Escribir CREAR DATOS FICTICIOS para ejecutar.
DECLARE @Administrador varchar(20)='REEMPLAZAR';
DECLARE @HashBcrypt varchar(255)=''; -- Generar localmente con bcrypt; nunca una contraseña en texto plano.
IF DB_NAME() NOT LIKE N'FractalesAcademy[_]Pruebas[_]V4[_]3%' THROW 54308,'Solo se admite una base independiente de pruebas V4.3.',1;
IF OBJECT_ID('dbo.APODERADO') IS NULL THROW 54307,'Completa V4.3 primero.',1;
SELECT '43999090' DNI_Apoderado,'43000090' DNI_Alumno,'4 cuotas de S/250 + S/50 = S/1050' Obligaciones,'Es_Prueba=1' Identificacion;
IF @Confirmacion='' RETURN;
IF @Confirmacion<>'CREAR DATOS FICTICIOS' OR LEFT(@HashBcrypt,4) NOT IN ('$2a$','$2b$') OR LEN(@HashBcrypt)<>60 THROW 54309,'Confirma la carga y proporciona un hash bcrypt valido generado localmente.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Usuario WHERE Cod_Usuario=@Administrador AND ROL_Cod_Rol='ADMIN' AND Activo=1) THROW 54309,'Selecciona un administrador de pruebas activo.',1;
BEGIN TRY
 BEGIN TRAN;
 IF EXISTS(SELECT 1 FROM dbo.ALUMNO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_Alu='43000090') THROW 54309,'El DNI de prueba ya existe; no se sobrescribe.',1;
 IF EXISTS(SELECT 1 FROM dbo.APODERADO WHERE DNI_Apoderado='43999090') THROW 54309,'El DNI de apoderado reservado ya existe; no se sobrescribe.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.CARRERA WHERE Cod_Carrera='V43-DEMO') INSERT dbo.CARRERA VALUES('V43-DEMO','Carrera ficticia V43');
 IF NOT EXISTS(SELECT 1 FROM dbo.Aula WHERE Cod_Aula='V43-DEMO') INSERT dbo.Aula(Cod_Aula,Nomb_Aula,Capacidad) VALUES('V43-DEMO','Aula ficticia V43',20);
 IF NOT EXISTS(SELECT 1 FROM dbo.Ciclo WHERE Cod_Ciclo='V43-DEMO') INSERT dbo.Ciclo(Cod_Ciclo,Programa_Cod_Programa,Nomb_Ciclo,Modalidad,Fech_Inicio,Fech_Fin,Nro_Mensualidades,Precio_Mensual,ESTADO_CICLO_Cod_Estado)
  VALUES('V43-DEMO','PREUNIV','Ciclo ficticio V43','REGULAR','20280131','20280530',4,250,'PROGRAMADO');
 IF NOT EXISTS(SELECT 1 FROM dbo.Grupo WHERE Cod_Grupo='V43-DEMO') INSERT dbo.Grupo(Cod_Grupo,Nomb_Grupo,Cupo_Max,Turno_Cod_Turno,Aula_Cod_Aula,Ciclo_Cod_Ciclo) VALUES('V43-DEMO','Grupo ficticio V43',20,'MANANA','V43-DEMO','V43-DEMO');
 IF NOT EXISTS(SELECT 1 FROM dbo.Grupo g JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo WHERE g.Cod_Grupo='V43-DEMO' AND g.Activo=1 AND c.Modalidad='REGULAR' AND c.Nro_Mensualidades=4 AND c.Precio_Mensual=250)
  THROW 54309,'El grupo reservado tiene otra configuracion; no se reutiliza.',1;
 INSERT dbo.APODERADO(DNI_Apoderado,Nomb_Apoderado,Cel_Apoderado) VALUES('43999090','Apoderado ficticio V43','900000090');
 INSERT dbo.ALUMNO(DNI_Alu,Nomb_Alu,Nomb_Apoderado,DNI_Apoderado,Cel_Apoderado,PARENTESCO_Cod_Paren,CARRERA_Cod_Carrera,Es_Prueba)
  VALUES('43000090','Estudiante ficticio V43','Apoderado ficticio V43','43999090','900000090','TUTOR','V43-DEMO',1);
 DECLARE @u varchar(20)='U4'+RIGHT(REPLICATE('0',18)+CONVERT(varchar(18),NEXT VALUE FOR dbo.Seq_Operacion_V4),18);
 DECLARE @m varchar(20)='M4'+RIGHT(REPLICATE('0',18)+CONVERT(varchar(18),NEXT VALUE FOR dbo.Seq_Operacion_V4),18);
 INSERT dbo.Usuario(Cod_Usuario,Nomb_Usuario,Clave_Hash,ROL_Cod_Rol,ALUMNO_DNI_Alu,Debe_Cambiar_Clave) VALUES(@u,'43000090',@HashBcrypt,'ALUMNO','43000090',1);
 INSERT dbo.MATRICULA(Cod_Matricula,ALUMNO_DNI_Alu,Grupo_Cod_Grupo,ESTADO_MATRICULA_Cod_Estado_Matricula) VALUES(@m,'43000090','V43-DEMO','ACTIVA');
 DECLARE @n tinyint=1;
 WHILE @n<=4
 BEGIN
  INSERT dbo.Pago(Cod_Pago,CONCEPTO_PAGO_Cod_Concepto,Nro_Mensualidad,Monto,Fech_Vencimiento,ESTADO_PAGO_Cod_Estado,ALUMNO_DNI_Alu,MATRICULA_Cod_Matricula)
   SELECT 'P4'+RIGHT(REPLICATE('0',18)+CONVERT(varchar(18),NEXT VALUE FOR dbo.Seq_Operacion_V4),18),'MENSUALIDAD',@n,250,DATEADD(month,@n-1,Fech_Inicio),'PENDIENTE','43000090',@m FROM dbo.Ciclo WHERE Cod_Ciclo='V43-DEMO';
  SET @n=@n+1;
 END;
 INSERT dbo.Pago(Cod_Pago,CONCEPTO_PAGO_Cod_Concepto,Monto,ESTADO_PAGO_Cod_Estado,ALUMNO_DNI_Alu)
  VALUES('P4'+RIGHT(REPLICATE('0',18)+CONVERT(varchar(18),NEXT VALUE FOR dbo.Seq_Operacion_V4),18),'MATRICULA_INICIAL',50,'PENDIENTE','43000090');
 INSERT dbo.Auditoria_V4(Entidad,Codigo,Accion,Usuario_Cod_Usuario,Motivo) VALUES('ALUMNO','43000090','CREAR_PRUEBA',@Administrador,'Carga local ficticia V4.3 confirmada');
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
