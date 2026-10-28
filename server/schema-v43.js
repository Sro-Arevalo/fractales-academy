'use strict';
const ops=require('./operations');
async function ready(tx){
  const row=(await ops.query(tx,`SELECT CASE WHEN OBJECT_ID('dbo.APODERADO') IS NOT NULL AND COL_LENGTH('dbo.ALUMNO','Es_Prueba') IS NOT NULL
    AND OBJECT_ID('dbo.FK_ALUMNO_APODERADO','F') IS NOT NULL AND COL_LENGTH('dbo.Usuario','Correo_Recuperacion')=150 AND COL_LENGTH('dbo.Usuario','Correo_Verificado') IS NOT NULL THEN 1 ELSE 0 END listo,
    CASE WHEN OBJECT_ID('dbo.APODERADO') IS NOT NULL OR COL_LENGTH('dbo.ALUMNO','Es_Prueba') IS NOT NULL THEN 1 ELSE 0 END parcial`)).recordset[0];
  if(!row?.listo){if(row?.parcial)throw Object.assign(new Error('El esquema V4.3 está incompleto. Revisa la migración antes de continuar.'),{status:503});return false;}
  const recorded=(await ops.query(tx,"SELECT Script FROM dbo.Control_Migracion_V4 WHERE Script='V43_01_APODERADOS_Y_PRUEBAS'")).recordset[0];
  if(!recorded)throw Object.assign(new Error('El esquema V4.3 no tiene una migración completa registrada.'),{status:503});
  return true;
}
async function required(tx){if(!await ready(tx))throw Object.assign(new Error('Completa la migración V4.3 para utilizar apoderados y limpieza controlada.'),{status:503});}
module.exports={ready,required};
