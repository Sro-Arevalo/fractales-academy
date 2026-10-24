'use strict';
const sql = require('mssql');
require('dotenv').config();
let active = null;
function configuration() {
  // SQL login or Microsoft Entra ID (DefaultAzureCredential / App Service managed identity).
  const mode=String(process.env.DB_AUTH_MODE||'sql').toLowerCase();
  if(!['sql','entra'].includes(mode)) throw new Error('DB_AUTH_MODE debe ser sql o entra.');
  const required=['DB_SERVER','DB_DATABASE',...(mode==='sql'?['DB_USER','DB_PASSWORD']:[])];
  const missing=required.filter(k=>!process.env[k]);
  if(missing.length){const e=new Error('Falta configurar: '+missing.join(', '));e.status=503;throw e;}
  const config={
    server:process.env.DB_SERVER,
    database:process.env.DB_DATABASE,
    port:Number(process.env.DB_PORT||1433),
    options:{encrypt:true,trustServerCertificate:false,enableArithAbort:true},
    pool:{max:8,min:0,idleTimeoutMillis:30000},
    connectionTimeout:15000,
    requestTimeout:20000
  };
  if(mode==='sql'){
    config.user=process.env.DB_USER;
    config.password=process.env.DB_PASSWORD;
  }else{
    config.authentication={type:'azure-active-directory-default',options:{}};
    if(process.env.AZURE_CLIENT_ID)config.authentication.options.clientId=process.env.AZURE_CLIENT_ID;
  }
  return config;
}

async function pool() {
  if (!active) {
    active = new sql.ConnectionPool(configuration()).connect().catch(e => {
      active = null;
      throw e;
    });
  }
  return active;
}
async function request(tx) { return tx ? new sql.Request(tx) : (await pool()).request(); }
module.exports = { sql, pool, request };
