'use strict';
const fs=require('node:fs');const path=require('node:path');
const {wrap,write}=require('./build-v4-sql');
const original=fs.readFileSync(path.join(__dirname,'../sql/01_AZURE_BASE_NUEVA_25_TABLAS.sql'),'utf8');
function originalTrigger(name){const source=original.match(new RegExp(`CREATE OR ALTER TRIGGER ${name}\\b[\\s\\S]*?^GO`,'m'))[0].replace(/^GO$/m,'');return `IF OBJECT_ID('dbo.${name}','TR') IS NULL ${exec(source)}\nIF EXISTS (SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID('dbo.${name}') AND is_disabled=1) THROW 54007,'Trigger original deshabilitado: ${name}. Revisar manualmente.',1;`;}
const exec=s=>`EXEC sys.sp_executesql N'${s.replace(/'/g,"''")}';`;
write('sql/migrations/v4/02_ACTUALIZACION_MATRICULAS.sql',wrap('02_ACTUALIZACION_MATRICULAS',`
-- MATRICULA ya conserva alumno, grupo y fecha; Grupo ya relaciona ciclo, turno y aula.
-- No se duplican estas columnas. Se usa Seq_Operacion_V4 (00A) para los códigos nuevos.
IF EXISTS (SELECT m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo FROM dbo.MATRICULA m JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo GROUP BY m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo HAVING COUNT_BIG(*)>1)
 THROW 54020,'Hay matriculas repetidas de un alumno en el mismo ciclo. Revisar sin borrar historiales.',1;
IF EXISTS (SELECT 1 FROM dbo.Grupo g WHERE (SELECT COUNT_BIG(*) FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo AND m.ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA')>g.Cupo_Max)
 THROW 54021,'Hay grupos con cupo excedido; requiere revision.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.MATRICULA') AND name='IX_V4_Matricula_GrupoEstado')
 CREATE INDEX IX_V4_Matricula_GrupoEstado ON dbo.MATRICULA(Grupo_Cod_Grupo,ESTADO_MATRICULA_Cod_Estado_Matricula);
${originalTrigger('TR_Matricula_CupoMaximo')}
${exec(`CREATE OR ALTER TRIGGER dbo.TR_V4_Matricula_Historial ON dbo.MATRICULA AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Matricula=i.Cod_Matricula WHERE i.ALUMNO_DNI_Alu<>d.ALUMNO_DNI_Alu OR i.Grupo_Cod_Grupo<>d.Grupo_Cod_Grupo OR i.Fech_Matricula<>d.Fech_Matricula)
 THROW 54022,'No se permite reasignar alumno, grupo o fecha de una matricula historica.',1;
 IF EXISTS (SELECT m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo FROM dbo.MATRICULA m WITH (UPDLOCK,HOLDLOCK) JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo
 JOIN (SELECT DISTINCT ALUMNO_DNI_Alu FROM inserted) i ON i.ALUMNO_DNI_Alu=m.ALUMNO_DNI_Alu GROUP BY m.ALUMNO_DNI_Alu,g.Ciclo_Cod_Ciclo HAVING COUNT_BIG(*)>1)
 THROW 54023,'El alumno ya tiene matricula en este ciclo.',1;
END;`)}
`,"SELECT name,is_disabled FROM sys.triggers WHERE parent_id=OBJECT_ID('dbo.MATRICULA');\n"));
write('sql/migrations/v4/03_ACTUALIZACION_PAGOS.sql',wrap('03_ACTUALIZACION_PAGOS',`
-- Pago es la obligación y conserva su importe original; no se crea otra tabla de deudas.
IF EXISTS (SELECT MATRICULA_Cod_Matricula,Nro_Mensualidad FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD' GROUP BY MATRICULA_Cod_Matricula,Nro_Mensualidad HAVING COUNT_BIG(*)>1)
 THROW 54030,'Hay mensualidades duplicadas. No se realizo ninguna conciliacion automatica.',1;
IF EXISTS (SELECT ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto FROM dbo.Pago WHERE CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES') GROUP BY ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto HAVING COUNT_BIG(*)>1)
 THROW 54031,'Hay conceptos unicos duplicados.',1;
IF EXISTS (SELECT 1 FROM dbo.Pago p JOIN dbo.MATRICULA m ON m.Cod_Matricula=p.MATRICULA_Cod_Matricula JOIN dbo.Grupo g ON g.Cod_Grupo=m.Grupo_Cod_Grupo JOIN dbo.Ciclo c ON c.Cod_Ciclo=g.Ciclo_Cod_Ciclo WHERE p.CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD' AND p.Nro_Mensualidad>c.Nro_Mensualidades)
 THROW 54032,'Existen mensualidades incompatibles con su ciclo.',1;
IF EXISTS (SELECT 1 FROM dbo.Pago WHERE Medio_Pago IS NOT NULL AND Medio_Pago NOT IN ('YAPE','EFECTIVO','TARJETA'))
 AND OBJECT_ID('dbo.MEDIO_PAGO') IS NULL
 THROW 54033,'Hay medios de pago ajenos al modelo original. Catalogarlos mediante una migracion revisada.',1;
IF OBJECT_ID('dbo.MEDIO_PAGO') IS NULL
 CREATE TABLE dbo.MEDIO_PAGO (Cod_Medio varchar(10) NOT NULL CONSTRAINT PK_MEDIO_PAGO PRIMARY KEY,Nomb_Medio varchar(60) NOT NULL,
 Activo bit NOT NULL CONSTRAINT DF_MEDIO_PAGO_Activo DEFAULT (1),CONSTRAINT UQ_MEDIO_PAGO_Nombre UNIQUE(Nomb_Medio),
 CONSTRAINT CK_MEDIO_PAGO_Codigo CHECK (DATALENGTH(Cod_Medio) BETWEEN 1 AND 10 AND Cod_Medio COLLATE Latin1_General_100_BIN2 NOT LIKE '%[^A-Z0-9_-]%'));
${[['EFECTIVO','Efectivo'],['YAPE','Yape'],['TARJETA','Tarjeta']].map(([c,n])=>`IF NOT EXISTS(SELECT 1 FROM dbo.MEDIO_PAGO WHERE Cod_Medio='${c}') INSERT dbo.MEDIO_PAGO(Cod_Medio,Nomb_Medio) VALUES('${c}','${n}');`).join('\n')}
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID('dbo.Pago') AND name='FK_V4_Pago_Medio')
 ALTER TABLE dbo.Pago WITH CHECK ADD CONSTRAINT FK_V4_Pago_Medio FOREIGN KEY(Medio_Pago) REFERENCES dbo.MEDIO_PAGO(Cod_Medio);
-- Reemplazo atómico del CHECK cerrado por una FK validada; ningún dato se elimina.
IF OBJECT_ID('dbo.CK_Pago_Medio','C') IS NOT NULL ALTER TABLE dbo.Pago DROP CONSTRAINT CK_Pago_Medio;
ALTER TABLE dbo.Pago WITH CHECK CHECK CONSTRAINT FK_V4_Pago_Medio;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Pago') AND name='UX_Pago_ConceptoUnicoAlumno')
 CREATE UNIQUE INDEX UX_Pago_ConceptoUnicoAlumno ON dbo.Pago(ALUMNO_DNI_Alu,CONCEPTO_PAGO_Cod_Concepto) WHERE CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Pago') AND name='UX_Pago_MensualidadMatricula')
 CREATE UNIQUE INDEX UX_Pago_MensualidadMatricula ON dbo.Pago(MATRICULA_Cod_Matricula,Nro_Mensualidad) WHERE CONCEPTO_PAGO_Cod_Concepto='MENSUALIDAD';
${originalTrigger('TR_Pago_Mes_Valido')}
${exec(`CREATE OR ALTER TRIGGER dbo.TR_V4_Pago_Obligacion ON dbo.Pago AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Pago=i.Cod_Pago
 WHERE i.ALUMNO_DNI_Alu<>d.ALUMNO_DNI_Alu OR i.CONCEPTO_PAGO_Cod_Concepto<>d.CONCEPTO_PAGO_Cod_Concepto OR i.Monto<>d.Monto
 OR ISNULL(i.MATRICULA_Cod_Matricula,'')<>ISNULL(d.MATRICULA_Cod_Matricula,'') OR ISNULL(i.Nro_Mensualidad,0)<>ISNULL(d.Nro_Mensualidad,0)
 OR ISNULL(i.Fech_Vencimiento,CONVERT(date,'00010101'))<>ISNULL(d.Fech_Vencimiento,CONVERT(date,'00010101')))
 THROW 54034,'Las obligaciones conservan alumno, concepto, matricula, cuota, importe y vencimiento originales.',1;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Pago=i.Cod_Pago
 WHERE d.Cod_Pago IS NULL AND i.CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES') AND
 (SELECT COUNT_BIG(*) FROM dbo.Pago p WITH (UPDLOCK,HOLDLOCK) WHERE p.ALUMNO_DNI_Alu=i.ALUMNO_DNI_Alu AND p.CONCEPTO_PAGO_Cod_Concepto IN ('MATRICULA_INICIAL','MATERIALES'))>1)
 THROW 54035,'El alumno ya tiene un cargo inicial; no duplicar matricula y materiales.',1;
 IF EXISTS (SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.Cod_Pago=i.Cod_Pago WHERE d.Cod_Pago IS NULL AND i.CONCEPTO_PAGO_Cod_Concepto='MATRICULA_INICIAL' AND i.Monto<>50)
 THROW 54036,'El cargo de inscripcion inicial nuevo debe ser S/ 50.',1;
