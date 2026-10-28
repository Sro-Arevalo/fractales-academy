# Recuperación de V4.3

La migración `01` es transaccional: un error revierte todas sus escrituras. Puede reejecutarse después de completarse. Una tabla o columna faltante después de registrar la migración produce un error; no se reconstruye silenciosamente.

Antes de producción, comprobar la retención y una restauración de Azure SQL a otra base. Guardar también un BACPAC privado y el diagnóstico si la política del entorno lo permite. Una exportación aislada no sustituye un ensayo de restauración.

Para volver al código anterior: detener escrituras, guardar respaldo, desplegar la versión anterior y conservar APODERADO, Es_Prueba, triggers y auditorías. El esquema adicional es compatible con lecturas anteriores; los clientes antiguos no podrán dar de alta apoderados nuevos sin usar V4.3. La alternativa recomendada es corregir hacia adelante. No retirar FK ni borrar columnas como atajo.

Si ya se ejecutó una eliminación, no hay deshacer desde la aplicación. Restaurar a una base separada en un instante anterior, revisar auditorías, identificar únicamente los registros afectados y preparar una restitución con sus relaciones y cuentas. No restaurar sobre la base activa ni reutilizar contraseñas o códigos temporales. Reemitir acceso con cambio obligatorio y conciliar cualquier operación posterior.

No se proporciona DROP TABLE como reversión: perdería datos de apoderados y permitiría reclasificaciones de pruebas sin rastro.
