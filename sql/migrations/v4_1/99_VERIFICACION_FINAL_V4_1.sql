-- SOLO LECTURA. Comparar recuentos con el diagnostico guardado antes de migrar.
SET NOCOUNT ON;
SELECT DB_NAME() AS BaseSeleccionada,SYSUTCDATETIME() AS HoraUTC;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 WHERE Script LIKE 'V41[_]%' ORDER BY Script;
SELECT t.name AS Tabla,c.name AS Columna,ty.name AS Tipo,c.max_length,c.is_nullable FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE t.name LIKE '%[_]V41' ORDER BY t.name,c.column_id;
SELECT name,is_disabled,is_not_trusted,delete_referential_action_desc FROM sys.foreign_keys WHERE parent_object_id IN (SELECT object_id FROM sys.tables WHERE name LIKE '%[_]V41');
SELECT name,is_disabled,is_not_trusted FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1;
SELECT name,is_disabled FROM sys.triggers WHERE name IN ('TR_V4_Auditoria_Inmutable','TR_V41_Alumno_Contacto');
SELECT 'Usuario_Seguridad_V41' AS Objeto,CASE WHEN OBJECT_ID('dbo.Usuario_Seguridad_V41') IS NOT NULL THEN 'OK' ELSE 'FALTA' END AS Estado;
SELECT 'Cuenta_Codigo_V41' AS Objeto,CASE WHEN OBJECT_ID('dbo.Cuenta_Codigo_V41') IS NOT NULL THEN 'OK' ELSE 'FALTA' END AS Estado;
SELECT 'Contacto_Verificado_V41' AS Objeto,CASE WHEN OBJECT_ID('dbo.Contacto_Verificado_V41') IS NOT NULL THEN 'OK' ELSE 'FALTA' END AS Estado;
SELECT 'Solicitud_Contacto_V41' AS Objeto,CASE WHEN OBJECT_ID('dbo.Solicitud_Contacto_V41') IS NOT NULL THEN 'OK' ELSE 'FALTA' END AS Estado;
SELECT 'Alumno_Estado_V41' AS Objeto,CASE WHEN OBJECT_ID('dbo.Alumno_Estado_V41') IS NOT NULL THEN 'OK' ELSE 'FALTA' END AS Estado;
SELECT 'Nota_Estado_V41' AS Objeto,CASE WHEN OBJECT_ID('dbo.Nota_Estado_V41') IS NOT NULL THEN 'OK' ELSE 'FALTA' END AS Estado;
SELECT 'ALUMNO' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[ALUMNO];
SELECT 'MATRICULA' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[MATRICULA];
SELECT 'Pago' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[Pago];
SELECT 'Nota_Examen' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[Nota_Examen];
SELECT 'Examen' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[Examen];
SELECT 'Examen_Grupo' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[Examen_Grupo];
SELECT 'Usuario' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[Usuario];
SELECT 'Auditoria_V4' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[Auditoria_V4];
SELECT Tipo,COUNT_BIG(*) AS ContactosActivos FROM dbo.Contacto_Verificado_V41 WHERE Activo=1 GROUP BY Tipo;
SELECT Usuario_Cod_Usuario,Proposito,COUNT(*) AS CodigosPendientesDuplicados FROM dbo.Cuenta_Codigo_V41 WHERE Consumido=0 GROUP BY Usuario_Cod_Usuario,Proposito HAVING COUNT(*)>1;
SELECT COUNT(*) AS CodigosConEstadoInvalido FROM dbo.Cuenta_Codigo_V41 WHERE Intentos>5 OR DATALENGTH(Codigo_Hash)<>64;
-- Se esperan cuatro migraciones V41 registradas, seis tablas nuevas y ninguna FK en cascada nueva.
-- Los contactos existentes siguen sin verificacion automatica; no hay cambios masivos de claves ni bajas.
