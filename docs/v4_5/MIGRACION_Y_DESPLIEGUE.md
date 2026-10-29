# Migración y despliegue V4.5

Los archivos están preparados; no se ejecutó ninguna migración ni publicación en Azure. Ejecutar primero en una copia de pruebas y revisar los resultados. El esquema de destino es **38 tablas, 225 columnas y 40 FK** en la base estándar; no incluye `sysdiagrams` ni ampliaciones propias.

## Preparación y diagnóstico

- Revisar [informe técnico](INFORME.md), [mapa completo](../../sql/migrations/v4_5/13_MAPA_NOMBRES.md), [diccionario](DICCIONARIO.md) y [recuperación](../../sql/migrations/v4_5/12_PLAN_RECUPERACION.md).
- Confirmar que V4.4 terminó su paso 04 y su verificación 05. No ejecutar otra vez el modelo inicial de 25 tablas sobre una base existente.
- En SSMS conectar explícitamente a la base correcta y ejecutar **solo 00_DIAGNOSTICO_INICIAL.sql**. Revisar tablas, columnas, módulos adicionales, restricciones y catálogos. El error de inscripción original de Azure no puede atribuirse a una restricción concreta usando únicamente la captura; conservar su referencia y diagnóstico técnico si reaparece.
- Confirmar respaldo y recuperación en otra base. Registrar hora UTC. Detener todas las escrituras y la aplicación V4.4 durante los pasos siguientes. Una segunda instancia también cuenta como escritor.

## Aplicación manual

En cada archivo que declara `@BaseEsperada`, cambiar **únicamente la declaración** al nombre real de la base seleccionada; el valor de ejemplo es `FractalesAcademy`. No reemplazar otras validaciones. El nombre configurado en `DB_DATABASE` debe corresponder a esa base.

| Paso | Acción |
|---|---|
| 00 | Diagnóstico de solo lectura sobre V4.4. |
| 01 | Preparar línea base por PK y huella de cada fila original. |
| 02 | Normalizar referencias de entidad y claves JSON históricas conservando valores. |
| 03 | Renombrar las tablas/190 columnas originales, restricciones, índices, secuencia y 19 triggers. |
| 04 | Crear registro de papelera y protección contra envíos duplicados. |
| 05 | Desvincular FK rígida del actor, conservar identidad histórica y crear política, constancias y procedimiento autorizado. |
| 06 | Verificar catálogos y apoderado opcional; completar únicamente conceptos obligatorios ausentes. |
| 07 | Comparar PK, conteos y huellas de todas las filas originales; revisar `DBCC CHECKCONSTRAINTS`. |
| 08 | Revisar y escribir `FINALIZAR V4.5 VERIFICADA` en la declaración de confirmación. Revalida 07 y retira solo objetos temporales. |
| 09 | Verificación final de estructura y restricciones confiables. |
| 14 | Configurar permisos de la identidad SQL de la aplicación, sin `db_owner` ni `db_ddladmin`. |

03 se detiene si encuentra CHECK o módulos adicionales, o definiciones distintas a la referencia. No desactivar ese control para forzar la migración: analizar esa diferencia y adaptar el script en una copia. `sp_rename` no actualiza las definiciones de los triggers; por eso 03 las vuelve a generar. Los CHECK y los índices filtrados que bloquean el cambio de nombre se retiran y recrean **dentro de la transacción**, validando de nuevo los datos.

Los pasos están marcados para reejecución; 07 se utiliza antes de 08. Después de 08 usar 09, pues la línea base temporal ya no existe. 10 y 11 son herramientas **opcionales de ensayo local**, con vista previa y ejecución desactivada por defecto; no se ejecutan en Azure. El estudiante histórico `99999999` se revisa en Papelera, nunca mediante un borrado masivo.

## Ejecución local y aceptación

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd test
npm.cmd run test:sql:v45
```

El ensayo SQL requiere SQL Server local, ODBC Driver 18, autenticación Windows y permisos de crear bases/backup/restauración. Siempre crea bases nuevas ficticias. No lee `.env`, no usa la conexión de Azure y conserva origen, copia y respaldo. Los nombres se muestran al terminar, sin contraseñas ni códigos.

Para revisar con navegador una base local creada por ese ensayo:

```powershell
$env:V45_SQL_TEST_DATABASE='NOMBRE_LOCAL_MOSTRADO_POR_EL_ENSAYO'
npm.cmd run preview:v45
# En otra terminal:
npm.cmd run test:browser:v45
```

Vista administrativa: `http://127.0.0.1:3003/__local/login`. Vista del estudiante ficticio: `/__local/student`. Bandeja simulada: `/__local/mail`. Estas rutas existen exclusivamente en el script local ligado a loopback y no se incluyen en el paquete de producción. Las pruebas requieren Chromium de Playwright instalado. No prueban SMTP real.

