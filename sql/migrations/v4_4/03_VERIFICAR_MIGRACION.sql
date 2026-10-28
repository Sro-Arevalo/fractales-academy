-- Solo lectura, verificaciones repetidas dentro de la transaccion de 04 antes del DROP.
SET NOCOUNT ON;
IF HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','VIEW DEFINITION')<>1 THROW 54411,'Se requiere VIEW DEFINITION para revisar todas las dependencias.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V44_02_MIGRAR') THROW 54410,'Falta migracion 02.',1;
IF OBJECT_ID('dbo.APODERADO') IS NULL THROW 54410,'Verificacion previa requiere la entidad antigua. Tras 04 usar 05.',1;
IF EXISTS(SELECT 1 FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
 WHERE i.object_id=OBJECT_ID('dbo.ALUMNO') AND i.is_unique=1 AND c.name='DNI_Apoderado' AND ic.key_ordinal>0) THROW 54416,'Indice UNIQUE adicional sobre DNI de apoderado: revisar manualmente.',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1)
 OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) THROW 54411,'Restricciones no confiables.',1;
DECLARE @t sysname,@pk sysname,@label sysname,@cols nvarchar(max),@q nvarchar(max);
DECLARE verificar CURSOR LOCAL FAST_FORWARD FOR SELECT * FROM(VALUES('ALUMNO','DNI_Alu'),('Usuario','Cod_Usuario'),('MATRICULA','Cod_Matricula'),('Pago','Cod_Pago'),('Grupo','Cod_Grupo'),('Horario','Cod_Horario'),('Nota_Examen','Cod_Nota')) x(t,p);
OPEN verificar; FETCH NEXT FROM verificar INTO @t,@pk;
WHILE @@FETCH_STATUS=0
BEGIN
 SET @label=N'V44/'+@t;
 SELECT @cols=STRING_AGG(CONVERT(nvarchar(max),'r.'+QUOTENAME(name)),',') WITHIN GROUP(ORDER BY column_id) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.'+@t)
  AND name NOT IN('Estado_Horario','Version_Horario','Excepcion_Turno','Motivo_Excepcion','Autorizado_Por')
  AND NOT(@t='ALUMNO' AND name IN('Nomb_Apoderado','Cel_Apoderado','Correo_Apoderado'));
 SET @q=N'IF (SELECT COUNT_BIG(*) FROM dbo.Linea_Base_V4 WHERE Tabla=@label)<>(SELECT COUNT_BIG(*) FROM dbo.'+QUOTENAME(@t)+')
 OR EXISTS(SELECT 1 FROM dbo.Linea_Base_V4 b LEFT JOIN dbo.'+QUOTENAME(@t)+' r ON CONVERT(nvarchar(200),r.'+QUOTENAME(@pk)+')=b.Clave WHERE b.Tabla=@label
 AND (r.'+QUOTENAME(@pk)+' IS NULL OR b.Huella<>HASHBYTES(''SHA2_256'',(SELECT '+@cols+' FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES))))
 THROW 54412,''Cambio o perdida de filas desde 01. Mantener aplicacion detenida y revisar huellas.'',1;';
 EXEC sys.sp_executesql @q,N'@label sysname',@label=@label;
 FETCH NEXT FROM verificar INTO @t,@pk;
END;
CLOSE verificar; DEALLOCATE verificar;
IF EXISTS(SELECT 1 FROM dbo.ALUMNO a JOIN dbo.APODERADO p ON p.DNI_Apoderado=a.DNI_Apoderado WHERE
 ISNULL(a.Nomb_Apoderado,'')<>ISNULL(p.Nomb_Apoderado,'') OR ISNULL(a.Cel_Apoderado,'')<>ISNULL(p.Cel_Apoderado,'') OR ISNULL(a.Correo_Apoderado,'')<>ISNULL(p.Correo_Apoderado,''))
 THROW 54413,'Informacion de apoderados no transferida.',1;
IF EXISTS(SELECT 1 FROM dbo.APODERADO p WHERE NOT EXISTS(SELECT 1 FROM dbo.Auditoria_V4 a WHERE a.Entidad='APODERADO' AND a.Codigo=p.DNI_Apoderado AND a.Accion='MIGRAR_V44'
 AND HASHBYTES('SHA2_256',CONVERT(nvarchar(max),a.Anterior))=HASHBYTES('SHA2_256',(SELECT p.* FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES)))) THROW 54414,'Falta respaldo exacto e inmutable de apoderados.',1;
IF EXISTS(SELECT 1 FROM dbo.MATRICULA m LEFT JOIN dbo.ALUMNO a ON a.DNI_Alu=m.ALUMNO_DNI_Alu LEFT JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo WHERE a.DNI_Alu IS NULL OR g.Cod_Grupo IS NULL) THROW 54415,'Matriculas huerfanas.',1;
IF EXISTS(SELECT 1 FROM dbo.Horario h LEFT JOIN dbo.Grupo g ON g.Cod_Grupo=h.Grupo_Cod_Grupo WHERE g.Cod_Grupo IS NULL) THROW 54415,'Bloques huerfanos.',1;
SELECT 'Verificacion previa correcta; revisar 04 por separado.' Resultado;
