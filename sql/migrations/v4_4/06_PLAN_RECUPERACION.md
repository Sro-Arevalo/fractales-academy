# Recuperación V4.4

Antes de empezar, verificar el punto de restauración disponible de Azure SQL y ensayar la restauración en **otra base**, siguiendo [el procedimiento oficial de restauración de Azure SQL](https://learn.microsoft.com/en-us/azure/azure-sql/database/recovery-using-backups?view=azuresql). Conservar código V4.3, configuración de App Service y sus permisos. Una exportación BACPAC puede ser un respaldo adicional, pero no sustituye un punto de restauración comprobado ni debe subirse a GitHub. Mantener la aplicación detenida desde 01 hasta completar 05 y la publicación de V4.4.

| Momento | Qué revierte la transacción | Qué hacer después de COMMIT |
|---|---|---|
| Falla dentro de 01 | Columnas, nulabilidad, restricciones, huellas y registro del paso | Corregir el diagnóstico y repetir 01; no editar marcadores manualmente |
| Falla dentro de 02 | Traslado de contactos, snapshots, estado de cabeceras, índice y registro del paso | Resolver conflictos sin sobrescribir datos; repetir 02 |
| Falla en 03 | Es solo lectura | Mantener detenida la aplicación; investigar diferencias respecto de las huellas de 01 |
| Falla dentro de 04 | FK/triggers retirados, DROP TABLE, triggers nuevos y marcador: todo el paso se revierte | APODERADO debe seguir presente; revisar el motivo y volver a verificar 03 |
| Falla en 05 tras COMMIT de 04 | 05 no revierte pasos anteriores | Mantener mantenimiento. Reparar el problema confirmado o restaurar la copia/PITR previa en otra base |
| V4.4 ya recibió nuevas operaciones | Cada operación HTTP es atómica; no revierte operaciones ya confirmadas | Elegir punto de restauración y conciliar por separado las operaciones posteriores antes de cambiar de base |

Cada script de escritura tiene TRY/CATCH, XACT_ABORT y transacción propia. Una excepción aborta ese paso; no deshace los pasos anteriores que ya finalizaron. Las secuencias pueden dejar saltos de numeración al revertir; eso no indica pérdida de filas.

Si únicamente se aplicaron 01/02 y todavía no 04, APODERADO y sus triggers siguen presentes. Los cambios son aditivos salvo nulabilidad ampliada. Puede dejarse el sistema detenido y resolver el problema. Volver a V4.3 sin restaurar requiere que un DBA revise expresamente la nulabilidad y el índice nuevo y confirme que no hubo escrituras V4.4; no se entrega un script automático que destruya las columnas nuevas o sus datos.

Después de confirmar 04, **no basta con desplegar el código V4.3**: esperaba la entidad y endpoints de apoderados. El respaldo JSON de auditoría conserva los contactos, incluso sin alumnos, y permite inspección/exportación administrativa. No es una restauración completa del esquema, permisos, triggers ni de operaciones posteriores. La recuperación preferida es restaurar el respaldo/PITR V4.3 en otra base y dirigir el código V4.3 a esa base después de verificar integridad. No borrar la base V4.4 mientras se investiga.

Procedimiento de recuperación:

1. Mantener App Service detenido y preservar logs sin secretos, número del error y pasos confirmados de Control_Migracion_V4.
2. Restaurar el punto anterior a 01 en una base nueva, mediante Azure Portal o el procedimiento aprobado de la organización. No se proporcionan comandos automáticos contra producción.
3. Ejecutar los diagnósticos V4.3 y comprobar estudiantes, matrículas, cobros, notas, cuentas, permisos y restricciones confiables.
4. Identificar operaciones confirmadas después del respaldo usando la auditoría. Conciliarlas con revisión humana; no copiar pagos o cuentas a ciegas.
5. Publicar el código V4.3 conservado y ajustar DB_DATABASE solo después de verificar la base restaurada. Conservar JWT_SECRET si corresponde al procedimiento de recuperación o rotarlo para revocar sesiones, aceptando que todos deberán volver a iniciar sesión.
6. Verificar inicio de sesión, recuperación por correo, matrícula, cuotas, cobros, publicación y portal antes de reabrir.

Ni el arranque de Express ni los generadores SQL ejecutan migraciones. El runner de pruebas solo crea bases NUEVAS en localhost con datos ficticios; no se usa como herramienta de recuperación.
