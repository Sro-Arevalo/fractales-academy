'use strict';
const fs=require('node:fs'),path=require('node:path');
const {tables,columns,translator}=require('./v45-names'),schema=require('./fixtures/v44-schema.json');
const dir=path.join(__dirname,'../sql/migrations/v4_5');fs.mkdirSync(dir,{recursive:true});
const quote=s=>"N'"+s.replaceAll("'","''")+"'",br=s=>'['+s.replaceAll(']',']]')+']';
const snake=s=>s.replace(/([a-z])([A-Z])/g,'$1_$2').toUpperCase();
const triggers={TR_Horario_Sin_Cruces:'TR_BLOQUE_HORARIO_VALIDAR_CRUCES',TR_Matricula_CupoMaximo:'TR_MATRICULA_VALIDAR_CAPACIDAD',TR_Nota_Examen_Puntaje:'TR_RESULTADO_SIMULACRO_VALIDAR_PUNTAJE',TR_Pago_Mes_Valido:'TR_PAGO_VALIDAR_MENSUALIDAD',TR_V4_Auditoria_Inmutable:'TR_AUDITORIA_SISTEMA_PROTEGER',TR_V4_Ciclo_Historial:'TR_CICLO_PROTEGER_HISTORIAL',TR_V4_Examen_Maximo:'TR_SIMULACRO_VALIDAR_MAXIMO',TR_V4_Grupo_Historial:'TR_HORARIO_ACADEMICO_PROTEGER_HISTORIAL',TR_V4_Matricula_Historial:'TR_MATRICULA_PROTEGER_HISTORIAL',TR_V4_Nota_Unica:'TR_RESULTADO_SIMULACRO_UNICIDAD',TR_V4_Pago_Obligacion:'TR_PAGO_VALIDAR_OBLIGACION',TR_V41_Alumno_Contacto:'TR_ALUMNO_PROTEGER_CONTACTO',TR_V43_MarcaPrueba:'TR_ALUMNO_MARCA_PRUEBA_INMUTABLE',TR_V43_Tarifa_Ciclo:'TR_CICLO_VALIDAR_TARIFA',TR_V43_Usuario_Correo:'TR_USUARIO_VERIFICAR_CORREO',TR_V44_Grupo_Publicacion:'TR_HORARIO_ACADEMICO_VALIDAR_PUBLICACION',TR_V44_Matricula_Publicada:'TR_MATRICULA_VALIDAR_PUBLICACION',TR_V44_Nota_Eliminar:'TR_RESULTADO_SIMULACRO_PROTEGER_ELIMINACION',TR_V44_Pago_Eliminar:'TR_PAGO_PROTEGER_ELIMINACION'};
const objects={...triggers},seen=new Set();
for(const o of schema.objects){let name;const table=tables[o.tabla];
 if(o.tipo==='TR')name=triggers[o.nombre];
 else if(o.tipo==='PK')name='PK_'+table;
 else if(o.tipo==='F')name='FK_'+table+'_'+tables[o.referencia];
 else if(o.tipo==='UQ')name='UQ_'+table+'_'+JSON.parse(o.claves).map(c=>columns[c.columna]).join('_');
 else if(o.tipo==='D')name='DF_'+table+'_'+columns[o.columna];
 else if(o.tipo==='C'){const suffix=Object.keys(columns).sort((a,b)=>b.length-a.length).find(k=>o.nombre.endsWith('_'+k));name='CK_'+table+'_'+(suffix?columns[suffix]:snake(o.nombre.split('_').at(-1)));}
 else throw Error('Revisar modulo adicional: '+o.nombre);
 if(!name||name.length>128||seen.has(name))throw Error('Nombre ambiguo o extenso: '+name+' ('+o.nombre+')');seen.add(name);objects[o.nombre]=name;
}
for(const i of schema.indexes){const name=(/^U[XQ]_/.test(i.nombre)?'UQ_':'IX_')+tables[i.tabla]+'_'+i.columnas.split(',').map(c=>columns[c]).join('_');if(name.length>128)throw Error('Indice extenso: '+name);objects[i.nombre]=name;}
objects.Seq_Operacion_V4='SECUENCIA_OPERACION';const translate=translator(objects);
fs.writeFileSync(path.join(dir,'mapa-nombres.json'),JSON.stringify({tables,columns,objects},null,2));
const settings=`SET NOCOUNT ON; SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;\n`;
const guard=`DECLARE @BaseEsperada sysname=N'FractalesAcademy';\nIF DB_NAME()<>@BaseEsperada OR DB_NAME() IN('master','model','msdb','tempdb') THROW 54500,'Confirma servidor y @BaseEsperada.',1;\nIF HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','VIEW DEFINITION')<>1 THROW 54501,'Se requiere VIEW DEFINITION para inspeccionar dependencias.',1;\n`;
const wrap=(step,body,old=false)=>settings+guard+`IF OBJECT_ID('dbo.${old?'Control_Migracion_V4':'CONTROL_MIGRACION'}') IS NULL THROW 54501,'Esquema de origen incorrecto.',1;\nBEGIN TRY BEGIN TRAN;\n IF NOT EXISTS(SELECT 1 FROM dbo.${old?'Control_Migracion_V4':'CONTROL_MIGRACION'} WITH(UPDLOCK,HOLDLOCK) WHERE ${old?'Script':'SCRIPT'}='V45_${step}')\n BEGIN\n${body}\n INSERT dbo.${old?'Control_Migracion_V4':'CONTROL_MIGRACION'}(${old?'Script':'SCRIPT'}) VALUES('V45_${step}');\n END; COMMIT;\nEND TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;\n`;
const type=c=>c.tipo+(['varchar','nvarchar','char'].includes(c.tipo)?'('+(c.longitud===-1?'max':c.longitud/(c.tipo==='nvarchar'?2:1))+')':c.tipo==='decimal'?'('+c.precision+','+c.scale+')':'');
const purposes=fs.existsSync('docs/v4_5/esquema.json')?Object.fromEntries(JSON.parse(fs.readFileSync('docs/v4_5/esquema.json','utf8')).tables.map(t=>[t.name,t.description])):{};
const write=(name,body)=>fs.writeFileSync(path.join(dir,name),body,'utf8');
const jsonCases=Object.entries(columns).filter(([a,b])=>a!==b).map(([a,b])=>`WHEN j.[key] COLLATE Latin1_General_100_BIN2=${quote(a)} COLLATE Latin1_General_100_BIN2 THEN ${quote(b)}`).join('\n');
const jsonFunction=`CREATE OR ALTER FUNCTION dbo.FN_V45_NORMALIZAR_JSON(@json nvarchar(max)) RETURNS nvarchar(max) AS BEGIN
 IF ISJSON(@json)<>1 RETURN @json;
 DECLARE @array bit=CASE WHEN LEFT(LTRIM(@json),1)='[' THEN 1 ELSE 0 END,@result nvarchar(max);
 SELECT @result=STRING_AGG(CONVERT(nvarchar(max),CASE WHEN @array=0 THEN '"'+STRING_ESCAPE(CASE ${jsonCases} ELSE j.[key] END,'json')+'":' ELSE '' END+
 CASE WHEN j.type IN(4,5) THEN dbo.FN_V45_NORMALIZAR_JSON(j.value) WHEN j.type=1 THEN '"'+STRING_ESCAPE(j.value,'json')+'"' WHEN j.type=0 THEN 'null' ELSE j.value END),',') WITHIN GROUP(ORDER BY CONVERT(int,j.[key])) FROM OPENJSON(CASE WHEN @array=1 THEN @json ELSE '[]' END) j;
 IF @array=0 SELECT @result=STRING_AGG(CONVERT(nvarchar(max),'"'+STRING_ESCAPE(CASE ${jsonCases} ELSE j.[key] END,'json')+'":'+CASE WHEN j.type IN(4,5) THEN dbo.FN_V45_NORMALIZAR_JSON(j.value) WHEN j.type=1 THEN '"'+STRING_ESCAPE(j.value,'json')+'"' WHEN j.type=0 THEN 'null' ELSE j.value END),',') WITHIN GROUP(ORDER BY CASE ${jsonCases} ELSE j.[key] END COLLATE Latin1_General_100_BIN2) FROM OPENJSON(@json) j;
 RETURN CASE WHEN @array=1 THEN '[' ELSE '{' END+COALESCE(@result,'')+CASE WHEN @array=1 THEN ']' ELSE '}' END;
END;`;
const tableCase=column=>'CASE '+Object.entries(tables).filter(([a,b])=>a!==b).map(([a,b])=>'WHEN '+column+'='+quote(a)+' THEN '+quote(b)).join(' ')+' ELSE '+column+' END';
let snapshot='',verify='';
for(const old of Object.keys(tables)){
 const cols=schema.columns.filter(c=>c.tabla===old),pk=JSON.parse(schema.objects.find(o=>o.tabla===old&&o.tipo==='PK').claves).map(c=>c.columna);
 const value=(c,after)=>{const ref='r.'+br(after?columns[c.columna]:c.columna);return old==='Auditoria_V4'&&['Anterior','Nuevo'].includes(c.columna)?'dbo.FN_V45_NORMALIZAR_JSON('+ref+')':old==='Auditoria_V4'&&c.columna==='Entidad'?tableCase(ref):ref;};
 const json=after=>'(SELECT '+cols.map(c=>value(c,after)+' AS '+br(columns[c.columna])).join(',')+' FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES)';
 const key=after=>'(SELECT '+pk.map(c=>'r.'+br(after?columns[c]:c)+' AS '+br(columns[c])).join(',')+' FOR JSON PATH,WITHOUT_ARRAY_WRAPPER,INCLUDE_NULL_VALUES)';
 const filter=after=>old==='Control_Migracion_V4'?` WHERE r.${after?'SCRIPT':'Script'} NOT LIKE 'V45[_]%'`:'';
 snapshot+=`INSERT dbo.MIGRACION_INTEGRIDAD_V45(TABLA,CLAVE,HUELLA) SELECT ${quote(tables[old])},${key(false)},HASHBYTES('SHA2_256',${json(false)}) FROM dbo.${br(old)} r WITH(TABLOCKX,HOLDLOCK)${filter(false)};\n`;
 verify+=`IF (SELECT COUNT_BIG(*) FROM dbo.MIGRACION_INTEGRIDAD_V45 WHERE TABLA=${quote(tables[old])})<>(SELECT COUNT_BIG(*) FROM dbo.${br(tables[old])} r${filter(true)}) OR EXISTS(SELECT 1 FROM dbo.${br(tables[old])} r LEFT JOIN dbo.MIGRACION_INTEGRIDAD_V45 b ON b.TABLA=${quote(tables[old])} AND b.CLAVE=${key(true)} WHERE ${old==='Control_Migracion_V4'?"r.SCRIPT NOT LIKE 'V45[_]%' AND ":''}(b.CLAVE IS NULL OR b.HUELLA<>HASHBYTES('SHA2_256',${json(true)}))) THROW 54507,${quote('Datos distintos en '+tables[old]+'; no retirar estructuras.')},1;\n`;
}
write('00_DIAGNOSTICO_INICIAL.sql',`-- SOLO LECTURA, sobre V4.4; no captura datos personales ni secretos.\nSET NOCOUNT ON;\nSELECT DB_NAME() BASE,COUNT(*) TABLAS FROM sys.tables WHERE is_ms_shipped=0 AND name<>'sysdiagrams';\nSELECT t.name TABLA,c.name COLUMNA,ty.name TIPO,c.max_length LONGITUD,c.is_nullable NULO FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE t.is_ms_shipped=0 ORDER BY t.name,c.column_id;
SELECT o.name OBJETO,o.type TIPO,OBJECT_NAME(o.parent_object_id) TABLA,COALESCE(cc.definition,dc.definition,sm.definition) DEFINICION FROM sys.objects o LEFT JOIN sys.check_constraints cc ON cc.object_id=o.object_id LEFT JOIN sys.default_constraints dc ON dc.object_id=o.object_id LEFT JOIN sys.sql_modules sm ON sm.object_id=o.object_id WHERE o.is_ms_shipped=0 AND o.type IN('PK','F','UQ','C','D','TR','P','V');
SELECT fk.name FK,OBJECT_NAME(fk.parent_object_id) ORIGEN,OBJECT_NAME(fk.referenced_object_id) DESTINO,fk.is_disabled,fk.is_not_trusted FROM sys.foreign_keys fk;
SELECT OBJECT_NAME(object_id) TABLA,name INDICE,is_unique,filter_definition FROM sys.indexes WHERE name IS NOT NULL;
SELECT OBJECT_NAME(referencing_id) ORIGEN,referenced_entity_name DESTINO FROM sys.sql_expression_dependencies;
SELECT 'CUENTAS_CON_AUDITORIA_ACTOR' DIAGNOSTICO,COUNT(*) CANTIDAD FROM dbo.Auditoria_V4 a JOIN dbo.Usuario u ON u.Cod_Usuario=a.Usuario_Cod_Usuario WHERE u.ALUMNO_DNI_Alu IS NOT NULL;
SELECT 'CARRERA_SIN_REFERENCIA' DIAGNOSTICO,COUNT(*) CANTIDAD FROM dbo.ALUMNO a LEFT JOIN dbo.CARRERA c ON c.Cod_Carrera=a.CARRERA_Cod_Carrera WHERE c.Cod_Carrera IS NULL;
SELECT 'MENSUALIDAD' ID_ESPERADO,COUNT(*) EXISTE FROM dbo.CONCEPTO_PAGO WHERE Cod_Concepto='MENSUALIDAD' UNION ALL SELECT 'MATRICULA_INICIAL',COUNT(*) FROM dbo.CONCEPTO_PAGO WHERE Cod_Concepto='MATRICULA_INICIAL';
DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;
`);
write('01_PREPARAR_ESTRUCTURA.sql',wrap('01_PREPARAR',`IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V44_04_RETIRAR') THROW 54501,'Completar V4.4 primero.',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) THROW 54501,'Relaciones no confiables.',1;
IF OBJECT_ID('dbo.MIGRACION_INTEGRIDAD_V45') IS NOT NULL THROW 54501,'Existe estructura parcial sin marcador.',1;
CREATE TABLE dbo.MIGRACION_INTEGRIDAD_V45(TABLA sysname NOT NULL,CLAVE nvarchar(400) NOT NULL,HUELLA varbinary(32) NOT NULL,CONSTRAINT PK_MIGRACION_INTEGRIDAD_V45 PRIMARY KEY(TABLA,CLAVE));
EXEC sys.sp_executesql ${quote(jsonFunction)};
${snapshot}`,true));
write('02_MIGRAR_DATOS.sql',wrap('02_MIGRAR',`IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V45_01_PREPARAR') THROW 54501,'Falta 01.',1;
-- Solo cambia claves JSON/entidad; conserva valores, eventos y actor. Bloqueo exclusivo y transaccion.
DISABLE TRIGGER dbo.TR_V4_Auditoria_Inmutable ON dbo.Auditoria_V4;
UPDATE dbo.Auditoria_V4 WITH(TABLOCKX) SET Entidad=${tableCase('Entidad')},Anterior=dbo.FN_V45_NORMALIZAR_JSON(Anterior),Nuevo=dbo.FN_V45_NORMALIZAR_JSON(Nuevo);
ENABLE TRIGGER dbo.TR_V4_Auditoria_Inmutable ON dbo.Auditoria_V4;`,true));
let rename=`IF NOT EXISTS(SELECT 1 FROM dbo.Control_Migracion_V4 WHERE Script='V45_02_MIGRAR') THROW 54501,'Falta 02.',1;\n`;
rename+=`IF EXISTS(SELECT 1 FROM sys.sql_modules WHERE object_id NOT IN(${schema.objects.filter(o=>o.tipo==='TR').map(o=>'OBJECT_ID('+quote('dbo.'+o.nombre)+')').join(',')},OBJECT_ID('dbo.FN_V45_NORMALIZAR_JSON'))) THROW 54503,'Vista/procedimiento/funcion adicional: revisar dependencias antes de renombrar.',1;\n`;
rename+=`IF EXISTS(SELECT 1 FROM sys.check_constraints WHERE name NOT IN(${schema.objects.filter(o=>o.tipo==='C').map(o=>quote(o.nombre)).join(',')})) THROW 54503,'CHECK adicional: revisar antes del refactor.',1;\n`;
for(const o of schema.objects.filter(o=>o.tipo==='TR'))rename+=`IF OBJECT_DEFINITION(OBJECT_ID(${quote('dbo.'+o.nombre)})) COLLATE Latin1_General_100_BIN2<>${quote(o.definicion)} COLLATE Latin1_General_100_BIN2 THROW 54503,${quote('Trigger distinto: '+o.nombre+'; revisar antes de continuar.')},1;\n`;
for(const o of schema.objects.filter(o=>o.tipo==='C'))rename+=`IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name=${quote(o.nombre)} AND definition COLLATE Latin1_General_100_BIN2=${quote(o.definicion)} COLLATE Latin1_General_100_BIN2) THROW 54503,${quote('Definicion CHECK distinta: '+o.nombre+'; revisar diagnostico antes de continuar.')},1;\nEXEC sys.sp_executesql ${quote('ALTER TABLE dbo.'+br(o.tabla)+' DROP CONSTRAINT '+br(o.nombre)+';')};\n`;
for(const i of schema.indexes.filter(i=>i.filter_definition))rename+=`IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(${quote('dbo.'+i.tabla)}) AND name=${quote(i.nombre)} AND filter_definition COLLATE Latin1_General_100_BIN2=${quote(i.filter_definition)} COLLATE Latin1_General_100_BIN2) THROW 54503,'Indice filtrado distinto; revisar antes de renombrar.',1;\n`;
for(const i of schema.indexes.filter(i=>i.filter_definition))rename+=`EXEC sys.sp_executesql ${quote('DROP INDEX '+br(i.nombre)+' ON dbo.'+br(i.tabla)+';')};\n`;
for(const [old,next] of Object.entries(tables)){
 rename+=`IF OBJECT_ID(${quote('dbo.'+old)},'U') IS NULL THROW 54503,${quote('Falta tabla origen '+old)},1;\n`;
 if(old!==next)rename+=`EXEC sys.sp_rename @objname=${quote('dbo.'+old)},@newname=${quote(next)},@objtype=N'OBJECT';\n`;
 for(const c of schema.columns.filter(c=>c.tabla===old&&c.columna!==columns[c.columna]))rename+=`EXEC sys.sp_rename @objname=${quote('dbo.'+next+'.'+c.columna)},@newname=${quote(columns[c.columna])},@objtype=N'COLUMN';\n`;
}
for(const o of schema.objects){if(o.tipo!=='C'&&o.nombre!==objects[o.nombre])rename+=`EXEC sys.sp_rename @objname=${quote('dbo.'+o.nombre)},@newname=${quote(objects[o.nombre])},@objtype=N'OBJECT';\n`;}
for(const i of schema.indexes)if(!i.filter_definition&&i.nombre!==objects[i.nombre])rename+=`EXEC sys.sp_rename @objname=${quote('dbo.'+tables[i.tabla]+'.'+i.nombre)},@newname=${quote(objects[i.nombre])},@objtype=N'INDEX';\n`;
for(const i of schema.indexes.filter(i=>i.filter_definition))rename+=`EXEC sys.sp_executesql ${quote('CREATE '+(i.is_unique?'UNIQUE ':'')+'NONCLUSTERED INDEX '+br(objects[i.nombre])+' ON dbo.'+br(tables[i.tabla])+'('+i.columnas.split(',').map(c=>br(columns[c])).join(',')+')'+(JSON.parse(i.incluidas||'[]').length?' INCLUDE('+JSON.parse(i.incluidas||'[]').map(c=>br(columns[c.columna])).join(',')+')':'')+' WHERE '+translate(i.filter_definition)+';')};\n`;
rename+=`EXEC sys.sp_rename @objname=N'dbo.Seq_Operacion_V4',@newname=N'SECUENCIA_OPERACION',@objtype=N'OBJECT';\n`;
for(const o of schema.objects.filter(o=>o.tipo==='TR'))rename+=`EXEC sys.sp_executesql ${quote(translate(o.definicion).replace(/CREATE\s+(?:OR\s+ALTER\s+)?TRIGGER/i,'CREATE OR ALTER TRIGGER'))};\n`;
// Reenlazar CHECK con las columnas finales y validar TODOS los datos existentes.
for(const o of schema.objects.filter(o=>o.tipo==='C'))rename+=`EXEC sys.sp_executesql ${quote('ALTER TABLE dbo.'+br(tables[o.tabla])+' WITH CHECK ADD CONSTRAINT '+br(objects[o.nombre])+' CHECK '+translate(o.definicion)+';')};\n`;
// El marcador usa los nombres finales, dentro de la misma transaccion.
write('03_NORMALIZAR_NOMBRES.sql',settings+guard+`IF OBJECT_ID('dbo.CONTROL_MIGRACION') IS NULL AND OBJECT_ID('dbo.Control_Migracion_V4') IS NULL THROW 54501,'Falta esquema de origen.',1;
BEGIN TRY BEGIN TRAN;
IF OBJECT_ID('dbo.Control_Migracion_V4') IS NOT NULL
BEGIN
${rename}
INSERT dbo.CONTROL_MIGRACION(SCRIPT) VALUES('V45_03_NOMBRES');
END ELSE IF NOT EXISTS(SELECT 1 FROM dbo.CONTROL_MIGRACION WHERE SCRIPT='V45_03_NOMBRES') THROW 54503,'Renombrado incompleto.',1;
COMMIT; END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
`);
write('07_VERIFICACION_PREVIA.sql',`-- SOLO LECTURA; aplicar con todas las escrituras detenidas.\nSET NOCOUNT ON;\nIF OBJECT_ID('dbo.MIGRACION_INTEGRIDAD_V45') IS NULL THROW 54507,'Falta linea base temporal. Despues de 08 usar 09.',1;\n${verify}DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;\nSELECT 'Integridad y valores preservados' RESULTADO;\n`);
write('13_MAPA_NOMBRES.md','# Mapa de nombres V4.5\n\nNo cambia identificadores ni tipos. NOMBRE_COMPLETO conserva nombres y apellidos historicos sin intentar dividirlos. CODIGO_CUENTA cubre recuperacion, activacion y verificacion; no solo recuperacion.\n\n| Tabla V4.4 | Tabla V4.5 | Funcion | Justificacion |\n|---|---|---|---|\n'+Object.entries(tables).map(([a,b])=>`| ${a} | ${b} | ${purposes[b]||b.replaceAll('_',' ').toLowerCase()} | ${a===b?'Convencion ya correcta':'Nombre singular, descriptivo y sin sufijo de version'} |`).join('\n')+'\n\n## Todas las columnas\n\n| Tabla final | Columna V4.4 | Columna V4.5 | Tipo/longitud | NULL |\n|---|---|---|---|---|\n'+schema.columns.map(c=>`| ${tables[c.tabla]} | ${c.columna} | ${columns[c.columna]} | ${type(c)} | ${c.is_nullable?'Si':'No'} |`).join('\n')+'\n\n## Objetos\n\n| Objeto anterior | Objeto final |\n|---|---|\n'+Object.entries(objects).map(([a,b])=>`| ${a} | ${b} |`).join('\n')+'\n');
if(process.argv.includes('--aplicar-codigo')){
 const files=[];for(const folder of ['server','public','tests'])for(const entry of fs.readdirSync(folder,{withFileTypes:true}))if(entry.isFile()&&/\.(js|json|html)$/.test(entry.name)&&(!folder.startsWith('tests')||/\.test\.js$/.test(entry.name)))files.push(path.join(folder,entry.name));
 files.push('scripts/create-admin.js');
 for(const file of files)fs.writeFileSync(file,translate(fs.readFileSync(file,'utf8')),'utf8');
 console.log('Codigo normalizado:',files.length,'archivos.');
}
const finalPath=path.join(dir,'08_RETIRAR_ESTRUCTURA_OBSOLETA.sql');
if(fs.existsSync(finalPath)){let text=fs.readFileSync(finalPath,'utf8');text=text.replace(/(-- BEGIN VERIFICACION V45\r?\n)[\s\S]*?(\s*-- END VERIFICACION V45)/,'$1'+fs.readFileSync(path.join(dir,'07_VERIFICACION_PREVIA.sql'),'utf8')+'$2');fs.writeFileSync(finalPath,text);}
console.log('Mapa y etapas SQL generados. No se ejecuta SQL.');
