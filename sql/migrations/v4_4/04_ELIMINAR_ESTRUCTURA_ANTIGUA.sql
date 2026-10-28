-- EJECUCION MANUAL SEPARADA. No forma parte del arranque de la aplicacion.
-- Respaldar primero y mantener App Service detenido. Volver a ejecutar 03 inmediatamente antes.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
DECLARE @Confirmacion nvarchar(80)=N'REVISAR_ANTES_DE_EJECUTAR';
IF DB_NAME()<>@BaseEsperada THROW 54400,'Confirma @BaseEsperada y servidor.',1;
IF @Confirmacion<>N'RETIRAR APODERADO V4.4' THROW 54420,'Revisar respaldo, diagnostico, 03 y confirmar RETIRAR APODERADO V4.4.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V44_02_MIGRAR') THROW 54401,'Ejecuta 01,02,03 primero.',1;
BEGIN TRY
 BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WITH(UPDLOCK,HOLDLOCK) WHERE Script='V44_04_RETIRAR')
 BEGIN
  -- BEGIN VERIFICACION REPRODUCIDA
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

  -- END VERIFICACION REPRODUCIDA
  DECLARE @fk sysname,@drop nvarchar(max);
  IF EXISTS(SELECT 1 FROM sys.sql_modules WHERE definition IS NULL) THROW 54422,'Hay modulos SQL no inspeccionables. Revisar antes de retirar tablas.',1;
  IF EXISTS(SELECT 1 FROM sys.sql_modules WHERE (N' '+definition+N' ') COLLATE Latin1_General_100_CI_AS LIKE N'%[^a-z0-9_]APODERADO[^a-z0-9_]%'
   AND object_id NOT IN(OBJECT_ID('dbo.TR_V43_Apoderado_Alumno'),OBJECT_ID('dbo.TR_V43_Apoderado_Compartido')))
   THROW 54422,'Referencia SQL adicional a APODERADO, incluso texto dinamico: revisar primero.',1;
  IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID('dbo.APODERADO')) THROW 54421,'APODERADO tiene relaciones salientes adicionales. No se elimina.',1;
  IF EXISTS(SELECT 1 FROM sys.foreign_keys f WHERE f.referenced_object_id=OBJECT_ID('dbo.APODERADO') AND
   (f.parent_object_id<>OBJECT_ID('dbo.ALUMNO') OR (SELECT COUNT(*) FROM sys.foreign_key_columns c WHERE c.constraint_object_id=f.object_id)<>1
   OR NOT EXISTS(SELECT 1 FROM sys.foreign_key_columns c WHERE c.constraint_object_id=f.object_id AND COL_NAME(c.parent_object_id,c.parent_column_id)='DNI_Apoderado' AND COL_NAME(c.referenced_object_id,c.referenced_column_id)='DNI_Apoderado')))
   THROW 54421,'Dependencia FK desconocida de APODERADO. No se elimina.',1;
  IF EXISTS(SELECT 1 FROM sys.sql_expression_dependencies d WHERE d.referenced_id=OBJECT_ID('dbo.APODERADO')
   AND NOT EXISTS(SELECT 1 FROM sys.foreign_keys f WHERE f.object_id=d.referencing_id AND f.referenced_object_id=OBJECT_ID('dbo.APODERADO'))
   AND NOT EXISTS(SELECT 1 FROM sys.check_constraints c WHERE c.object_id=d.referencing_id AND c.parent_object_id=OBJECT_ID('dbo.APODERADO'))
   AND d.referencing_id NOT IN(OBJECT_ID('dbo.TR_V43_Apoderado_Alumno'),OBJECT_ID('dbo.TR_V43_Apoderado_Compartido')))
   THROW 54422,'Objeto SQL adicional depende de APODERADO. Revisarlo primero.',1;
  IF EXISTS(SELECT 1 FROM sys.triggers WHERE parent_id=OBJECT_ID('dbo.APODERADO') AND name<>'TR_V43_Apoderado_Compartido') THROW 54422,'Trigger adicional en APODERADO.',1;
  -- El nombre FK se obtiene del catalogo real, nunca se presupone.
  DECLARE retirar CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM sys.foreign_keys WHERE referenced_object_id=OBJECT_ID('dbo.APODERADO');
  OPEN retirar; FETCH NEXT FROM retirar INTO @fk;
  WHILE @@FETCH_STATUS=0 BEGIN SET @drop=N'ALTER TABLE dbo.ALUMNO DROP CONSTRAINT '+QUOTENAME(@fk); EXEC sys.sp_executesql @drop; FETCH NEXT FROM retirar INTO @fk; END;
  CLOSE retirar; DEALLOCATE retirar;
  DROP TRIGGER IF EXISTS dbo.TR_V43_Apoderado_Alumno;
  DROP TRIGGER IF EXISTS dbo.TR_V43_Apoderado_Compartido;
  DROP TABLE dbo.APODERADO;
  -- El indice no unico del DNI de contacto puede seguir sirviendo para busquedas; no estorba a hermanos.
  EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_Horario_Sin_Cruces ON dbo.Horario AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Grupo g ON g.Cod_Grupo=i.Grupo_Cod_Grupo JOIN dbo.Turno t ON t.Cod_Turno=g.Turno_Cod_Turno
    WHERE (i.Hr_Inicio<t.Hr_Inicio OR i.Hr_Fin>t.Hr_Fin) AND
    (i.Excepcion_Turno=0 OR NOT EXISTS(SELECT 1 FROM dbo.Usuario u WHERE u.Cod_Usuario=i.Autorizado_Por AND u.ROL_Cod_Rol=''ADMIN'' AND u.Activo=1)))
    THROW 54430,''Bloque fuera del turno sin excepcion administradora autorizada.'',1;
   IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Grupo gi ON gi.Cod_Grupo=i.Grupo_Cod_Grupo JOIN dbo.Ciclo ci ON ci.Cod_Ciclo=gi.Ciclo_Cod_Ciclo
    JOIN dbo.Horario h WITH(UPDLOCK,HOLDLOCK) ON h.Cod_Horario<>i.Cod_Horario AND h.Dia_Semana=i.Dia_Semana AND i.Hr_Inicio<h.Hr_Fin AND h.Hr_Inicio<i.Hr_Fin
    JOIN dbo.Grupo gh ON gh.Cod_Grupo=h.Grupo_Cod_Grupo JOIN dbo.Ciclo ch ON ch.Cod_Ciclo=gh.Ciclo_Cod_Ciclo
    WHERE (i.Grupo_Cod_Grupo=h.Grupo_Cod_Grupo OR (i.Activo=1 AND h.Activo=1 AND gi.Activo=1 AND gh.Activo=1
      AND ci.Fech_Inicio<=ch.Fech_Fin AND ch.Fech_Inicio<=ci.Fech_Fin AND
      (gi.Aula_Cod_Aula=gh.Aula_Cod_Aula OR i.Docente_Asignatura_Docente_DNI_Doc=h.Docente_Asignatura_Docente_DNI_Doc))))
    THROW 54431,''Cruce de horario: conjunto academico, aula o docente ocupado.'',1;
  END;';
  -- Revalidar los bloques cuando se restaura/publica una cabecera desde administracion.
  EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V44_Grupo_Publicacion ON dbo.Grupo AFTER UPDATE AS
  BEGIN SET NOCOUNT ON;
   UPDATE h SET Activo=CASE WHEN i.Estado_Horario=''PUBLICADO'' THEN 1 ELSE 0 END
   FROM dbo.Horario h JOIN inserted i ON i.Cod_Grupo=h.Grupo_Cod_Grupo JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo
   WHERE i.Activo<>d.Activo OR i.Estado_Horario<>d.Estado_Horario;
  END;';
  EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V44_Matricula_Publicada ON dbo.MATRICULA AFTER INSERT,UPDATE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Matricula=i.Cod_Matricula JOIN dbo.Grupo g ON g.Cod_Grupo=i.Grupo_Cod_Grupo
   WHERE i.ESTADO_MATRICULA_Cod_Estado_Matricula=''ACTIVA'' AND (d.Cod_Matricula IS NULL OR d.ESTADO_MATRICULA_Cod_Estado_Matricula<>''ACTIVA'') AND (g.Estado_Horario<>''PUBLICADO'' OR g.Activo=0))
    THROW 54432,''El horario debe estar activo y publicado para matricular o restaurar la matricula.'',1;
  END;';
  EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V44_Nota_Eliminar ON dbo.Nota_Examen AFTER DELETE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM deleted n JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula JOIN dbo.ALUMNO a ON a.DNI_Alu=m.ALUMNO_DNI_Alu WHERE a.Es_Prueba=0)
    THROW 54433,''Las notas de personas reales se conservan; utiliza correccion o anulacion auditada.'',1;
  END;';
  EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V44_Pago_Eliminar ON dbo.Pago AFTER DELETE AS
  BEGIN SET NOCOUNT ON;
   IF EXISTS(SELECT 1 FROM deleted d WHERE d.ESTADO_PAGO_Cod_Estado<>''PENDIENTE'' OR d.Fech_Pago IS NOT NULL OR d.Medio_Pago IS NOT NULL OR d.Usuario_Cod_Usuario IS NOT NULL
    OR EXISTS(SELECT 1 FROM dbo.Auditoria_V4 a WHERE a.Entidad=''Pago'' AND a.Codigo=d.Cod_Pago AND a.Accion IN(''CONFIRMAR_PAGO'',''ANULAR_CONFIRMACION'')))
    THROW 54434,''Se conserva todo cobro realizado, incluso si fue revertido.'',1;
  END;';
  INSERT dbo.Control_Migracion_V4(Script) VALUES('V44_04_RETIRAR');
 END;
 COMMIT;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
