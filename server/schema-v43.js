'use strict';
const ops=require('./operations');
async function ready(tx){
  const row=(await ops.query(tx,`SELECT CASE WHEN COL_LENGTH('dbo.ALUMNO','ES_PRUEBA') IS NOT NULL
    AND COL_LENGTH('dbo.USUARIO','CORREO_RECUPERACION')=150 AND COL_LENGTH('dbo.USUARIO','CORREO_VERIFICADO') IS NOT NULL THEN 1 ELSE 0 END listo,
    CASE WHEN COL_LENGTH('dbo.ALUMNO','ES_PRUEBA') IS NOT NULL THEN 1 ELSE 0 END parcial`)).recordset[0];
  if(!row?.listo){if(row?.parcial)throw Object.assign(new Error('El esquema V4.3 está incompleto. Revisa la migración antes de continuar.'),{status:503});return false;}
  const recorded=(await ops.query(tx,"SELECT SCRIPT FROM dbo.CONTROL_MIGRACION WHERE SCRIPT='V43_01_APODERADOS_Y_PRUEBAS'")).recordset[0];
  if(!recorded)throw Object.assign(new Error('El esquema V4.3 no tiene una migración completa registrada.'),{status:503});
  return true;
}
async function required(tx){if(!await ready(tx))throw Object.assign(new Error('Completa las migraciones de cuentas y limpieza controlada.'),{status:503});}
module.exports={ready,required};
