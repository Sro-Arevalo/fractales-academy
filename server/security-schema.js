'use strict';
const {request}=require('./db');
let activated=false;
function unavailable(){return Object.assign(new Error('El esquema de seguridad V4.1 está incompleto o no es visible para la aplicación.'),{status:503,name:'SecuritySchemaUnavailable'});}
async function securityReady(tx){
  const policy=process.env.ACCOUNT_SECURITY_V41||'auto';if(!['auto','required'].includes(policy))throw unavailable();
  const r=await request(tx);
  const row=(await r.query(`SELECT CASE WHEN OBJECT_ID('dbo.Usuario_Seguridad_V41') IS NOT NULL
    AND OBJECT_ID('dbo.Cuenta_Codigo_V41') IS NOT NULL AND OBJECT_ID('dbo.Contacto_Verificado_V41') IS NOT NULL
    AND OBJECT_ID('dbo.Solicitud_Contacto_V41') IS NOT NULL AND OBJECT_ID('dbo.Alumno_Estado_V41') IS NOT NULL
    AND OBJECT_ID('dbo.Nota_Estado_V41') IS NOT NULL AND OBJECT_ID('dbo.Control_Migracion_V4') IS NOT NULL
    THEN 1 ELSE 0 END AS listo,
    CASE WHEN OBJECT_ID('dbo.Usuario_Seguridad_V41') IS NOT NULL OR OBJECT_ID('dbo.Cuenta_Codigo_V41') IS NOT NULL
    OR OBJECT_ID('dbo.Contacto_Verificado_V41') IS NOT NULL OR OBJECT_ID('dbo.Solicitud_Contacto_V41') IS NOT NULL
    OR OBJECT_ID('dbo.Alumno_Estado_V41') IS NOT NULL OR OBJECT_ID('dbo.Nota_Estado_V41') IS NOT NULL THEN 1 ELSE 0 END AS parcial`)).recordset[0];
  if(!row?.listo){if(activated||row?.parcial||policy==='required')throw unavailable();return false;}
  const complete=(await (await request(tx)).query("SELECT COUNT(*) n FROM dbo.Control_Migracion_V4 WHERE Script IN ('V41_01_RECUPERACION_CUENTAS','V41_02_VERIFICACION_CONTACTOS','V41_03_ESTADOS_Y_ANULACIONES','V41_04_AUDITORIA_ADMINISTRATIVA')")).recordset[0].n===4;
  if(!complete)throw unavailable();activated=true;return true;
}
async function securityFor(user,tx){
  if(!await securityReady(tx))return {...user,Version_Sesion:0,Activacion_Requerida:false,Alumno_Activo:true,Seguridad_V41:false};
  const r=await request(tx);r.input('id',user.Cod_Usuario);
  const row=(await r.query(`SELECT ISNULL(s.Version_Sesion,0) AS Version_Sesion,ISNULL(s.Activacion_Requerida,0) AS Activacion_Requerida,ISNULL(a.Activo,1) AS Alumno_Activo
    FROM dbo.Usuario u LEFT JOIN dbo.Usuario_Seguridad_V41 s ON s.Usuario_Cod_Usuario=u.Cod_Usuario LEFT JOIN dbo.Alumno_Estado_V41 a ON a.ALUMNO_DNI_Alu=u.ALUMNO_DNI_Alu WHERE u.Cod_Usuario=@id`)).recordset[0];
  return {...user,Version_Sesion:row?.Version_Sesion||0,Activacion_Requerida:!!row?.Activacion_Requerida,Alumno_Activo:!!row?.Alumno_Activo,Seguridad_V41:true};
}
module.exports={securityReady,securityFor};
