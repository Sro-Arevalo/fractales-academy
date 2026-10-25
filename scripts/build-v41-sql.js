'use strict';
// Solo genera archivos revisables. Nunca conecta ni ejecuta SQL.
const fs=require('node:fs'),path=require('node:path');
const folder=path.join(__dirname,'../sql/migrations/v4_1');fs.mkdirSync(folder,{recursive:true});
const write=(name,text)=>fs.writeFileSync(path.join(folder,name),text,'utf8');
const header=`-- V4.1 incremental. Revisar respaldo, mantenimiento y servidor antes de ejecutar.
SET NOCOUNT ON; SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @BaseEsperada sysname=N'FractalesAcademy';
IF DB_NAME()<>@BaseEsperada OR DB_NAME() IN ('master','model','msdb','tempdb') THROW 54100,'Base incorrecta. Confirme @BaseEsperada y el servidor.',1;
IF OBJECT_ID('dbo.Control_Migracion_V4') IS NULL OR OBJECT_ID('dbo.Auditoria_V4') IS NULL OR OBJECT_ID('dbo.MEDIO_PAGO') IS NULL
 THROW 54101,'Se requiere completar primero V4. No reconstruya la base.',1;
IF (SELECT COUNT(*) FROM dbo.Control_Migracion_V4 WHERE Script IN ('00A_PREPARACION_Y_LINEA_BASE','01_ACTUALIZACION_CELULARES','02_ACTUALIZACION_MATRICULAS','03_ACTUALIZACION_PAGOS','04_ACTUALIZACION_SIMULACROS','05_ACTUALIZACION_HORARIOS','06_ACTUALIZACION_USUARIOS'))<>7
 THROW 54102,'El registro de migraciones V4 esta incompleto.',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) THROW 54103,'Hay relaciones deshabilitadas o no confiables. Revisar antes de continuar.',1;
IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) THROW 54109,'Hay restricciones CHECK deshabilitadas o no confiables. Revisar sin omitir validaciones.',1;
`;
function wrap(name,previous,body){
  const tables=[...body.matchAll(/CREATE TABLE dbo\.(\w+)\s*\(([\s\S]*?)\);/g)],owned=tables.map(m=>m[1]);
  const ownership=owned.length?`IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='${name}') AND (${owned.map(t=>`OBJECT_ID('dbo.${t}') IS NOT NULL`).join(' OR ')}) THROW 54105,'Existe un objeto V4.1 sin registro de esta migracion. Revisar; no se asume propiedad ni se reconstruye.',1;
IF EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='${name}') AND (${owned.map(t=>`OBJECT_ID('dbo.${t}') IS NULL`).join(' OR ')}) THROW 54106,'Falta un objeto de una migracion ya aplicada. Revisar recuperacion; no se reconstruye una tabla que pudo tener datos.',1;\n`:'';
  const fields=tables.flatMap(([,table,definition])=>[...definition.matchAll(/\b(\w+)\s+(varchar|char|datetime2|bit|int|bigint|uniqueidentifier)(?:\((\d+)\))?(?:\s+IDENTITY\((\d+),(\d+)\))?\s+(NOT NULL|NULL)/g)].map(m=>`('${table}','${m[1]}','${m[2]}',${['varchar','char'].includes(m[2])?m[3]:'NULL'},${m[6]==='NULL'?1:0},${m[4]?1:0},${m[2]==='datetime2'?m[3]:'NULL'})`));
  const columns=fields.length?`DECLARE @Esperadas TABLE(Tabla sysname,Columna sysname,Tipo sysname,Longitud int,AdmiteNull bit,Identidad bit,Escala int);
INSERT @Esperadas VALUES ${fields.join(',\n')};
IF EXISTS(SELECT 1 FROM @Esperadas e LEFT JOIN sys.columns c ON c.object_id=OBJECT_ID('dbo.'+e.Tabla) AND c.name=e.Columna LEFT JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE c.column_id IS NULL OR ty.name<>e.Tipo OR c.is_nullable<>e.AdmiteNull OR c.is_identity<>e.Identidad OR (e.Longitud IS NOT NULL AND c.max_length<>e.Longitud) OR (e.Escala IS NOT NULL AND c.scale<>e.Escala))
 THROW 54107,'Tipos, longitudes, nulabilidad o identidad inesperados en las tablas V4.1. No se alteraron datos.',1;\n`:'';
  const constraints=tables.flatMap(([,table,definition])=>[...definition.matchAll(/CONSTRAINT (\w+)\s+(PRIMARY KEY|FOREIGN KEY|CHECK)/g)].map(m=>`IF OBJECT_ID('dbo.${m[1]}','${({'PRIMARY KEY':'PK','FOREIGN KEY':'F',CHECK:'C'})[m[2]]}') IS NULL THROW 54108,'Falta la restriccion V4.1 ${m[1]}. Revisar antes de continuar.',1;`)).join('\n');
  return header+(previous?`IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='${previous}') THROW 54104,'Falta la migracion V4.1 anterior.',1;\n`:'')+ownership+`BEGIN TRY
 BEGIN TRAN;
${body}
${columns}${constraints}
 IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='${name}') INSERT dbo.Control_Migracion_V4(Script) VALUES ('${name}');
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 WHERE Script LIKE 'V41[_]%' ORDER BY Script;
`;}
write('00_DIAGNOSTICO_V4_1.sql',`-- SOLO LECTURA. Guardar resultados antes y despues; no muestra hashes ni codigos secretos.
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
${['ALUMNO','MATRICULA','Pago','Nota_Examen','Examen','Examen_Grupo','Usuario','Auditoria_V4'].map(t=>`IF OBJECT_ID('dbo.${t}') IS NOT NULL EXEC(N'SELECT ''${t}'' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[${t}]');`).join('\n')}
IF OBJECT_ID('dbo.Contacto_Verificado_V41') IS NOT NULL EXEC(N'SELECT Tipo,Activo,COUNT_BIG(*) AS Contactos FROM dbo.Contacto_Verificado_V41 GROUP BY Tipo,Activo');
-- Un correo almacenado en ALUMNO NO se marca verificado automaticamente.
`);
write('01_RECUPERACION_CUENTAS.sql',wrap('V41_01_RECUPERACION_CUENTAS',null,`
-- Estructuras laterales: no cambian claves, nombres ni sesiones de las cuentas existentes.
IF EXISTS(SELECT 1 FROM dbo.Usuario WHERE ROL_Cod_Rol NOT IN ('ADMIN','ALUMNO')) THROW 54110,'Hay roles ajenos a ADMIN/ALUMNO; revisar sin eliminarlos.',1;
IF OBJECT_ID('dbo.Usuario_Seguridad_V41') IS NULL
 CREATE TABLE dbo.Usuario_Seguridad_V41 (
 Usuario_Cod_Usuario varchar(20) NOT NULL CONSTRAINT PK_Usuario_Seguridad_V41 PRIMARY KEY,
 Version_Sesion int NOT NULL CONSTRAINT DF_Seguridad_V41_Version DEFAULT(0),
 Activacion_Requerida bit NOT NULL CONSTRAINT DF_Seguridad_V41_Activacion DEFAULT(0),
 CONSTRAINT FK_Seguridad_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Seguridad_V41_Version CHECK(Version_Sesion>=0));
ELSE IF COL_LENGTH('dbo.Usuario_Seguridad_V41','Version_Sesion') IS NULL OR COL_LENGTH('dbo.Usuario_Seguridad_V41','Activacion_Requerida') IS NULL
 THROW 54111,'Usuario_Seguridad_V41 tiene una estructura inesperada.',1;
IF OBJECT_ID('dbo.Cuenta_Codigo_V41') IS NULL
 CREATE TABLE dbo.Cuenta_Codigo_V41 (
 Id uniqueidentifier NOT NULL CONSTRAINT PK_Cuenta_Codigo_V41 PRIMARY KEY,
 Usuario_Cod_Usuario varchar(20) NOT NULL,Proposito varchar(20) NOT NULL,Canal varchar(7) NOT NULL,Destino varchar(150) NULL,
 Nonce char(32) NOT NULL,Codigo_Hash char(64) NOT NULL,Desafio_Hash char(64) NULL,
 Expira datetime2(0) NOT NULL,Intentos tinyint NOT NULL CONSTRAINT DF_Codigo_V41_Intentos DEFAULT(0),
 Consumido bit NOT NULL CONSTRAINT DF_Codigo_V41_Consumido DEFAULT(0),Creado datetime2(0) NOT NULL CONSTRAINT DF_Codigo_V41_Creado DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Codigo_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Codigo_V41_Proposito CHECK(Proposito IN ('ACTIVACION','RECUPERACION','VERIFICAR_CONTACTO')),
 CONSTRAINT CK_Codigo_V41_Canal CHECK(Canal IN ('EMAIL','SMS','DIRECTO')),
 CONSTRAINT CK_Codigo_V41_Intentos CHECK(Intentos<=5),
 CONSTRAINT CK_Codigo_V41_Hash CHECK(DATALENGTH(Codigo_Hash)=64 AND Codigo_Hash COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%' AND DATALENGTH(Nonce)=32 AND Nonce COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%'
 AND (Desafio_Hash IS NULL OR (DATALENGTH(Desafio_Hash)=64 AND Desafio_Hash COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9a-f]%'))),
 CONSTRAINT CK_Codigo_V41_Fechas CHECK(Expira>Creado));
ELSE IF COL_LENGTH('dbo.Cuenta_Codigo_V41','Codigo_Hash')<>64 OR COL_LENGTH('dbo.Cuenta_Codigo_V41','Nonce')<>32 OR COL_LENGTH('dbo.Cuenta_Codigo_V41','Desafio_Hash') IS NULL
 THROW 54112,'Cuenta_Codigo_V41 tiene una estructura inesperada.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Cuenta_Codigo_V41') AND name='UX_Codigo_V41_Pendiente')
 CREATE UNIQUE INDEX UX_Codigo_V41_Pendiente ON dbo.Cuenta_Codigo_V41(Usuario_Cod_Usuario,Proposito) WHERE Consumido=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Cuenta_Codigo_V41') AND name='IX_Codigo_V41_Limites')
 CREATE INDEX IX_Codigo_V41_Limites ON dbo.Cuenta_Codigo_V41(Usuario_Cod_Usuario,Proposito,Creado) INCLUDE(Expira,Intentos,Consumido);
-- No se insertan codigos ni filas para cuentas antiguas.
`));
write('02_VERIFICACION_CONTACTOS.sql',wrap('V41_02_VERIFICACION_CONTACTOS','V41_01_RECUPERACION_CUENTAS',`
IF OBJECT_ID('dbo.Contacto_Verificado_V41') IS NULL
 CREATE TABLE dbo.Contacto_Verificado_V41 (
 Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Contacto_Verificado_V41 PRIMARY KEY,
 ALUMNO_DNI_Alu varchar(8) NOT NULL,Tipo varchar(7) NOT NULL,Destino varchar(150) NOT NULL,
 Activo bit NOT NULL CONSTRAINT DF_Contacto_V41_Activo DEFAULT(1),Metodo varchar(12) NOT NULL,
 Usuario_Cod_Usuario varchar(20) NOT NULL,Verificado datetime2(0) NOT NULL CONSTRAINT DF_Contacto_V41_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Contacto_V41_Alumno FOREIGN KEY(ALUMNO_DNI_Alu) REFERENCES dbo.ALUMNO(DNI_Alu),
 CONSTRAINT FK_Contacto_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Contacto_V41_Tipo CHECK(Tipo IN ('EMAIL','SMS')),
 CONSTRAINT CK_Contacto_V41_Metodo CHECK(Metodo IN ('CODIGO','PRESENCIAL')),
 CONSTRAINT CK_Contacto_V41_Destino CHECK((Tipo='SMS' AND DATALENGTH(Destino)=9 AND Destino COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^0-9]%') OR (Tipo='EMAIL' AND Destino LIKE '%_@_%._%' AND Destino NOT LIKE '% %')));
ELSE IF COL_LENGTH('dbo.Contacto_Verificado_V41','Destino')<>150 OR COL_LENGTH('dbo.Contacto_Verificado_V41','Activo') IS NULL
 THROW 54120,'Contacto_Verificado_V41 tiene una estructura inesperada.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Contacto_Verificado_V41') AND name='UX_Contacto_V41_Actual')
 CREATE UNIQUE INDEX UX_Contacto_V41_Actual ON dbo.Contacto_Verificado_V41(ALUMNO_DNI_Alu,Tipo) WHERE Activo=1;
IF OBJECT_ID('dbo.Solicitud_Contacto_V41') IS NULL
 CREATE TABLE dbo.Solicitud_Contacto_V41 (
 Id uniqueidentifier NOT NULL CONSTRAINT PK_Solicitud_Contacto_V41 PRIMARY KEY,ALUMNO_DNI_Alu varchar(8) NOT NULL,
 Tipo varchar(7) NOT NULL,Destino varchar(150) NOT NULL,Estado varchar(20) NOT NULL,Codigo_Id uniqueidentifier NULL,
 Creado datetime2(0) NOT NULL CONSTRAINT DF_Solicitud_V41_Creado DEFAULT SYSUTCDATETIME(),Resuelto datetime2(0) NULL,
 Usuario_Cod_Usuario varchar(20) NULL,Motivo varchar(250) NULL,
 CONSTRAINT FK_Solicitud_V41_Alumno FOREIGN KEY(ALUMNO_DNI_Alu) REFERENCES dbo.ALUMNO(DNI_Alu),
 CONSTRAINT FK_Solicitud_V41_Codigo FOREIGN KEY(Codigo_Id) REFERENCES dbo.Cuenta_Codigo_V41(Id),
 CONSTRAINT FK_Solicitud_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario),
 CONSTRAINT CK_Solicitud_V41_Tipo CHECK(Tipo IN ('EMAIL','SMS')),
 CONSTRAINT CK_Solicitud_V41_Estado CHECK(Estado IN ('PENDIENTE','PENDIENTE_ADMIN','VERIFICADA','APROBADA','RECHAZADA','REEMPLAZADA')));
ELSE IF COL_LENGTH('dbo.Solicitud_Contacto_V41','Codigo_Id') IS NULL OR COL_LENGTH('dbo.Solicitud_Contacto_V41','Estado')<>20
 THROW 54121,'Solicitud_Contacto_V41 tiene una estructura inesperada.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Solicitud_Contacto_V41') AND name='IX_Solicitud_V41_AlumnoFecha')
 CREATE INDEX IX_Solicitud_V41_AlumnoFecha ON dbo.Solicitud_Contacto_V41(ALUMNO_DNI_Alu,Creado) INCLUDE(Estado);
-- La lectura de contactos exige coincidencia con ALUMNO. Este trigger invalida verificaciones al editar contactos por cualquier ruta.
EXEC sys.sp_executesql N'CREATE OR ALTER TRIGGER dbo.TR_V41_Alumno_Contacto ON dbo.ALUMNO AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 UPDATE c SET Activo=0 FROM dbo.Contacto_Verificado_V41 c JOIN inserted i ON i.DNI_Alu=c.ALUMNO_DNI_Alu
 WHERE c.Activo=1 AND ((c.Tipo=''EMAIL'' AND (i.Correo_Alu IS NULL OR c.Destino<>i.Correo_Alu)) OR (c.Tipo=''SMS'' AND (i.Cel_Alu IS NULL OR c.Destino<>i.Cel_Alu)));
END;';
-- No se marca ningun contacto preexistente como verificado.
`));
write('03_ESTADOS_Y_ANULACIONES.sql',wrap('V41_03_ESTADOS_Y_ANULACIONES','V41_02_VERIFICACION_CONTACTOS',`
-- MATRICULA y Examen_Grupo ya tienen ANULADA/CANCELADO; Pago conserva su anulacion de confirmacion V4.
-- Las dos tablas laterales preservan las claves y el contenido original de alumnos/notas.
IF OBJECT_ID('dbo.Alumno_Estado_V41') IS NULL
 CREATE TABLE dbo.Alumno_Estado_V41 (
 ALUMNO_DNI_Alu varchar(8) NOT NULL CONSTRAINT PK_Alumno_Estado_V41 PRIMARY KEY,
 Activo bit NOT NULL,Usuario_Activo_Anterior bit NULL,Motivo varchar(250) NOT NULL,Usuario_Cod_Usuario varchar(20) NOT NULL,
 Fecha datetime2(0) NOT NULL CONSTRAINT DF_Alumno_Estado_V41_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Alumno_Estado_V41_Alumno FOREIGN KEY(ALUMNO_DNI_Alu) REFERENCES dbo.ALUMNO(DNI_Alu),
 CONSTRAINT FK_Alumno_Estado_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario));
ELSE IF COL_LENGTH('dbo.Alumno_Estado_V41','Usuario_Activo_Anterior') IS NULL THROW 54130,'Alumno_Estado_V41 tiene una estructura inesperada.',1;
IF OBJECT_ID('dbo.Nota_Estado_V41') IS NULL
 CREATE TABLE dbo.Nota_Estado_V41 (
 Nota_Examen_Cod_Nota varchar(20) NOT NULL CONSTRAINT PK_Nota_Estado_V41 PRIMARY KEY,
 Anulada bit NOT NULL,Motivo varchar(250) NOT NULL,Usuario_Cod_Usuario varchar(20) NOT NULL,
 Fecha datetime2(0) NOT NULL CONSTRAINT DF_Nota_Estado_V41_Fecha DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Nota_Estado_V41_Nota FOREIGN KEY(Nota_Examen_Cod_Nota) REFERENCES dbo.Nota_Examen(Cod_Nota),
 CONSTRAINT FK_Nota_Estado_V41_Usuario FOREIGN KEY(Usuario_Cod_Usuario) REFERENCES dbo.Usuario(Cod_Usuario));
ELSE IF COL_LENGTH('dbo.Nota_Estado_V41','Anulada') IS NULL THROW 54131,'Nota_Estado_V41 tiene una estructura inesperada.',1;
-- No se desactiva, anula ni restaura ningun registro durante la migracion.
`));
write('04_AUDITORIA_ADMINISTRATIVA.sql',wrap('V41_04_AUDITORIA_ADMINISTRATIVA','V41_03_ESTADOS_Y_ANULACIONES',`
-- Reutiliza Auditoria_V4 y su FK a Usuario. No cambia su estructura ni borra historia.
IF OBJECT_ID('dbo.TR_V4_Auditoria_Inmutable','TR') IS NULL OR EXISTS(SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID('dbo.TR_V4_Auditoria_Inmutable') AND is_disabled=1)
 THROW 54140,'La proteccion de auditoria V4 debe estar instalada y activa.',1;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Auditoria_V4') AND name='IX_Auditoria_V41_Fecha')
 CREATE INDEX IX_Auditoria_V41_Fecha ON dbo.Auditoria_V4(Fecha DESC,Id DESC) INCLUDE(Entidad,Codigo,Accion,Usuario_Cod_Usuario);
-- El backend registra cambios y eliminaciones de catalogos en la misma transaccion.
-- Nunca registra contrasenas, OTP, hashes de claves ni desafios de activacion en Auditoria_V4.
`));
write('99_VERIFICACION_FINAL_V4_1.sql',`-- SOLO LECTURA. Comparar recuentos con el diagnostico guardado antes de migrar.
SET NOCOUNT ON;
SELECT DB_NAME() AS BaseSeleccionada,SYSUTCDATETIME() AS HoraUTC;
SELECT Script,Fecha FROM dbo.Control_Migracion_V4 WHERE Script LIKE 'V41[_]%' ORDER BY Script;
SELECT t.name AS Tabla,c.name AS Columna,ty.name AS Tipo,c.max_length,c.is_nullable FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE t.name LIKE '%[_]V41' ORDER BY t.name,c.column_id;
SELECT name,is_disabled,is_not_trusted,delete_referential_action_desc FROM sys.foreign_keys WHERE parent_object_id IN (SELECT object_id FROM sys.tables WHERE name LIKE '%[_]V41');
SELECT name,is_disabled,is_not_trusted FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1;
SELECT name,is_disabled FROM sys.triggers WHERE name IN ('TR_V4_Auditoria_Inmutable','TR_V41_Alumno_Contacto');
${['Usuario_Seguridad_V41','Cuenta_Codigo_V41','Contacto_Verificado_V41','Solicitud_Contacto_V41','Alumno_Estado_V41','Nota_Estado_V41'].map(t=>`SELECT '${t}' AS Objeto,CASE WHEN OBJECT_ID('dbo.${t}') IS NOT NULL THEN 'OK' ELSE 'FALTA' END AS Estado;`).join('\n')}
${['ALUMNO','MATRICULA','Pago','Nota_Examen','Examen','Examen_Grupo','Usuario','Auditoria_V4'].map(t=>`SELECT '${t}' AS Tabla,COUNT_BIG(*) AS Filas FROM dbo.[${t}];`).join('\n')}
SELECT Tipo,COUNT_BIG(*) AS ContactosActivos FROM dbo.Contacto_Verificado_V41 WHERE Activo=1 GROUP BY Tipo;
SELECT Usuario_Cod_Usuario,Proposito,COUNT(*) AS CodigosPendientesDuplicados FROM dbo.Cuenta_Codigo_V41 WHERE Consumido=0 GROUP BY Usuario_Cod_Usuario,Proposito HAVING COUNT(*)>1;
SELECT COUNT(*) AS CodigosConEstadoInvalido FROM dbo.Cuenta_Codigo_V41 WHERE Intentos>5 OR DATALENGTH(Codigo_Hash)<>64;
-- Se esperan cuatro migraciones V41 registradas, seis tablas nuevas y ninguna FK en cascada nueva.
-- Los contactos existentes siguen sin verificacion automatica; no hay cambios masivos de claves ni bajas.
`);