END;`)}
${exec(`CREATE OR ALTER TRIGGER dbo.TR_V4_Auditoria_Inmutable ON dbo.Auditoria_V4 INSTEAD OF UPDATE,DELETE AS
BEGIN SET NOCOUNT ON; THROW 54037,'El historial de auditoria no se puede modificar ni eliminar.',1; END;`)}
`,"SELECT * FROM dbo.MEDIO_PAGO; SELECT name,is_disabled,is_not_trusted FROM sys.foreign_keys WHERE name='FK_V4_Pago_Medio';\n"));
write('sql/migrations/v4/04_ACTUALIZACION_SIMULACROS.sql',wrap('04_ACTUALIZACION_SIMULACROS',`
-- Examen, Examen_Grupo y Nota_Examen YA representan simulacros generales.
-- No hay asignatura ni curso en estas tablas. Las dos FK compuestas garantizan pertenencia al grupo.
IF EXISTS (SELECT 1 FROM dbo.Nota_Examen n JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo JOIN dbo.Examen e ON e.Cod_Examen=eg.Examen_Cod_Examen WHERE n.Puntaje_total<0 OR n.Puntaje_total>e.puntaje_maximo)
 THROW 54040,'Hay puntajes fuera de rango; requiere revision autorizada.',1;
IF EXISTS (SELECT m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen FROM dbo.Nota_Examen n JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo GROUP BY m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen HAVING COUNT_BIG(*)>1)
 THROW 54041,'Hay varios resultados del mismo alumno para un simulacro.',1;
${originalTrigger('TR_Nota_Examen_Puntaje')}
${exec(`CREATE OR ALTER TRIGGER dbo.TR_V4_Nota_Unica ON dbo.Nota_Examen AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Nota=i.Cod_Nota WHERE i.MATRICULA_Cod_Matricula<>d.MATRICULA_Cod_Matricula OR i.Examen_Grupo_Cod_examen_grupo<>d.Examen_Grupo_Cod_examen_grupo OR i.Grupo_Cod_Grupo<>d.Grupo_Cod_Grupo OR i.Fech_registro<>d.Fech_registro)
 THROW 54042,'La correccion de puntaje no puede reasignar su historial.',1;
 IF EXISTS (SELECT m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen FROM dbo.Nota_Examen n WITH (UPDLOCK,HOLDLOCK) JOIN dbo.MATRICULA m ON m.Cod_Matricula=n.MATRICULA_Cod_Matricula
 JOIN dbo.Examen_Grupo eg ON eg.Cod_examen_grupo=n.Examen_Grupo_Cod_examen_grupo
 WHERE eg.Examen_Cod_Examen IN (SELECT e.Examen_Cod_Examen FROM inserted i JOIN dbo.Examen_Grupo e ON e.Cod_examen_grupo=i.Examen_Grupo_Cod_examen_grupo)
 GROUP BY m.ALUMNO_DNI_Alu,eg.Examen_Cod_Examen HAVING COUNT_BIG(*)>1)
 THROW 54043,'Solo se permite un puntaje total por alumno y simulacro.',1;
END;`)}
${exec(`CREATE OR ALTER TRIGGER dbo.TR_V4_Examen_Maximo ON dbo.Examen AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted e JOIN dbo.Examen_Grupo eg ON eg.Examen_Cod_Examen=e.Cod_Examen JOIN dbo.Nota_Examen n ON n.Examen_Grupo_Cod_examen_grupo=eg.Cod_examen_grupo WHERE n.Puntaje_total>e.puntaje_maximo)
 THROW 54044,'El nuevo maximo es menor que un puntaje registrado.',1;
