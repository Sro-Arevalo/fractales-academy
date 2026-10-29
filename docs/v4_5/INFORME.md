# Informe técnico V4.5

La entrega conserva el proyecto existente y sincroniza su modelo físico, consultas y formularios. No se conectó a Azure ni se publicaron cambios. La validación realizada es local, con datos ficticios y SQL Server 17 mediante ODBC 18.

## Diagnóstico y correcciones

| Hallazgo | Corrección y evidencia |
|---|---|
| La captura de inscripción solo muestra un error 547 genérico; no identifica la instrucción ni restricción de Azure. | No se inventa una causa específica. La API registra número/código SQL, restricción, operación, tabla y UUID de solicitud, sin parámetros, consulta completa, contraseñas ni stack. El formulario presenta una referencia y mensajes distintos según el fallo. La validación local de V4.4 no reproduce el fallo original con el esquema de referencia. El diagnóstico del Azure real sigue pendiente. |
| Formularios y consultas dependían de nombres abreviados y mixtos. | Mapa explícito de 35 tablas/190 columnas originales; actualización conjunta de modelo, backend, selectores, perfiles, pagos, informes y pruebas. 25 tablas de negocio siguen disponibles en el CRUD, y las tablas internas se administran mediante servicios específicos. |
| Un renombrado directo falla con SQL 15336 por CHECK dependientes y SQL 4922 por índices filtrados. | 03 verifica definiciones, retira temporalmente los objetos afectados, renombra y recrea CHECK/índices/triggers dentro de una transacción. Las FK se conservan por identidad de objeto. |
| JSON histórico de auditoría contiene claves antiguas y puede incluir objetos anidados. | Normalización recursiva de claves con orden canónico, sin cambiar valores; huellas antes/después y fixture anidado para impedir diferencias por orden de propiedades. |
| La relación rígida Auditoria_V4 → Usuario bloquea eliminar la cuenta histórica ficticia. | Se conserva ID, nombre y rol históricos del actor y se retira exclusivamente esa FK. La cuenta `V45-LEGACY` del ensayo reprodujo el bloqueo; después se retiró la ficha `99999999` conservando sus tres eventos de seguridad protegidos. No se reclasifica automáticamente como prueba ningún registro histórico. |
| Solo existía desactivación y no un flujo claro de revisión/restauración. | Papelera administrada por rol, motivo, estado previo, identidad responsable y confirmación. Los listados y opciones normales excluyen sus registros; el acceso del estudiante se revoca. Restauración y eliminación usan transacciones y revisión de dependencias. |
| La conservación de auditoría era uniforme e impedía depurar pruebas legítimas. | Política inicial cerrada; solo pruebas explícitas, sin protección y con conservación vencida pueden procesarse. Revisión firmada ligada al administrador y estado de eventos/política; confirmación de cantidad; procedimiento SQL con autorización y constancia independiente inmutable. Se conserva la auditoría real, financiera y de seguridad. |
| Perfiles usaban INNER JOIN de parentesco pese a ser opcional. | LEFT JOIN para que una ficha sin apoderado siga mostrando su perfil. Se probaron inscripción y portal sin apoderado. |
| Riesgo de cobrar otra vez el cargo inicial o mostrar un resumen distinto del servidor. | La primera admisión se determina por historial de matrícula/cargo inicial, se consulta desde el formulario y se valida dentro de la transacción. Regular: 4×250 + 50 primera vez; acelerado: 2×250 + 50; reinscripción: sin repetir 50. |
| Instagram aparecía en la navegación administrativa. | Se crean ambos enlaces únicamente para rol ALUMNO y se limpian al cambiar a login/ADMIN. Login tiene su propia sección inferior. Iconos de marca locales, hover, reducción de movimiento, target blank y noopener/noreferrer. Se validaron cuatro aperturas de nueva pestaña interceptando destinos externos. |

La transacción de inscripción valida DNI/contactos/catálogos, ciclo/turno/modalidad/horario publicado, disponibilidad y cupo antes de registrar ficha, usuario, matrícula y cuotas. Una restricción de prueba en PAGO provocó un 547 durante la inserción de cuotas: se registraron `INSERT`, `PAGO`, nombre de CHECK y referencia, y no quedaron ficha, usuario ni matrícula parciales. La restricción se retiró al acabar ese ensayo local.

## Modelo final

