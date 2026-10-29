'use strict';
const {rule}=require('./rules');
async function required(tx){
 const ops=require('./operations');
 const r=(await ops.query(tx,`SELECT CASE WHEN OBJECT_ID('dbo.PAPELERA_REGISTRO','U') IS NOT NULL AND OBJECT_ID('dbo.POLITICA_AUDITORIA','U') IS NOT NULL
 AND COL_LENGTH('dbo.USUARIO','ID_USUARIO')=20 AND COL_LENGTH('dbo.ALUMNO','DNI_ALUMNO')=8 AND COL_LENGTH('dbo.AUDITORIA_SISTEMA','NOMBRE_ACTOR')=120 THEN 1 ELSE 0 END listo`)).recordset[0];
 if(!r?.listo)throw Object.assign(rule('La estructura SQL instalada no corresponde a V4.5. Completa la migración antes de abrir la aplicación.'),{status:503});
 const mark=(await ops.query(tx,"SELECT COUNT(*) n FROM dbo.CONTROL_MIGRACION WHERE SCRIPT='V45_08_FINALIZAR'")).recordset[0];
 if(mark?.n!==1)throw Object.assign(rule('La migración V4.5 está pendiente de verificación y finalización.'),{status:503});
 const expected=Object.values(require('./model.json')).flatMap(m=>m.columns.map(c=>({tabla:m.name,columna:c.name})));
 const missing=(await ops.query(tx,`SELECT COUNT(*) n FROM OPENJSON(@expected) WITH(tabla sysname '$.tabla',columna sysname '$.columna') e
 WHERE NOT EXISTS(SELECT 1 FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id WHERE t.schema_id=SCHEMA_ID('dbo') AND t.name COLLATE Latin1_General_100_BIN2=e.tabla COLLATE Latin1_General_100_BIN2 AND c.name COLLATE Latin1_General_100_BIN2=e.columna COLLATE Latin1_General_100_BIN2)`,{expected:JSON.stringify(expected)})).recordset[0];
 if(missing.n)throw Object.assign(rule('La estructura SQL no contiene todos los atributos que requiere V4.5. Revisa la verificación final y el despliegue.'),{status:503});
}
module.exports={required};
