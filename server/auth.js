'use strict';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {request, sql} = require('./db');
const {securityFor}=require('./security-schema');
const COOKIE = 'fractales_session';
const TTL = 8 * 3600;
function secret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Configura JWT_SECRET de al menos 32 caracteres.');
  return process.env.JWT_SECRET;
}
function createSession(res, row, options={}) {
  const scope=options.scope||(row.Debe_Cambiar_Clave?'password_change':'full');const ttl=scope==='full'?TTL:600;
  const token = jwt.sign({sub:row.Cod_Usuario, role:row.ROL_Cod_Rol, student:row.ALUMNO_DNI_Alu || null, change:!!row.Debe_Cambiar_Clave,version:row.Version_Sesion||0,scope,...(options.activation?{activation:options.activation}:{})}, secret(), {expiresIn:ttl, issuer:'fractales-academy', audience:'fractales-app',algorithm:'HS256'});
  res.cookie(COOKIE, token, {httpOnly:true, secure:process.env.NODE_ENV === 'production', sameSite:'strict', path:'/', maxAge:ttl * 1000});
}
function clearSession(res) { res.clearCookie(COOKIE, {httpOnly:true, secure:process.env.NODE_ENV === 'production', sameSite:'strict', path:'/'}); }
async function authenticate(req,res,next) {
  try {
    const token = req.cookies && req.cookies[COOKIE];
    if (!token) return res.status(401).json({error:'Inicia sesión para continuar.'});
    const payload = jwt.verify(token,secret(),{issuer:'fractales-academy',audience:'fractales-app',algorithms:['HS256']});
    const r = await request(); r.input('id',sql.VarChar(20),payload.sub);
    const user = (await r.query(`SELECT Cod_Usuario, Nomb_Usuario, ROL_Cod_Rol, ALUMNO_DNI_Alu, Debe_Cambiar_Clave FROM dbo.Usuario WHERE Cod_Usuario=@id AND Activo=1`)).recordset[0];
    if (!user || user.ROL_Cod_Rol !== payload.role||(payload.student||null)!==(user.ALUMNO_DNI_Alu||null)) { clearSession(res); return res.status(401).json({error:'Sesión inválida o cuenta desactivada.'}); }
    const secured=await securityFor(user);
    if((payload.version||0)!==secured.Version_Sesion||!secured.Alumno_Activo){clearSession(res);return res.status(401).json({error:'Tu sesión terminó. Ingresa nuevamente.'});}
    req.user = secured;req.auth=payload; next();
  } catch(e) { if (e.name === 'TokenExpiredError'|| e.name === 'JsonWebTokenError') return res.status(401).json({error:'Sesión vencida. Ingresa nuevamente.'}); next(e); }
}
function admin(req,res,next) {
  if (req.user.Debe_Cambiar_Clave||req.user.Activacion_Requerida||req.auth?.scope&&req.auth.scope!=='full') return res.status(403).json({error:'Primero debes activar tu cuenta y cambiar tu contraseña.'});
  if (req.user.ROL_Cod_Rol !== 'ADMIN') return res.status(403).json({error:'No tienes permiso para esta operación.'});
  next();
}
function student(req,res,next) {
  if (req.user.Debe_Cambiar_Clave||req.user.Activacion_Requerida||req.auth?.scope&&req.auth.scope!=='full') return res.status(403).json({error:'Primero debes activar tu cuenta y cambiar tu contraseña.'});
  if (req.user.ROL_Cod_Rol !== 'ALUMNO' || !req.user.ALUMNO_DNI_Alu) return res.status(403).json({error:'Disponible solo para estudiantes.'});
  next();
}
module.exports={bcrypt,createSession,clearSession,authenticate,admin,student};
