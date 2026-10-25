-- SOLO LECTURA. Guardar resultados antes y despues; no muestra hashes ni codigos secretos.
SET NOCOUNT ON;
SELECT DB_NAME() AS BaseSeleccionada,CONVERT(nvarchar(128),SERVERPROPERTY('ServerName')) AS Servidor,SYSUTCDATETIME() AS HoraUTC;
SELECT t.name AS Tabla,c.name AS Columna,ty.name AS Tipo,c.max_length,c.is_nullable FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE t.schema_id=SCHEMA_ID('dbo') ORDER BY t.name,c.column_id;
SELECT name,is_disabled,is_not_trusted,delete_referential_action_desc FROM sys.foreign_keys;
SELECT name,is_disabled,is_not_trusted,definition FROM sys.check_constraints;
SELECT name,is_disabled FROM sys.triggers WHERE parent_class=1;
SELECT OBJECT_NAME(object_id) AS Tabla,name,is_unique,is_disabled,filter_definition FROM sys.indexes WHERE index_id>0;
IF OBJECT_ID('dbo.Control_Migracion_V4') IS NOT NULL EXEC(N'SELECT Script,Fecha FROM dbo.Control_Migracion_V4 ORDER BY Script');
IF OBJECT_ID('dbo.Usuario') IS NOT NULL EXEC(N'SELECT ROL_Cod_Rol,Activo,Debe_Cambiar_Clave,COUNT_BIG(*) AS Cuentas FROM dbo.Usuario GROUP BY ROL_Cod_Rol,Activo,Debe_Cambiar_Clave; SELECT ALUMNO_DNI_Alu,COUNT_BIG(*) AS Duplicados FROM dbo.Usuario WHERE ALUMNO_DNI_Alu IS NOT NULL GROUP BY ALUMNO_DNI_Alu HAVING COUNT_BIG(*)>1;');
IF OBJECT_ID('dbo.ALUMNO') IS NOT NULL EXEC(N'SELECT COUNT_BIG(*) AS Alumnos,SUM(CASE WHEN Correo_Alu IS NOT NULL THEN 1 ELSE 0 END) AS ConCorreoRegistradoNoImplicaVerificado FROM dbo.ALUMNO');
IF OBJECT_ID('dbo.ALUMNO') IS NOT NULL EXEC(N'SELECT ''ALUMNO'' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[ALUMNO]');
IF OBJECT_ID('dbo.MATRICULA') IS NOT NULL EXEC(N'SELECT ''MATRICULA'' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[MATRICULA]');
IF OBJECT_ID('dbo.Pago') IS NOT NULL EXEC(N'SELECT ''Pago'' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[Pago]');
IF OBJECT_ID('dbo.Nota_Examen') IS NOT NULL EXEC(N'SELECT ''Nota_Examen'' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[Nota_Examen]');
IF OBJECT_ID('dbo.Examen') IS NOT NULL EXEC(N'SELECT ''Examen'' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[Examen]');
IF OBJECT_ID('dbo.Examen_Grupo') IS NOT NULL EXEC(N'SELECT ''Examen_Grupo'' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[Examen_Grupo]');
IF OBJECT_ID('dbo.Usuario') IS NOT NULL EXEC(N'SELECT ''Usuario'' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[Usuario]');
IF OBJECT_ID('dbo.Auditoria_V4') IS NOT NULL EXEC(N'SELECT ''Auditoria_V4'' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[Auditoria_V4]');
IF OBJECT_ID('dbo.Contacto_Verificado_V41') IS NOT NULL EXEC(N'SELECT Tipo,Activo,COUNT_BIG(*) AS Contactos FROM dbo.Contacto_Verificado_V41 GROUP BY Tipo,Activo');
-- Un correo almacenado en ALUMNO NO se marca verificado automaticamente.
