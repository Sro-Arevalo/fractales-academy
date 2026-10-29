'use strict';
require('dotenv').config();
const readline=require('node:readline');
const {stdin,stdout}=process;
const {sql,request,pool}=require('../server/db');
const bcrypt=require('bcryptjs');
const rl=readline.createInterface({input:stdin,output:stdout,terminal:true});
const ask=q=>new Promise(resolve=>rl.question(q,x=>resolve(x.trim())));
function askSecret(label){return new Promise(resolve=>{
  if(!stdin.isTTY) return resolve('');
  stdout.write(label); let value='';
  stdin.setRawMode(true);stdin.resume();
  const handler=char=>{const str=char.toString();
    if(str==='\r'||str==='\n'){stdin.setRawMode(false);stdin.off('data',handler);stdout.write('\n');resolve(value);}
    else if(str==='\u0003'){process.exit(130);}
    else if(str==='\u007f'){value=value.slice(0,-1);}
    else if(str>=' '&&str<='~'){value+=str;}
  };stdin.on('data',handler);
});}
(async()=>{
  const count=(await (await request()).query("SELECT COUNT(*) AS n FROM dbo.USUARIO WHERE ID_ROL='ADMIN' AND ACTIVO=1")).recordset[0].n;
  if(count>0){console.log('Ya existe un administrador ACTIVO. Para nuevos usuarios, utiliza la interfaz administrativa.');process.exit(0);}
  const username=await ask('Nombre de usuario del primer administrador: ');
  rl.close();
  const password=await askSecret('Contraseña (no se mostrará, mínimo 12 caracteres): ');
  if(!/^[a-zA-Z0-9._-]{3,50}$/.test(username)||password.length<12||password.length>72)throw Error('USUARIO 3-50 caracteres (letras, números ._-); clave entre 12 y 72 caracteres.');
  const h=await bcrypt.hash(password,12);
  const q=await request();q.input('u',sql.VarChar(80),username);q.input('h',sql.VarChar(255),h);
  await q.query("INSERT INTO dbo.USUARIO (ID_USUARIO,NOMBRE_USUARIO,CLAVE_HASH,ID_ROL,ACTIVO,DEBE_CAMBIAR_CLAVE,DNI_ALUMNO) VALUES ('ADMIN001',@u,@h,'ADMIN',1,0,NULL)");
  console.log('Administrador creado. Inicia sesión y conserva la contraseña de forma segura.');
})().catch(e=>{console.error('No se pudo crear el administrador:',e.message);process.exitCode=1;}).finally(async()=>{rl.close();try{(await pool()).close();}catch{}});
