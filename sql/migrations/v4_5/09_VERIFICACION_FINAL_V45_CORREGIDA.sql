-- FRACTALES ACADEMY V4.5 | SCRIPT 09 CORREGIDO DIAGRAMAS
-- SOLO LECTURA: ejecutar despues del 08; no modifica tablas, datos ni permisos.
SET NOCOUNT ON;
IF DB_NAME() <> N'FractalesAcademy'
    THROW 54509, 'Base de datos incorrecta para V4.5.', 1;
IF NOT EXISTS(SELECT 1 FROM dbo.CONTROL_MIGRACION WHERE SCRIPT='V45_08_FINALIZAR') THROW 54509,'V4.5 no finalizada.',1;
IF OBJECT_ID('dbo.MIGRACION_INTEGRIDAD_V45') IS NOT NULL OR OBJECT_ID('dbo.FN_V45_NORMALIZAR_JSON') IS NOT NULL THROW 54509,'Faltan retiros temporales.',1;
IF EXISTS(SELECT 1 FROM sys.tables WHERE is_ms_shipped=0 AND name<>'sysdiagrams' AND name COLLATE Latin1_General_100_BIN2 LIKE '%[^A-Z0-9_]%') THROW 54509,'Tabla fuera de convencion.',1;
IF EXISTS(SELECT 1 FROM sys.columns c JOIN sys.tables t ON t.object_id=c.object_id WHERE t.is_ms_shipped=0 AND t.name<>'sysdiagrams' AND c.name COLLATE Latin1_General_100_BIN2 LIKE '%[^A-Z0-9_]%') THROW 54509,'Columna fuera de convencion.',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) OR EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) THROW 54509,'Restricciones no confiables.',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID('dbo.AUDITORIA_SISTEMA') AND referenced_object_id=OBJECT_ID('dbo.USUARIO')) THROW 54509,'Auditoria conserva dependencia rigida de actor.',1;
IF OBJECT_ID('dbo.SP_AUDITORIA_PROCESAR_PRUEBAS','P') IS NULL OR OBJECT_ID('dbo.PAPELERA_REGISTRO','U') IS NULL OR COL_LENGTH('dbo.USUARIO','ID_USUARIO')<>20 THROW 54509,'Backend no compatible.',1;
-- Validar la convencion solo en objetos de la aplicacion.
-- Se excluyen exclusivamente procedimientos/constraints auxiliares de diagramas.
-- Cualquier otro objeto con nombre fuera de convencion sigue bloqueando el cierre.
IF EXISTS (
    SELECT 1
FROM sys.objects AS o
WHERE o.is_ms_shipped = 0
  AND o.type IN ('PK','F','UQ','C','D','TR','P','SO')
  AND o.name COLLATE Latin1_General_100_BIN2 LIKE '%[^A-Z0-9_]%'
  AND NOT EXISTS (
      SELECT 1
      FROM sys.tables AS aux
      WHERE aux.object_id = o.parent_object_id
        AND aux.schema_id = SCHEMA_ID(N'dbo')
        AND aux.name = N'sysdiagrams'
  )
  AND NOT (
      o.type = 'P'
      AND o.schema_id = SCHEMA_ID(N'dbo')
      AND o.name IN (
          N'sp_alterdiagram', N'sp_creatediagram', N'sp_dropdiagram',
          N'sp_helpdiagramdefinition', N'sp_helpdiagrams',
          N'sp_renamediagram', N'sp_upgraddiagrams'
      )
  )
)
    THROW 54509, 'Objeto SQL de la aplicacion fuera de convencion; ejecutar diagnostico.', 1;
-- Revisar dependencias de los modulos propios; excluir solo auxiliares conocidos de diagramas.
IF EXISTS (
    SELECT 1
    FROM sys.sql_expression_dependencies AS d
    JOIN sys.objects AS o ON o.object_id = d.referencing_id
    WHERE o.is_ms_shipped = 0
      AND o.schema_id = SCHEMA_ID(N'dbo')
      AND d.referenced_id IS NULL
      AND d.referenced_database_name IS NULL
      AND d.referenced_server_name IS NULL
      AND ISNULL(d.referenced_schema_name, N'dbo') = N'dbo'
      AND d.referenced_entity_name NOT IN (N'inserted', N'deleted')
      AND o.name NOT IN (
          N'fn_diagramobjects', N'sp_alterdiagram', N'sp_creatediagram',
          N'sp_dropdiagram', N'sp_helpdiagramdefinition', N'sp_helpdiagrams',
          N'sp_renamediagram', N'sp_upgraddiagrams'
      )
)
    THROW 54509, 'Modulo de la aplicacion con referencia local sin resolver.', 1;

-- Comprobar cantidad prevista, en vez de mostrarla sin validarla.
DECLARE @TablasFinales int = (
    SELECT COUNT(*) FROM sys.tables
    WHERE is_ms_shipped = 0 AND name <> N'sysdiagrams'
);
DECLARE @RelacionesFinales int = (SELECT COUNT(*) FROM sys.foreign_keys);
IF @TablasFinales <> 38
    THROW 54509, 'Cantidad de tablas distinta de la estructura V4.5 prevista (38).', 1;
IF @RelacionesFinales <> 40
    THROW 54509, 'Cantidad de claves foraneas distinta de la estructura V4.5 prevista (40).', 1;

-- DBCC informa las violaciones como filas; rechazar en vez de dar falso OK.
DECLARE @Incumplimientos09 TABLE
(
    Tabla nvarchar(256) NULL,
    Restriccion nvarchar(256) NULL,
    Condicion nvarchar(max) NULL
);
INSERT INTO @Incumplimientos09 (Tabla, Restriccion, Condicion)
EXEC (N'DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS, ALL_ERRORMSGS, NO_INFOMSGS;');
IF EXISTS (SELECT 1 FROM @Incumplimientos09)
    THROW 54509, 'La verificacion encontro restricciones incumplidas.', 1;

SELECT COUNT(*) TABLAS,38 TABLAS_ESTANDAR_ESPERADAS FROM sys.tables WHERE is_ms_shipped=0 AND name<>'sysdiagrams';
SELECT COUNT(*) CLAVES_FORANEAS,40 CLAVES_ESTANDAR_ESPERADAS FROM sys.foreign_keys;
SELECT name TABLA FROM sys.tables WHERE is_ms_shipped=0 ORDER BY name;
SELECT SCRIPT,FECHA_EVENTO FROM dbo.CONTROL_MIGRACION WHERE SCRIPT LIKE 'V45[_]%' ORDER BY SCRIPT;

SELECT N'V4.5 VERIFICADA CORRECTAMENTE' AS RESULTADO, @TablasFinales AS TABLAS, @RelacionesFinales AS RELACIONES_FK;
