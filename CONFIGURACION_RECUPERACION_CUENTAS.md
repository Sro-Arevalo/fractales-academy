# Acceso y recuperación de cuentas — V4.1

La integración está implementada. Los envíos reales permanecen desactivados hasta configurar un proveedor SMTP. Las pruebas usaron un proveedor en memoria; **no se enviaron correos ni SMS reales** y no se contrataron servicios.

## Primer ingreso

La inscripción conserva el DNI como usuario y ofrece dos opciones:

| Opción | Entrega | Acceso permitido |
|---|---|---|
| Contraseña temporal individual, predeterminada | Administración entrega la clave aleatoria de 24 caracteres por un canal privado. | El primer ingreso abre únicamente el cambio obligatorio de contraseña. |
| DNI inicial + activación, opcional | Un administrador identifica al alumno, confirma la entrega presencial y le entrega el código individual mostrado una sola vez. | DNI + clave inicial + código válido abren un desafío restringido de diez minutos. No permiten consultar perfil, notas o pagos hasta crear una clave personal. |

El código de activación tiene 96 bits aleatorios, vence en 24 horas y admite cinco intentos. Se consume al verificarlo. Su prueba de activación solo puede usarse para cambiar la contraseña dentro del desafío; **no habilita un nuevo ingreso usando solamente el DNI**. El cambio de clave termina la activación, invalida el desafío y emite una sesión completa con una versión nueva.

Si el estudiante pierde el desafío o el código expira, administración debe identificarlo y usar **Usuarios → Acciones → Recuperar acceso**. Esta operación entrega una nueva clave temporal aleatoria; no convierte una cuenta existente al modo DNI. Las cuentas antiguas no se renombraron ni recibieron claves o activaciones nuevas durante la migración.

## Recuperación por correo

1. En el acceso, el estudiante elige **¿Olvidaste tu contraseña?** e introduce su DNI.
2. El backend busca una cuenta ALUMNO activa y un contacto verificado que siga coincidiendo con `ALUMNO.Correo_Alu`.
3. Si es elegible, registra un código criptográfico de seis dígitos. Solo guarda su HMAC SHA-256, ligado a cuenta, propósito y nonce, usando el secreto del servidor existente. No guarda el código en texto plano.
4. El proveedor intenta enviarlo en segundo plano. La respuesta es genérica para DNI existente, inexistente, sin verificación o limitado. No contiene códigos ni direcciones parciales que identifiquen una cuenta.
5. El alumno introduce código, nueva contraseña y confirmación. Hay cinco intentos persistentes por código, diez minutos de vigencia, espera de 60 segundos entre emisiones y hasta tres emisiones por cuenta/hora. También hay límites por IP.
6. Un código válido se consume dentro de la transacción que actualiza el hash bcrypt. Se incrementa la versión de sesión y se invalidan los códigos/desafíos anteriores. El alumno vuelve al acceso; no se inicia sesión automáticamente.

