'use strict';
// Solo prepara texto SQL. NO abre conexiones ni ejecuta migraciones.
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../sql/migrations/v4_4');
const file=path.join(dir,'04_ELIMINAR_ESTRUCTURA_ANTIGUA.sql');
const source=fs.readFileSync(path.join(dir,'03_VERIFICAR_MIGRACION.sql'),'utf8');
fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/  -- BEGIN VERIFICACION REPRODUCIDA[\s\S]*?  -- END VERIFICACION REPRODUCIDA/,
 '  -- BEGIN VERIFICACION REPRODUCIDA\n'+source+'\n  -- END VERIFICACION REPRODUCIDA'),'utf8');
