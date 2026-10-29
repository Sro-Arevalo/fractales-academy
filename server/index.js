'use strict';
require('dotenv').config();
const path=require('node:path');
const express=require('express');
const cookieParser=require('cookie-parser');
const helmet=require('helmet');
const api=require('./api');
const app=express();
app.set('trust proxy',1);
app.disable('x-powered-by');
app.use((req,res,next)=>{req.id=require('node:crypto').randomUUID();res.setHeader('X-Request-ID',req.id);next();});
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],imgSrc:["'self'",'data:'],fontSrc:["'self'"],connectSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"]}}}));
app.use(express.json({limit:'256kb'}));
app.use(cookieParser());
app.use('/api',(req,res,next)=>{
  if(process.env.NODE_ENV==='production'&&!req.secure&&req.path!=='/health')return res.status(403).json({error:'Usa una conexión HTTPS para acceder a tu cuenta.'});
  if(['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const origin=req.get('origin');
    if(origin){let parsed;try{parsed=new URL(origin);}catch{return res.status(403).json({error:'Origen de solicitud inválido.'});}
      if(!['http:','https:'].includes(parsed.protocol)||parsed.host!==req.get('host'))return res.status(403).json({error:'Solicitud rechazada por seguridad de origen.'});}
    if(!req.is('application/json')) return res.status(415).json({error:'Se requiere Content-Type: application/json.'});
  }
  res.setHeader('Cache-Control','no-store');next();
});
app.use('/api',api);
app.use(express.static(path.join(__dirname,'..','public'),{index:'index.html',maxAge:'1h',setHeaders(res,file){if(file.endsWith('.html'))res.setHeader('Cache-Control','no-cache');}}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'..','public','index.html')));
app.use((err,req,res,next)=>{
  if(res.headersSent)return next(err);
  const code=err.number||err.originalError?.info?.number;
  let status=err.status||500,message=err.message;
  if(code===2627||code===2601){status=400;message='Ya existe un registro con esa clave o valor único.';}
  if(code===547){status=400;message='Los datos no cumplen una relación o restricción de SQL Server.';}
  if(code>=54010&&code<=54063){status=400;message=err.message;}
  if(code>=54300&&code<=54309){status=400;message=err.message;}
  if(code>=54400&&code<=54499){status=400;message=err.message;}
  if(code>=54520&&code<=54529){status=400;message=err.message;}
  const translated=require('./sql-errors').friendly(err);if(translated){status=400;message=translated;}
  if(code===1205){status=409;message='Conflicto de acceso simultáneo. Intenta nuevamente.';}
  if(code===229){status=503;message='La cuenta SQL de la aplicación no tiene permisos para completar esta operación. Revisa los permisos indicados en la guía de instalación.';}
  if(err.type==='entity.parse.failed'){status=400;message='El formato de la solicitud no es válido. Revisa los datos e intenta nuevamente.';}
  if(err.type==='entity.too.large'){status=413;message='La solicitud supera el tamaño permitido.';}
  if(code>=51001&&code<=51005){status=400;message=err.message;}
  if(status>=500&&!err.public&&code!==229) message='No se pudo completar la operación. Revisa la conexión a SQL o intenta nuevamente en unos momentos.';
  console.error('[Fractales API]',{requestId:req.id,...require('./sql-errors').details(err),status});
  res.status(status).json({error:message,referencia:req.id,...(err.dependencias?{dependencias:err.dependencias}:{})});
});
const port=Number(process.env.PORT||3000);
if(require.main===module)app.listen(port,()=>console.log(`Fractales Academy → http://localhost:${port}`));
module.exports=app;
