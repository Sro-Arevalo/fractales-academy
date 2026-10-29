# Recuperación V4.5

Esta actualización cambia nombres físicos. La aplicación V4.4 y la V4.5 no deben escribir simultáneamente sobre la misma base. Detener las escrituras antes de 01 y mantenerlas detenidas hasta aprobar 09 y el despliegue correspondiente.

1. Registrar servidor, nombre exacto de base, versión de la aplicación, hora UTC, conteos de tablas/FK y resultados de 00. Guardar esa evidencia en una ubicación privada.
2. Confirmar la retención y disponibilidad de restauración de Azure SQL. Ensayar primero una restauración/copia en una **base nueva** y ejecutar allí 00–09; no sustituir el origen. La restauración a un punto en el tiempo crea otra base. [Procedimiento oficial de Microsoft](https://learn.microsoft.com/en-us/azure/azure-sql/database/recovery-using-backups?tabs=azure-portal&view=azuresql).
3. Conservar el artefacto V4.4 y sus variables de configuración por separado. No guardar secretos en Git. La copia de datos contiene datos personales y también debe permanecer privada.
4. Ejecutar 01–06 individualmente. Cada etapa usa su propia transacción y marcador; ante error se revierte esa etapa. Inspeccionar el error antes de reintentar. No quitar validaciones ni marcar etapas manualmente como completadas.
5. Aprobar 07: compara cada PK y huella de los valores de las 35 tablas originales. La normalización de claves JSON de auditoría conserva valores. 06 solo puede agregar los dos conceptos obligatorios ausentes; se incorporan expresamente a la línea base. No se aceptan escrituras de negocio durante este intervalo.
6. 08 exige escribir `FINALIZAR V4.5 VERIFICADA`, vuelve a ejecutar 07 **en su propia transacción** y retira únicamente la tabla y función temporales de comprobación. No elimina tablas de negocio ni eventos. 09 comprueba el estado final.
7. Si falla antes de 08: mantener la academia en mantenimiento. Corregir el diagnóstico en la copia, reanudar las etapas faltantes o volver a una base nueva restaurada de antes de 01 con la aplicación V4.4. No intentar un renombrado inverso improvisado.
8. Si falla después de 08, antes de reabrir: restaurar el punto anterior en otra base, verificar datos y permisos, conectar el artefacto V4.4 a esa restauración. No conectar V4.4 a nombres V4.5.
9. Si ya hubo actividad en V4.5: conservar esa base y sus registros; preparar conciliación de matrículas, cobros y cambios posteriores antes de cambiar conexiones. Una restauración anterior por sí sola perdería esas operaciones. La decisión requiere revisión administrativa.

En el ensayo local se crearon bases únicas de datos ficticios, se hizo `BACKUP ... COPY_ONLY, CHECKSUM`, `RESTORE VERIFYONLY` y restauración a otra base sin `REPLACE`. No se borró ni reemplazó ninguna base existente. Estos comandos de SQL Server local no son el mecanismo de respaldo de Azure SQL Database.

Puntos de control: diagnóstico original, copia recuperable, 01–06 aplicados, 07 sin diferencias, 08 confirmado, 09 aprobado, `/api/health` V45 y pruebas de aceptación del entorno de pruebas antes de abrir producción.