END;`)}
`,"SELECT name,is_disabled FROM sys.triggers WHERE parent_id IN (OBJECT_ID('dbo.Nota_Examen'),OBJECT_ID('dbo.Examen'));\n"));
write('sql/migrations/v4/05_ACTUALIZACION_HORARIOS.sql',wrap('05_ACTUALIZACION_HORARIOS',`
-- Se conservan la FK compuesta docente/curso y los CHECK de turnos, días y recreos.
IF EXISTS (SELECT 1 FROM dbo.Horario h JOIN dbo.Grupo g ON g.Cod_Grupo=h.Grupo_Cod_Grupo JOIN dbo.Turno t ON t.Cod_Turno=g.Turno_Cod_Turno WHERE h.Activo=1 AND (h.Hr_Inicio<t.Hr_Inicio OR h.Hr_Fin>t.Hr_Fin))
 THROW 54050,'Hay bloques fuera de turno. Revisar antes de continuar.',1;
IF EXISTS (SELECT 1 FROM dbo.Horario i JOIN dbo.Grupo gi ON gi.Cod_Grupo=i.Grupo_Cod_Grupo JOIN dbo.Ciclo ci ON ci.Cod_Ciclo=gi.Ciclo_Cod_Ciclo
 JOIN dbo.Horario h ON h.Cod_Horario>i.Cod_Horario AND h.Activo=1 AND h.Dia_Semana=i.Dia_Semana AND h.Hr_Inicio<i.Hr_Fin AND i.Hr_Inicio<h.Hr_Fin
 JOIN dbo.Grupo gh ON gh.Cod_Grupo=h.Grupo_Cod_Grupo JOIN dbo.Ciclo ch ON ch.Cod_Ciclo=gh.Ciclo_Cod_Ciclo
 WHERE i.Activo=1 AND ci.Fech_Inicio<=ch.Fech_Fin AND ch.Fech_Inicio<=ci.Fech_Fin AND (i.Grupo_Cod_Grupo=h.Grupo_Cod_Grupo OR gi.Aula_Cod_Aula=gh.Aula_Cod_Aula OR i.Docente_Asignatura_Docente_DNI_Doc=h.Docente_Asignatura_Docente_DNI_Doc))
 THROW 54051,'Hay cruces de grupo, aula o docente en los datos actuales.',1;
${originalTrigger('TR_Horario_Sin_Cruces')}
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Horario') AND name='IX_V4_Horario_DiaGrupo')
 CREATE INDEX IX_V4_Horario_DiaGrupo ON dbo.Horario(Dia_Semana,Grupo_Cod_Grupo,Hr_Inicio) INCLUDE (Hr_Fin,Activo,Docente_Asignatura_Docente_DNI_Doc);
${exec(`CREATE OR ALTER TRIGGER dbo.TR_V4_Grupo_Historial ON dbo.Grupo AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo WHERE i.Ciclo_Cod_Ciclo<>d.Ciclo_Cod_Ciclo AND EXISTS (SELECT 1 FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=i.Cod_Grupo))
 THROW 54052,'No se puede cambiar el ciclo de un grupo con matriculas.',1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Grupo=i.Cod_Grupo WHERE (i.Aula_Cod_Aula<>d.Aula_Cod_Aula OR i.Turno_Cod_Turno<>d.Turno_Cod_Turno OR i.Ciclo_Cod_Ciclo<>d.Ciclo_Cod_Ciclo) AND EXISTS (SELECT 1 FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=i.Cod_Grupo))
 THROW 54053,'Reorganice los bloques antes de cambiar aula, turno o ciclo.',1;
 IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.Aula a ON a.Cod_Aula=i.Aula_Cod_Aula WHERE i.Cupo_Max>a.Capacidad OR i.Cupo_Max<(SELECT COUNT_BIG(*) FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=i.Cod_Grupo AND m.ESTADO_MATRICULA_Cod_Estado_Matricula='ACTIVA'))
 THROW 54054,'Cupo incompatible con aula o matriculas activas.',1;
