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
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],imgSrc:["'self'",'data:'],fontSrc:["'self'"],connectSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"]}}}));
app.use(express.json({limit:'100kb'}));
app.use(cookieParser());
app.use('/api',(req,res,next)=>{
  if(['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const origin=req.get('origin');
    if(origin && new URL(origin).host!==req.get('host')) return res.status(403).json({error:'Solicitud rechazada por seguridad de origen.'});
    if(!req.is('application/json')) return res.status(415).json({error:'Se requiere Content-Type: application/json.'});
  }
  res.setHeader('Cache-Control','no-store');next();
});
app.use('/api',api);
app.use(express.static(path.join(__dirname,'..','public'),{index:'index.html',maxAge:'1h'}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'..','public','index.html')));
app.use((err,req,res,next)=>{
  console.error('[Fractales API]',err);
  if(res.headersSent)return next(err);
  const code=err.number||err.originalError?.info?.number;
  let status=err.status||500,message=err.message;
  if(code===2627||code===2601){status=400;message='Ya existe un registro con esa clave o valor único.';}
  if(code===547){status=400;message='Los datos no cumplen una relación o restricción de SQL Server.';}
  if(status>=500) message='Error del servidor o la conexión a SQL. Revisa la configuración y los registros de Azure.';
  res.status(status).json({error:message});
});
const port=Number(process.env.PORT||3000);
if(require.main===module)app.listen(port,()=>console.log(`Fractales Academy → http://localhost:${port}`));
module.exports=app;
