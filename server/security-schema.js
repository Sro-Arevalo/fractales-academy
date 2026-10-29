'use strict';
const {request}=require('./db');
let activated=false;
function unavailable(){return Object.assign(new Error('El esquema de seguridad V4.1 está incompleto o no es visible para la aplicación.'),{status:503,name:'SecuritySchemaUnavailable'});}
async function securityReady(tx){
  const policy=process.env.ACCOUNT_SECURITY_V41||'auto';if(!['auto','required'].includes(policy))throw unavailable();
  const r=await request(tx);
  const row=(await r.query(`SELECT CASE WHEN OBJECT_ID('dbo.SEGURIDAD_USUARIO') IS NOT NULL
    AND OBJECT_ID('dbo.CODIGO_CUENTA') IS NOT NULL AND OBJECT_ID('dbo.CONTACTO_VERIFICADO') IS NOT NULL
    AND OBJECT_ID('dbo.SOLICITUD_CONTACTO') IS NOT NULL AND OBJECT_ID('dbo.ESTADO_ALUMNO') IS NOT NULL
    AND OBJECT_ID('dbo.ESTADO_RESULTADO') IS NOT NULL AND OBJECT_ID('dbo.CONTROL_MIGRACION') IS NOT NULL
    THEN 1 ELSE 0 END AS listo,
    CASE WHEN OBJECT_ID('dbo.SEGURIDAD_USUARIO') IS NOT NULL OR OBJECT_ID('dbo.CODIGO_CUENTA') IS NOT NULL
    OR OBJECT_ID('dbo.CONTACTO_VERIFICADO') IS NOT NULL OR OBJECT_ID('dbo.SOLICITUD_CONTACTO') IS NOT NULL
    OR OBJECT_ID('dbo.ESTADO_ALUMNO') IS NOT NULL OR OBJECT_ID('dbo.ESTADO_RESULTADO') IS NOT NULL THEN 1 ELSE 0 END AS parcial`)).recordset[0];
  if(!row?.listo){if(activated||row?.parcial||policy==='required')throw unavailable();return false;}
  const complete=(await (await request(tx)).query("SELECT COUNT(*) n FROM dbo.CONTROL_MIGRACION WHERE SCRIPT IN ('V41_01_RECUPERACION_CUENTAS','V41_02_VERIFICACION_CONTACTOS','V41_03_ESTADOS_Y_ANULACIONES','V41_04_AUDITORIA_ADMINISTRATIVA')")).recordset[0].n===4;
  if(!complete)throw unavailable();activated=true;return true;
}
async function securityFor(user,tx){
  if(!await securityReady(tx))return {...user,VERSION_SESION:0,ACTIVACION_REQUERIDA:false,Alumno_Activo:true,Seguridad_V41:false};
  const r=await request(tx);r.input('id',user.ID_USUARIO);
  const row=(await r.query(`SELECT ISNULL(s.VERSION_SESION,0) AS VERSION_SESION,ISNULL(s.ACTIVACION_REQUERIDA,0) AS ACTIVACION_REQUERIDA,ISNULL(a.ACTIVO,1) AS Alumno_Activo
    FROM dbo.USUARIO u LEFT JOIN dbo.SEGURIDAD_USUARIO s ON s.ID_USUARIO_RESPONSABLE=u.ID_USUARIO LEFT JOIN dbo.ESTADO_ALUMNO a ON a.DNI_ALUMNO=u.DNI_ALUMNO WHERE u.ID_USUARIO=@id`)).recordset[0];
  return {...user,VERSION_SESION:row?.VERSION_SESION||0,ACTIVACION_REQUERIDA:!!row?.ACTIVACION_REQUERIDA,Alumno_Activo:!!row?.Alumno_Activo,Seguridad_V41:true};
}
module.exports={securityReady,securityFor};