El contador de intentos incorrectos se confirma aunque se rechace la recuperación; no se pierde al revertir una transacción de cambio de clave. Dos consumos simultáneos solo pueden producir una recuperación. Las respuestas públicas tienen una demora mínima breve con variación para reducir diferencias de tiempo evidentes. [Referencia de seguridad: OWASP, recuperación de contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

## Verificar y actualizar contactos

Un correo registrado no se presume verificado. La migración no marca ningún contacto antiguo automáticamente.

En **Mi perfil → Verificar o actualizar contacto**, el alumno confirma su contraseña actual. Si el canal está configurado, recibe un código en el nuevo contacto y solo después de demostrar su control se actualiza el perfil. La verificación anterior queda en el historial como inactiva.

Sin proveedor, la solicitud queda pendiente para administración y se informa expresamente que **no se envió ningún código**. En **Acceso y contactos**, el administrador puede aprobarla únicamente después de comprobar identidad y control del contacto por un medio institucional confiable, dejando motivo y confirmación. Conocer el DNI, conocer la dirección o marcar una casilla sin comprobarla no constituye verificación. Si no puede demostrar el control, debe rechazar la solicitud y recurrir a entrega presencial de una clave temporal.

Una edición administrativa del correo/celular invalida la verificación anterior mediante un trigger SQL. La recuperación vuelve a comprobar la coincidencia del contacto al consumir el código, por lo que un código enviado al correo anterior no permite recuperar una cuenta cuyo contacto ya cambió.

## Configurar SMTP

Se utiliza Nodemailer 10.2.1 y un servidor SMTP del proveedor que el responsable de la academia elija o ya tenga contratado. La librería no contrata cuentas de correo. Sus parámetros se configuran mediante variables, sin modificar DB_SERVER, DB_DATABASE, credenciales SQL ni el secreto JWT existente.

```dotenv
EMAIL_PROVIDER=smtp
ACCOUNT_SECURITY_V41=required
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=usuario@example.com
SMTP_PASSWORD=CLAVE_REAL_SOLO_EN_CONFIGURACION_PRIVADA
EMAIL_FROM=no-responder@example.com
SMS_PROVIDER=disabled
```

Los valores anteriores son ejemplos. En repositorio, `.env.example` mantiene `EMAIL_PROVIDER=disabled`. No pongas credenciales reales en ese archivo, SQL, pruebas, chat o GitHub.

Solo se admiten puertos **587 con STARTTLS obligatorio** o **465 con TLS desde la conexión**. La validación del certificado permanece activa y se requiere TLS 1.2 o posterior. Configura y verifica el remitente/dominio según las instrucciones del proveedor. No se utiliza el puerto 25 ni se aceptan certificados inseguros como alternativa. [Nodemailer: transporte SMTP](https://nodemailer.com/smtp).

### En Azure App Service, cuando se autorice

1. Completa y verifica la migración V4.1 en la base correcta.
2. En el App Service existente, abre **Settings → Environment variables → App settings**.
3. Tras verificar SQL V4.1, configura `ACCOUNT_SECURITY_V41=required`. Añade las variables de correo anteriores con los datos privados del proveedor solo cuando se autorice activar SMTP. Conserva las variables existentes de Azure/SQL/JWT.
4. Guarda los cambios en la ventana de mantenimiento: actualizar App settings puede reiniciar la aplicación.
5. Comprueba en **Acceso y contactos** que el servicio aparezca configurado. Esto indica que las variables están completas; no certifica que el proveedor acepte entregas.
6. Ensaya la entrega en un entorno independiente con un destinatario de pruebas autorizado, revisa la recepción y luego aprueba la activación del servicio real.

No se ejecutaron estos pasos en Azure. [Microsoft: configuración de App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-common?tabs=portal).

## Si no llega un correo

La aplicación no confirma una entrega que no haya observado. La solicitud pública siempre ofrece ayuda administrativa. Si el envío falla, el código correspondiente se invalida; el registro del servidor solo informa que no se completó la entrega, sin dirección, código ni credenciales SMTP. Comprueba remitente autorizado, credenciales, puerto, TLS, conectividad y estado del proveedor en su consola privada.

No introduzcas un modo `console`, un código fijo ni una respuesta que revele OTP para diagnosticar producción. Los códigos visibles en las pruebas pertenecen exclusivamente al proveedor simulado inyectado por los tests. El servidor de vista local fuerza correo y SMS desactivados.

## SMS: preparado, no activado

`server/notifications.js` expone la interfaz `sendSMS` y la conversión de nueve dígitos a `+51`. El backend aplica la misma protección y límites si se inyecta un proveedor compatible; la implementación de producción actual informa `smsConfigured=false` y no envía SMS. Cambiar `SMS_PROVIDER` por sí solo no habilita un servicio.

Para incorporarlo faltan elegir un proveedor que admita Perú, revisar sus condiciones/remitentes, implementar el adaptador con credenciales privadas, verificar entregas y costos con autorización, y disponer de números previamente verificados. La recuperación no muestra SMS como funcional mientras no exista ese adaptador configurado. Solicitar una actualización de celular para revisión presencial es un proceso administrativo distinto de enviar SMS.

## Costos y límites operativos

El proveedor SMTP puede cobrar por plan, volumen, dominio o exceso de cuota. SMS suele implicar cargos por mensaje/operador y condiciones por país; no se seleccionó ni contrató proveedor. App Service, SQL, almacenamiento de auditoría y restauraciones siguen sujetos a la suscripción existente. No se creó infraestructura de Azure.

Los límites por cuenta están en SQL y se comparten entre instancias. El límite por IP utiliza memoria de cada proceso, como el limitador de acceso existente; una instalación con múltiples instancias debe revisar un almacén compartido para ese límite. La cola de entrega es local, acotada y sin códigos persistidos en claro: un reinicio puede interrumpir una entrega y el alumno necesitará solicitar otro código respetando los límites.

Las sesiones completas duran hasta ocho horas; los desafíos iniciales, diez minutos. La revocación requiere el esquema V4.1 y el backend nuevo en todas las instancias. En producción, después de aprobar la transición, `ACCOUNT_SECURITY_V41=required` impide regresar al comportamiento V4 si faltan tablas o permisos. `auto` solo sirve para una base V4 todavía sin extensiones; un esquema parcial o que desaparezca después de haberse detectado completo falla con 503 en vez de reducir la seguridad. No mezcles servidores V4 y V4.1 ni cambies `JWT_SECRET` al migrar: además de sesiones, protege los códigos pendientes.
