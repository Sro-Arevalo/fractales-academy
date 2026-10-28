'use strict';
const ops=require('./operations');
const {rule}=require('./rules');
const {emailAddress}=require('./notifications');
function fields(body){
  if(!body||Array.isArray(body)||Object.keys(body).some(k=>!['DNI_Apoderado','Nomb_Apoderado','Cel_Apoderado','Correo_Apoderado'].includes(k)))throw rule('Datos de apoderado inválidos.');
  const {DNI_Apoderado,Nomb_Apoderado,Cel_Apoderado=null,Correo_Apoderado=null}=body;
  if(typeof DNI_Apoderado!=='string'||!/^\d{8}$/.test(DNI_Apoderado))throw rule('El DNI del apoderado debe contener ocho dígitos.');
  if(typeof Nomb_Apoderado!=='string'||!Nomb_Apoderado.trim()||Nomb_Apoderado.length>120)throw rule('Ingresa los nombres y apellidos del apoderado (hasta 120 caracteres).');
  if(Cel_Apoderado!==null&&(typeof Cel_Apoderado!=='string'||!/^\d{9}$/.test(Cel_Apoderado)))throw rule('El celular del apoderado debe contener nueve dígitos.');
  if(Correo_Apoderado!==null&&!emailAddress(Correo_Apoderado))throw rule('El correo del apoderado no es válido.');
  return {DNI_Apoderado,Nomb_Apoderado:Nomb_Apoderado.trim(),Cel_Apoderado,Correo_Apoderado};
}
async function attach(tx,alumno,guardian){
  const dni=guardian?.DNI_Apoderado||alumno.DNI_Apoderado;
  if(typeof dni!=='string'||!/^\d{8}$/.test(dni))throw rule('Selecciona un apoderado existente o registra su DNI y datos.');
  let row=(await ops.query(tx,'SELECT * FROM dbo.APODERADO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_Apoderado=@dni',{dni})).recordset[0];
  if(guardian){
    const data=fields(guardian);
    if(row)throw rule('Ese apoderado ya existe. Selecciónalo para conservar sus datos compartidos.');
    await ops.query(tx,`INSERT dbo.APODERADO(DNI_Apoderado,Nomb_Apoderado,Cel_Apoderado,Correo_Apoderado)
      VALUES(@DNI_Apoderado,@Nomb_Apoderado,@Cel_Apoderado,@Correo_Apoderado)`,data);row=data;
  }
  if(!row)throw rule('El apoderado seleccionado no existe. Actualiza la consulta.');
  Object.assign(alumno,row);
}
async function save(body,actor){
  const data=fields(body);return ops.transaction(async tx=>{
    const before=(await ops.query(tx,'SELECT * FROM dbo.APODERADO WITH (UPDLOCK,HOLDLOCK) WHERE DNI_Apoderado=@dni',{dni:data.DNI_Apoderado})).recordset[0];
    await ops.query(tx,before?`UPDATE dbo.APODERADO SET Nomb_Apoderado=@Nomb_Apoderado,Cel_Apoderado=@Cel_Apoderado,Correo_Apoderado=@Correo_Apoderado WHERE DNI_Apoderado=@DNI_Apoderado`:
      `INSERT dbo.APODERADO(DNI_Apoderado,Nomb_Apoderado,Cel_Apoderado,Correo_Apoderado) VALUES(@DNI_Apoderado,@Nomb_Apoderado,@Cel_Apoderado,@Correo_Apoderado)`,data);
    await ops.audit(tx,actor,'APODERADO',data.DNI_Apoderado,before?'EDITAR':'CREAR',before,data);return {ok:true};
  });
}
module.exports={fields,attach,save};
