# Fractales Academy V4.5

Proyecto existente: Express/Node.js, HTML/CSS/JavaScript y Azure SQL. Esta entrega normaliza las 35 tablas originales y sus 190 columnas; agrega papelera, politica y constancias de auditoria. El esquema final estandar tiene **38 tablas, 225 columnas y 40 FK**, sin cascadas de eliminacion.

Incluye inscripcion atomica, apoderado opcional, cuotas Regular/Acelerado, primer cargo unico, recuperacion con OTP, papelera restaurable, auditoria protegida y redes sociales exclusivamente en login/estudiante. Conserva la identidad visual de Fractales Academy.

- [Informe de cambios, diagnostico y limites](docs/v4_5/INFORME.md).
- [Migracion manual, GitHub, Azure App Service y archivos privados](docs/v4_5/MIGRACION_Y_DESPLIEGUE.md).
- [Resultados reales de pruebas](docs/v4_5/PRUEBAS.md).
- [Mapa completo de nombres](sql/migrations/v4_5/13_MAPA_NOMBRES.md).
- [Diccionario de todas las tablas y atributos](docs/v4_5/DICCIONARIO.md).
- [Diagrama ER y cardinalidades](docs/v4_5/RELACIONES.md).
- [Archivos modificados](docs/v4_5/ARCHIVOS.md).
- [Recuperacion ante fallos](sql/migrations/v4_5/12_PLAN_RECUPERACION.md).

## Comandos activos

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd test
npm.cmd run test:sql:v45
npm.cmd run preview:v45
npm.cmd run test:browser:v45
npm.cmd run package:v45
```

El ensayo SQL crea dos bases NUEVAS ficticias en localhost y conserva su respaldo. Requiere SQL Server local/ODBC18 y permisos de crear/restaurar bases. Preview requiere V45_SQL_TEST_DATABASE con el nombre mostrado por ese ensayo; se liga solo a 127.0.0.1:3003. La API productiva usa npm start y las variables DB/JWT externas del entorno; no usa rutas de acceso de desarrollo.

**No publicar V4.5 antes de completar la migracion SQL y sus pruebas en una copia de Azure.** /api/health exige esquema final V45 y devuelve version 4.5.0. El workflow GitHub de despliegue ahora es manual y exige V45_VERIFICADA; un push no publica automaticamente. No se ejecuto ningun cambio en Azure, push ni despliegue.

Las guias, migraciones, generadores y pruebas SQL V4-V4.4 se conservan como historial y fixture del origen. No ejecutarlos contra el backend actual. La vista HTML offline antigua es una referencia historica V4; la vista revisada de V4.5 es el preview conectado a SQL local. El paquete de produccion incluye solo servidor, frontend y manifiestos de dependencias; nunca .env, datos, logs, backups o herramientas de prueba.
