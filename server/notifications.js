'use strict';
const nodemailer=require('nodemailer');
function emailAddress(value){return typeof value==='string'&&value.length<=150&&/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(value);}
function peruNumber(value){if(typeof value!=='string'||!/^\d{9}$/.test(value))throw Error('El celular debe contener nueve dígitos.');return '+51'+value;}
function createNotifications(env=process.env){
  const port=Number(env.SMTP_PORT||587);
  const emailConfigured=env.EMAIL_PROVIDER==='smtp'&&!!env.SMTP_HOST&&[465,587].includes(port)&&!!env.SMTP_USER&&!!env.SMTP_PASSWORD&&emailAddress(env.EMAIL_FROM);
  let transport;
  return {
    emailConfigured,smsConfigured:false,
    async sendEmail({to,code,purpose}){
      if(!emailConfigured||!emailAddress(to))throw Error('Correo no configurado.');
      if(!transport)transport=nodemailer.createTransport({host:env.SMTP_HOST,port,secure:port===465,requireTLS:true,
        auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
        disableFileAccess:true,disableUrlAccess:true});
      const subject=purpose==='RECUPERACION'?'Recupera tu acceso a Fractales Academy':'Verifica tu contacto en Fractales Academy';
      await transport.sendMail({from:env.EMAIL_FROM,to,subject,text:`${subject}\n\nTu código es: ${code}\n\nVence en 10 minutos y solo puede utilizarse una vez. No lo compartas. Nunca te pediremos tu contraseña por correo. Si no solicitaste este código, ignora este mensaje.`});
    },
    // Adaptador opcional: sin proveedor configurado no se anuncian ni realizan envíos SMS.
    async sendSMS(){throw Error('Proveedor SMS no configurado.');}
  };
}
module.exports={createNotifications,emailAddress,peruNumber};
