-- OPCIONAL, solo una base LOCAL de ensayo V4.5. No usar en Azure/produccion.
-- Las pruebas completas de inscripcion/cuotas/horario se generan por API con npm run test:sql:v45.
SET NOCOUNT ON; SET XACT_ABORT ON;
DECLARE @Ejecutar bit=0, @Confirmacion nvarchar(80)=N'REVISAR';
DECLARE @HashBcrypt varchar(60)=NULL; -- generar localmente con bcrypt (coste 12); nunca una clave en texto.
DECLARE @Administrador varchar(20)=NULL;
SELECT N'45999999' DNI_ALUMNO,N'Estudiante ficticio SQL V45' NOMBRE_COMPLETO,N'V45-TEST-SQL' ID_USUARIO,N'Cuenta y ficha INACTIVAS; sin obligaciones financieras' ALCANCE;
IF @Ejecutar=0 RETURN;
IF @@SERVERNAME LIKE '%database.windows.net%' OR DB_NAME() NOT LIKE 'FractalesAcademy[_]Pruebas[_]V4[_]5[_]%'
 THROW 54510,'Solo base local de pruebas V4.5.',1;
IF @Confirmacion<>N'CREAR FICTICIO 45999999' OR @HashBcrypt IS NULL OR @HashBcrypt NOT LIKE '$2[aby]$12$%' OR LEN(@HashBcrypt)<>60
 THROW 54510,'Confirma alcance y proporciona hash bcrypt local valido.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.CONTROL_MIGRACION WHERE SCRIPT='V45_08_FINALIZAR') THROW 54510,'Completa V4.5 antes de crear pruebas.',1;
BEGIN TRY BEGIN TRAN;
IF NOT EXISTS(SELECT 1 FROM dbo.USUARIO WITH(UPDLOCK,HOLDLOCK) WHERE ID_USUARIO=@Administrador AND ID_ROL='ADMIN' AND ACTIVO=1) THROW 54510,'Selecciona administrador activo.',1;
IF EXISTS(SELECT 1 FROM dbo.ALUMNO WITH(UPDLOCK,HOLDLOCK) WHERE DNI_ALUMNO='45999999') OR EXISTS(SELECT 1 FROM dbo.USUARIO WITH(UPDLOCK,HOLDLOCK) WHERE ID_USUARIO='V45-TEST-SQL' OR NOMBRE_USUARIO='45999999')
 THROW 54510,'Identificador ocupado. No se sobrescribe ni reclasifica informacion.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.CARRERA WHERE ID_CARRERA='V45-TEST') INSERT dbo.CARRERA(ID_CARRERA,NOMBRE_CARRERA) VALUES('V45-TEST','Carrera ficticia SQL V45');
INSERT dbo.ALUMNO(DNI_ALUMNO,NOMBRE_COMPLETO,ID_CARRERA,ES_PRUEBA) VALUES('45999999','Estudiante ficticio SQL V45','V45-TEST',1);
INSERT dbo.USUARIO(ID_USUARIO,NOMBRE_USUARIO,CLAVE_HASH,ID_ROL,DNI_ALUMNO,ACTIVO,DEBE_CAMBIAR_CLAVE) VALUES('V45-TEST-SQL','45999999',@HashBcrypt,'ALUMNO','45999999',0,1);
-- El estado se administrara desde la ficha; no se crea una cuenta capaz de iniciar sesion.
INSERT dbo.ESTADO_ALUMNO(DNI_ALUMNO,ACTIVO,ACCESO_ACTIVO_ANTERIOR,MOTIVO,ID_USUARIO_RESPONSABLE) VALUES('45999999',0,0,'Prueba local explicita SQL V45',@Administrador);
INSERT dbo.AUDITORIA_SISTEMA(ENTIDAD,ID_REGISTRO,ACCION,ID_USUARIO_RESPONSABLE,NOMBRE_ACTOR,ROL_ACTOR,ES_PRUEBA,PROTEGIDO,MOTIVO)
 SELECT 'ALUMNO','45999999','CREAR_PRUEBA_SQL',ID_USUARIO,NOMBRE_USUARIO,ID_ROL,1,1,'Fixture local creado por SQL10' FROM dbo.USUARIO WHERE ID_USUARIO=@Administrador;
COMMIT; END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
