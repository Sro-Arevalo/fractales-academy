'use strict';
const ops=require('./operations');
const {rule}=require('./rules');
async function ready(tx){
  const r=(await ops.query(tx,"SELECT COL_LENGTH('dbo.HORARIO_ACADEMICO','ESTADO_HORARIO') estado,COL_LENGTH('dbo.BLOQUE_HORARIO','EXCEPCION_TURNO') excepcion")).recordset[0];
  if(!r?.estado&&!r?.excepcion)return false;
  const count=(await ops.query(tx,"SELECT COUNT(*) n FROM dbo.CONTROL_MIGRACION WHERE SCRIPT IN('V44_01_PREPARAR','V44_02_MIGRAR','V44_04_RETIRAR')")).recordset[0].n;
  if(!r.estado||!r.excepcion||count!==3)throw Object.assign(rule('La migración V4.4 está incompleta. Termina los pasos SQL 01 a 05 antes de abrir la aplicación.'),{status:503});
  return true;
}
async function required(tx){if(!await ready(tx))throw Object.assign(rule('Esta función requiere completar la migración V4.4.'),{status:503});}
module.exports={ready,required};