35 tablas existentes renombradas/conservadas + `PAPELERA_REGISTRO`, `POLITICA_AUDITORIA`, `CONSTANCIA_AUDITORIA` = **38 tablas y 225 columnas**. Se conservan los tipos e identificadores originales; las 35 columnas añadidas pertenecen a controles de papelera/auditoría. Las FK pasan de 41 a **40** al retirar la dependencia del actor histórico. No se introdujo `ON DELETE CASCADE`.

`NOMBRE_COMPLETO` conserva el texto histórico de nombres y apellidos sin dividirlo de forma insegura. `CODIGO_CUENTA` abarca activación, recuperación y verificación. `HORARIO_ACADEMICO` es la cabecera; `BLOQUE_HORARIO` almacena las clases/recreos. Los administradores de papelera/constancias son identificadores históricos, sin nuevas dependencias rígidas a la cuenta.

Documentación completa: [diccionario y cardinalidades](DICCIONARIO.md), [diagrama ER](RELACIONES.md), [mapa de nombres y objetos](../../sql/migrations/v4_5/13_MAPA_NOMBRES.md), [scripts](../../sql/migrations/v4_5), [guía Azure y GitHub](MIGRACION_Y_DESPLIEGUE.md).

## Papelera y datos protegidos

Los catálogos físicos retirables son estudiante, cuenta administrativa, curso, docente, asignación curso/docente, aula, carrera, ciclo, horario y simulacro. Los catálogos fijos del sistema se conservan; matrículas, pagos y resultados usan anulación/corrección con historial, evitando borrar movimientos por conveniencia visual. Una cuenta asociada a estudiante se gestiona desde la ficha del estudiante. Se impide enviar/eliminar/desactivar la propia cuenta y desactivar el último administrador activo.

Enviar a papelera conserva relaciones. Eliminar exige revisión y comprobación actual dentro de una transacción; para estudiante también exige token firmado y escribir `ELIMINAR DNI`. Se comprueban FK reales del catálogo SQL, incluyendo dependencias desconocidas, de forma conservadora. Cualquier cobro confirmado, aunque luego se anule su confirmación, bloquea la eliminación destructiva. Las notas de personas reales se conservan. Los códigos/sesiones se revocan al desactivar y se retiran junto a la cuenta solo cuando la eliminación completa resulta legítima. Si está bloqueada, la interfaz detalla relaciones y causas; puede mantenerse la ficha desactivada/en papelera.

La anonimización implementada se limita a eventos **de prueba no protegidos** con retención cumplida. No es un mecanismo para eliminar obligaciones reales ni para anonimizar de forma general todas las fichas académicas. Los eventos históricos permanecen protegidos por defecto. El plazo de 30 días es un valor operativo inicial de pruebas, no una determinación legal; el administrador debe aprobar una política aplicable antes de autorizar depuración.

## Límites y pendientes externos

- El esquema real de Azure no fue inspeccionado; ejecutar 00 y el ensayo sobre una copia de Azure antes de decidir que puede publicarse. Si hay CHECK/triggers distintos, 03 se detiene para revisión.
- La causa exacta del 547 original de Azure continúa sin evidencia suficiente. La captura no permite identificarla. No se afirma que una validación local sustituya esa investigación.
- SQL Server local no sustituye una prueba en Azure SQL Database. La recuperación PITR de Azure y el despliegue/slots tampoco se ejecutaron.
- Recuperación por correo se verificó con bandeja simulada local, códigos caducables, cinco intentos y uso único; SMTP real no se probó y SMS sigue deshabilitado.
- Se verificaron los href y aperturas de Facebook/Instagram; no se certificó disponibilidad/autenticidad de las cuentas externas en vivo. Los iconos reconocibles se distribuyen localmente desde Bootstrap Icons con su licencia MIT.
- Exportación de auditoría limitada a 500 eventos por consulta, con escape de fórmulas CSV; acotar fechas para informes mayores. El procesamiento acepta 1–500 IDs, con selección explícita y revisión nuevamente validada.
- Los scripts, SQL y evidencias V4–V4.4 se conservan como historial. Sus nombres antiguos son necesarios para construir el origen de la migración y no son consultas utilizadas por el backend V4.5. Los comandos activos de package.json apuntan a V4.5; no ejecutar generadores antiguos contra esta entrega.

Esta entrega está verificada localmente. La aprobación de publicación depende de las pruebas del entorno Azure y de resolver cualquier diferencia detectada por su diagnóstico.
