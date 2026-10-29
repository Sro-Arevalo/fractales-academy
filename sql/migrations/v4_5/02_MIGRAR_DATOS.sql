SET NOCOUNT ON; SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN('master','model','msdb','tempdb') THROW 54500,'Confirma servidor y @BaseEsperada.',1;
IF HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','VIEW DEFINITION')<>1 THROW 54501,'Se requiere VIEW DEFINITION para inspeccionar dependencias.',1;
IF OBJECT_ID('dbo.Control_Migracion_V4') IS NULL THROW 54501,'Esquema de origen incorrecto.',1;
BEGIN TRY BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WITH(UPDLOCK,HOLDLOCK) WHERE Script='V45_02_MIGRAR')
 BEGIN
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V45_01_PREPARAR') THROW 54501,'Falta 01.',1;
-- Solo cambia claves JSON/entidad; conserva valores, eventos y actor. Bloqueo exclusivo y transaccion.
DISABLE TRIGGER dbo.TR_V4_Auditoria_Inmutable ON dbo.Auditoria_V4;
UPDATE dbo.Auditoria_V4 WITH(TABLOCKX) SET Entidad=CASE WHEN Entidad=N'Alumno_Estado_V41' THEN N'ESTADO_ALUMNO' WHEN Entidad=N'Auditoria_V4' THEN N'AUDITORIA_SISTEMA' WHEN Entidad=N'Aula' THEN N'AULA' WHEN Entidad=N'Ciclo' THEN N'CICLO' WHEN Entidad=N'Contacto_Verificado_V41' THEN N'CONTACTO_VERIFICADO' WHEN Entidad=N'Control_Migracion_V4' THEN N'CONTROL_MIGRACION' WHEN Entidad=N'Cuenta_Codigo_V41' THEN N'CODIGO_CUENTA' WHEN Entidad=N'CURSOS' THEN N'CURSO' WHEN Entidad=N'Docente' THEN N'DOCENTE' WHEN Entidad=N'Docente_Asignatura' THEN N'CURSO_DOCENTE' WHEN Entidad=N'ESTADO_EXAMEN_GRUPO' THEN N'ESTADO_SIMULACRO' WHEN Entidad=N'Examen' THEN N'SIMULACRO' WHEN Entidad=N'Examen_Grupo' THEN N'SIMULACRO_HORARIO' WHEN Entidad=N'Grupo' THEN N'HORARIO_ACADEMICO' WHEN Entidad=N'Horario' THEN N'BLOQUE_HORARIO' WHEN Entidad=N'Linea_Base_V4' THEN N'LINEA_BASE_MIGRACION' WHEN Entidad=N'Nota_Estado_V41' THEN N'ESTADO_RESULTADO' WHEN Entidad=N'Nota_Examen' THEN N'RESULTADO_SIMULACRO' WHEN Entidad=N'Pago' THEN N'PAGO' WHEN Entidad=N'Programa' THEN N'PROGRAMA' WHEN Entidad=N'Solicitud_Contacto_V41' THEN N'SOLICITUD_CONTACTO' WHEN Entidad=N'Turno' THEN N'TURNO' WHEN Entidad=N'Usuario' THEN N'USUARIO' WHEN Entidad=N'Usuario_Seguridad_V41' THEN N'SEGURIDAD_USUARIO' ELSE Entidad END,Anterior=dbo.FN_V45_NORMALIZAR_JSON(Anterior),Nuevo=dbo.FN_V45_NORMALIZAR_JSON(Nuevo);
ENABLE TRIGGER dbo.TR_V4_Auditoria_Inmutable ON dbo.Auditoria_V4;
 INSERT dbo.Control_Migracion_V4(Script) VALUES('V45_02_MIGRAR');
 END; COMMIT;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