END;`)}
${exec(`CREATE OR ALTER TRIGGER dbo.TR_V4_Ciclo_Historial ON dbo.Ciclo AFTER UPDATE AS
BEGIN SET NOCOUNT ON;
 IF EXISTS (SELECT 1 FROM inserted i JOIN deleted d ON d.Cod_Ciclo=i.Cod_Ciclo WHERE (i.Programa_Cod_Programa<>d.Programa_Cod_Programa OR i.Modalidad<>d.Modalidad OR i.Fech_Inicio<>d.Fech_Inicio OR i.Fech_Fin<>d.Fech_Fin OR i.Nro_Mensualidades<>d.Nro_Mensualidades)
 AND EXISTS (SELECT 1 FROM dbo.Grupo g WHERE g.Ciclo_Cod_Ciclo=i.Cod_Ciclo AND (EXISTS (SELECT 1 FROM dbo.MATRICULA m WHERE m.Grupo_Cod_Grupo=g.Cod_Grupo) OR EXISTS (SELECT 1 FROM dbo.Horario h WHERE h.Grupo_Cod_Grupo=g.Cod_Grupo))))
 THROW 54055,'No se puede redefinir una edicion con matriculas u horarios.',1;
END;`)}
`,"SELECT name,is_disabled FROM sys.triggers WHERE parent_id=OBJECT_ID('dbo.Horario');\n"));
write('sql/migrations/v4/06_ACTUALIZACION_USUARIOS.sql',wrap('06_ACTUALIZACION_USUARIOS',`
-- Los campos de hash y cambio obligatorio ya existen: NO se cambian hashes, claves ni usuarios antiguos.
IF EXISTS (SELECT ALUMNO_DNI_Alu FROM dbo.Usuario WHERE ALUMNO_DNI_Alu IS NOT NULL GROUP BY ALUMNO_DNI_Alu HAVING COUNT_BIG(*)>1)
 THROW 54060,'Hay cuentas de alumno duplicadas. Requiere conciliacion manual.',1;
IF EXISTS (SELECT 1 FROM dbo.Usuario WHERE ROL_Cod_Rol NOT IN ('ADMIN','ALUMNO') OR (ROL_Cod_Rol='ALUMNO' AND ALUMNO_DNI_Alu IS NULL) OR (ROL_Cod_Rol='ADMIN' AND ALUMNO_DNI_Alu IS NOT NULL))
 THROW 54061,'Hay cuentas incompatibles con los roles ADMIN/ALUMNO.',1;
IF EXISTS (SELECT 1 FROM dbo.ROL WHERE Cod_Rol NOT IN ('ADMIN','ALUMNO')) THROW 54062,'Hay roles fuera del modelo acordado; revisar sin eliminarlos.',1;
IF NOT EXISTS (SELECT 1 FROM dbo.ROL WHERE Cod_Rol='ADMIN') OR NOT EXISTS (SELECT 1 FROM dbo.ROL WHERE Cod_Rol='ALUMNO') THROW 54063,'Faltan los roles originales. Revisar los catalogos antes de continuar.',1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Usuario') AND name='UX_Usuario_UnicaCuentaAlumno')
 CREATE UNIQUE INDEX UX_Usuario_UnicaCuentaAlumno ON dbo.Usuario(ALUMNO_DNI_Alu) WHERE ALUMNO_DNI_Alu IS NOT NULL;
-- Nomb_Usuario mantiene UNIQUE; las cuentas NUEVAS usan DNI, las anteriores conservan su acceso.
`,"SELECT Cod_Rol,Nomb_Rol FROM dbo.ROL; SELECT name,is_unique,filter_definition FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.Usuario');\n"));
