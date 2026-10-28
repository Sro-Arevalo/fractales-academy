-- Revisión por defecto. No identifica pruebas por nombre ni borra catálogos compartidos.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
DECLARE @Confirmacion varchar(30)=''; -- Escribir ELIMINAR PRUEBAS después de revisar.
DECLARE @Administrador varchar(20)='REEMPLAZAR';
DECLARE @Motivo varchar(250)='';
DECLARE @DnisJson nvarchar(max)=N'[]'; -- Lista explícita, por ejemplo ["43000090"].
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN ('master','model','msdb','tempdb') THROW 54300,'Confirma base y servidor.',1;
IF OBJECT_ID('dbo.APODERADO') IS NULL OR ISJSON(@DnisJson)<>1 THROW 54307,'Se requiere V4.3 y una lista JSON valida.',1;
DECLARE @Dnis TABLE(DNI varchar(8) NOT NULL PRIMARY KEY);
IF EXISTS(SELECT 1 FROM OPENJSON(@DnisJson) WHERE type<>1 OR DATALENGTH(value)<>16 OR value COLLATE Latin1_General_100_BIN2 LIKE '%[^0-9]%') THROW 54309,'Lista de DNI invalida.',1;
INSERT @Dnis SELECT DISTINCT CONVERT(varchar(8),value) FROM OPENJSON(@DnisJson);
IF (SELECT COUNT(*) FROM @Dnis)>50 THROW 54309,'Selecciona como maximo 50 estudiantes por lote.',1;
BEGIN TRY
 BEGIN TRAN;
 SELECT a.DNI_Alu,a.Nomb_Alu,a.Es_Prueba,ISNULL(e.Activo,1) Activo,
  (SELECT COUNT(*) FROM dbo.Usuario u WHERE u.ALUMNO_DNI_Alu=a.DNI_Alu) Cuentas,
  (SELECT COUNT(*) FROM dbo.MATRICULA m WHERE m.ALUMNO_DNI_Alu=a.DNI_Alu) Matriculas,
  (SELECT COUNT(*) FROM dbo.Pago p WHERE p.ALUMNO_DNI_Alu=a.DNI_Alu) Obligaciones,
  (SELECT ISNULL(SUM(Monto),0) FROM dbo.Pago p WHERE p.ALUMNO_DNI_Alu=a.DNI_Alu AND p.ESTADO_PAGO_Cod_Estado='PENDIENTE') TotalPendiente,
  (SELECT COUNT(*) FROM dbo.Contacto_Verificado_V41 c WHERE c.ALUMNO_DNI_Alu=a.DNI_Alu) Contactos,
  (SELECT COUNT(*) FROM dbo.Solicitud_Contacto_V41 c WHERE c.ALUMNO_DNI_Alu=a.DNI_Alu) Solicitudes,
  (SELECT COUNT(*) FROM dbo.Cuenta_Codigo_V41 c JOIN dbo.Usuario u ON u.Cod_Usuario=c.Usuario_Cod_Usuario WHERE u.ALUMNO_DNI_Alu=a.DNI_Alu) Codigos,
  (SELECT COUNT(*) FROM dbo.Usuario_Seguridad_V41 c JOIN dbo.Usuario u ON u.Cod_Usuario=c.Usuario_Cod_Usuario WHERE u.ALUMNO_DNI_Alu=a.DNI_Alu) ControlesSesion
 FROM dbo.ALUMNO a WITH (UPDLOCK,HOLDLOCK) JOIN @Dnis d ON d.DNI=a.DNI_Alu LEFT JOIN dbo.Alumno_Estado_V41 e ON e.ALUMNO_DNI_Alu=a.DNI_Alu;
 IF @Confirmacion='' BEGIN ROLLBACK; RETURN; END;
 IF @Confirmacion<>'ELIMINAR PRUEBAS' OR LEN(LTRIM(RTRIM(@Motivo)))<5 OR NOT EXISTS(SELECT 1 FROM @Dnis) THROW 54309,'Confirma la lista y escribe un motivo de al menos cinco caracteres.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Usuario WHERE Cod_Usuario=@Administrador AND ROL_Cod_Rol='ADMIN' AND Activo=1) THROW 54309,'Selecciona un administrador activo.',1;
 IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1 OR delete_referential_action<>0) THROW 54302,'La limpieza SQL requiere FK confiables y sin cascadas.',1;
 IF EXISTS(SELECT 1 FROM @Dnis d LEFT JOIN dbo.ALUMNO a WITH (UPDLOCK,HOLDLOCK) ON a.DNI_Alu=d.DNI LEFT JOIN dbo.Alumno_Estado_V41 e ON e.ALUMNO_DNI_Alu=d.DNI WHERE a.DNI_Alu IS NULL OR a.Es_Prueba=0 OR ISNULL(e.Activo,1)<>0) THROW 54309,'Cada alumno debe existir, tener marca explicita de prueba y estar desactivado.',1;
 IF EXISTS(SELECT 1 FROM dbo.Usuario u WITH (UPDLOCK,HOLDLOCK) JOIN @Dnis d ON d.DNI=u.ALUMNO_DNI_Alu WHERE u.Activo=1 OR u.ROL_Cod_Rol<>'ALUMNO' OR u.Cod_Usuario=@Administrador) THROW 54309,'Hay una cuenta activa o protegida.',1;
 IF EXISTS(SELECT 1 FROM dbo.Pago p WITH (UPDLOCK,HOLDLOCK) JOIN @Dnis d ON d.DNI=p.ALUMNO_DNI_Alu WHERE p.ESTADO_PAGO_Cod_Estado<>'PENDIENTE' OR p.Fech_Pago IS NOT NULL OR p.Medio_Pago IS NOT NULL OR p.Usuario_Cod_Usuario IS NOT NULL) THROW 54309,'Hay operaciones financieras protegidas.',1;
 IF EXISTS(SELECT 1 FROM dbo.Auditoria_V4 a JOIN dbo.Pago p ON p.Cod_Pago=a.Codigo AND a.Entidad='Pago' JOIN @Dnis d ON d.DNI=p.ALUMNO_DNI_Alu WHERE a.Accion IN ('CONFIRMAR_PAGO','ANULAR_CONFIRMACION')) THROW 54309,'Hay historial de cobros, incluso anulados.',1;
 IF EXISTS(SELECT 1 FROM dbo.Auditoria_V4 a JOIN @Dnis d ON d.DNI=JSON_VALUE(CASE WHEN ISJSON(a.Anterior)=1 THEN a.Anterior END,'$.ALUMNO_DNI_Alu') WHERE a.Entidad='Pago' AND a.Accion IN ('CONFIRMAR_PAGO','ANULAR_CONFIRMACION')) THROW 54309,'Hay historial financiero protegido aunque falte una obligacion.',1;
 IF EXISTS(SELECT 1 FROM dbo.Nota_Examen n JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula JOIN @Dnis d ON d.DNI=m.ALUMNO_DNI_Alu) THROW 54309,'Hay resultados academicos historicos que deben conservarse.',1;
 IF EXISTS(SELECT 1 FROM dbo.Auditoria_V4 a JOIN dbo.Usuario u ON u.Cod_Usuario=a.Usuario_Cod_Usuario JOIN @Dnis d ON d.DNI=u.ALUMNO_DNI_Alu) THROW 54309,'Una cuenta es autora de auditorias inmutables.',1;
 -- Relaciones adicionales no incluidas en esta política son rechazadas por las FK.
 DELETE s FROM dbo.Solicitud_Contacto_V41 s JOIN @Dnis d ON d.DNI=s.ALUMNO_DNI_Alu;
 DELETE c FROM dbo.Contacto_Verificado_V41 c JOIN @Dnis d ON d.DNI=c.ALUMNO_DNI_Alu;
 DELETE c FROM dbo.Cuenta_Codigo_V41 c JOIN dbo.Usuario u ON u.Cod_Usuario=c.Usuario_Cod_Usuario JOIN @Dnis d ON d.DNI=u.ALUMNO_DNI_Alu;
 DELETE s FROM dbo.Usuario_Seguridad_V41 s JOIN dbo.Usuario u ON u.Cod_Usuario=s.Usuario_Cod_Usuario JOIN @Dnis d ON d.DNI=u.ALUMNO_DNI_Alu;
 DELETE e FROM dbo.Alumno_Estado_V41 e JOIN @Dnis d ON d.DNI=e.ALUMNO_DNI_Alu;
 DELETE p FROM dbo.Pago p JOIN @Dnis d ON d.DNI=p.ALUMNO_DNI_Alu;
 DELETE m FROM dbo.MATRICULA m JOIN @Dnis d ON d.DNI=m.ALUMNO_DNI_Alu;
 DELETE u FROM dbo.Usuario u JOIN @Dnis d ON d.DNI=u.ALUMNO_DNI_Alu;
 DELETE a FROM dbo.ALUMNO a JOIN @Dnis d ON d.DNI=a.DNI_Alu;
 INSERT dbo.Auditoria_V4(Entidad,Codigo,Accion,Usuario_Cod_Usuario,Motivo) SELECT 'ALUMNO',DNI,'ELIMINAR_PRUEBA_SQL',@Administrador,@Motivo FROM @Dnis;
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