## GitHub y paquete

1. Revisar `git diff` y la lista [ARCHIVOS.md](ARCHIVOS.md). No agregar `.env`, códigos, logs de usuarios ni respaldos. Las migraciones históricas se conservan para trazabilidad; solo la carpeta V4.5 es la migración de esta entrega.
2. Ejecutar los controles anteriores, crear una rama y preparar un commit revisable. Ejemplo: `git switch -c estabilizacion-v45`, seleccionar archivos con `git add`, `git diff --cached`, `git commit`. Hacer `git push` únicamente al repositorio y rama elegidos por el propietario.
3. `npm.cmd run package:v45` genera un ZIP con `server/`, `public/`, `package.json` y `package-lock.json` en la raíz. Excluye SQL, scripts locales, pruebas, datos, logs, `.env` y `node_modules`. Comprueba su SHA-256 antes de trasladarlo.

No se creó un commit ni se hizo push o despliegue durante este trabajo.

El workflow existente `.github/workflows/main_api-fractales-academy.yml` dejó de desplegar al hacer push a main. Se ejecuta manualmente desde GitHub Actions y exige `schema_confirmation=V45_VERIFICADA` tras aprobar SQL/pruebas del entorno elegido. Instala dependencias, ejecuta check/test, retira dependencias de desarrollo y empaqueta solo la aplicación con sus dependencias de producción. Conserva los identificadores de los secretos y el destino App Service existentes. Su ejecución real no fue probada aquí. La condición escrita es un control del operador y no sustituye las comprobaciones SQL de la aplicación.

## Azure App Service

Usar un entorno/slot de pruebas conectado a **otra base de pruebas**, con Node compatible con `engines` de package.json y `npm start` como entrada. Configurar las variables DB/JWT existentes fuera del repositorio, `NODE_ENV=production`, `ACCOUNT_SECURITY_V41=required`, `EMAIL_PROVIDER=disabled` hasta probar el proveedor real, y `SMS_PROVIDER=disabled`. Conservar `encrypt=true` y la validación de certificados en el driver SQL.

Para un ZIP de **fuentes sin node_modules**, habilitar la construcción del despliegue e instalación de dependencias en App Service; revisar los logs de construcción antes de arrancar. El comportamiento de instalación y la configuración del runtime están descritos en [Node.js en App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs). Elegir el flujo de despliegue correspondiente al sistema operativo del App Service existente; no copiar dependencias nativas de pruebas de Windows a producción.

Comprobar estas condiciones antes de abrir el servicio:

1. 09 termina sin errores y `DBCC CHECKCONSTRAINTS` no devuelve infracciones.
2. La identidad SQL tiene los permisos de 14 y puede consultar metadatos. No usar una cuenta propietaria como identidad cotidiana de la aplicación.
3. `GET /api/health` devuelve `ok: true`, `version: "4.5.0"`, `schema: "V45"`. Un esquema anterior/incompleto devuelve 503; la aplicación comprueba los atributos esperados del modelo además del marcador final.
4. En el entorno de pruebas, ejecutar una inscripción nueva, otra de estudiante existente, cuotas, cobro, horario, simulacro, papelera/restauración y revisión de auditoría. Comprobar aislamiento por rol y redes únicamente en login/estudiante.
5. Comprobar correo mediante entrega real al contacto de pruebas usando el proveedor configurado, sin imprimir códigos en logs. Hasta completar esta prueba no anunciar correo real operativo.
6. Desplegar producción durante la ventana coordinada, con la base y artefacto de la misma versión. No hacer un cambio de slot que mezcle código V4.4 con base V4.5 ni compartir la base de producción entre pruebas que escriben y el servicio público.

## Archivos privados

`.env` y variantes reales, claves JWT, credenciales SQL/SMTP, perfiles de publicación, tokens GitHub/Azure, secretos de identidad administrada, códigos/contraseñas temporales, logs con datos de personas, exportaciones CSV de auditoría, capturas de producción y copias `.bak`, `.bacpac`, `.mdf`, `.ldf`, `.trn`. Mantener también privados los nombres/conexiones reales del entorno y las evidencias de operación. Los archivos `reports/v45-*.json` de esta entrega contienen exclusivamente resultados y nombres de bases ficticias locales.
