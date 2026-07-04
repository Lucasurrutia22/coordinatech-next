# UX_REVIEW.md — Recorrido de CoordinaTech como usuario real

**URL evaluada:** https://coordinatech-next.vercel.app/login
**Fecha:** 2026-07-03
**Punto de vista:** persona que usa la app para trabajar (administrador o técnico de campo) — no como desarrollador, sin mirar el código para juzgar "si está bien construido", solo si **se entiende y se puede usar sin fricción**.

**Nota sobre el método:** no cuento con una herramienta de navegador interactivo en esta sesión (no puedo hacer clic, tipear un login real, ni tomar screenshots de la app en vivo con datos reales). Lo que hice para que esto siga siendo un recorrido fiel y no una opinión genérica: (1) confirmé con una petición real a la URL pública qué ve un usuario al llegar a `/login` sin JavaScript ejecutado, y (2) leí directamente el código de cada pantalla — no el resumen técnico, sino el texto exacto que se muestra, los botones exactos, los estados de carga y error tal como el usuario los ve — para reconstruir el recorrido con precisión. Donde el comportamiento depende de datos reales de producción (cuántos tickets hay, qué técnicos existen), lo señalo como supuesto razonable en vez de afirmarlo como hecho verificado.

**Primer hallazgo, antes de loguearse:** al pedir la página pública de login, lo único que devuelve es el texto **"Cargando Coordinatech..."** — ni el logo, ni el formulario, ni el carrusel se alcanzan a ver sin que el JavaScript termine de cargar y ejecutar. Un usuario con conexión lenta, o alguien que comparte el link de login, ve una pantalla en blanco con ese mensaje antes que nada.

---

## 1. Login

**¿Qué intenta hacer el usuario?**
Entrar a la plataforma con su correo y contraseña para llegar a su panel de trabajo.

**¿Puede hacerlo fácilmente?**
El formulario en sí es simple y claro: correo, contraseña (con botón de ojo para mostrarla), casilla "Recordarme", botón "Iniciar sesión". Pero después de ingresar las credenciales correctas, aparece una segunda pantalla de **"Verificación de dos factores"** que dice textualmente: *"Hemos enviado un código de 6 dígitos a [tu correo]"*. **Esto no es cierto** — no se envía ningún correo. El código es un valor fijo que solo conoce quien configuró el sistema. Un usuario real que llega a esta pantalla revisa su bandeja de entrada, no encuentra nada, revisa spam, y se queda completamente bloqueado sin ninguna forma de continuar ni de pedir ayuda. Es el punto de fricción más grave de toda la aplicación: **el login está roto para cualquier persona que no sea quien desarrolló el sistema.**

**¿Qué sobra?**
La casilla "Recordarme" — se puede marcar, pero no cambia nada en el comportamiento del login (no extiende la sesión, no recuerda el correo). Es un control que promete algo y no lo cumple.

**¿Qué falta?**
- Una forma real de recibir el código de 2FA (correo, SMS, o quitar el paso si no está implementado de verdad).
- Un enlace de soporte real: el texto "¿No tiene una cuenta? Contacte a Soporte" apunta a un `#` — no lleva a ningún lado.
- Mensajes de error más orientadores (hoy dice "Credenciales inválidas. Te quedan N intento(s)", lo cual está bien, pero no distingue "correo no existe" de "contraseña incorrecta" ni ofrece un siguiente paso claro).

**¿Qué botón no tiene sentido?**
"Recordarme" (no hace nada) y el botón de mostrar/ocultar contraseña dentro del 2FA está ausente — los 6 casilleros del código son `type="password"`, así que el usuario ni siquiera puede verificar visualmente lo que tipeó.

**¿Qué información confunde?**
El mensaje "Código enviado... hemos enviado un código de 6 dígitos a tu correo" es la mayor fuente de confusión de toda la app: comunica una acción que no ocurrió.

**¿Qué flujo puede simplificarse?**
Si el 2FA no es una funcionalidad terminada, debería quitarse del flujo de login hasta que lo esté. Un login de un solo paso (correo + contraseña) sería inmediatamente más usable que uno de dos pasos donde el segundo paso no puede completarse sin información privilegiada.

**¿Qué componente debería eliminarse?**
El paso de 2FA tal como está hoy — no cumple su función y solo agrega un punto de fallo total.

**¿Qué debería automatizarse?**
El envío real del código (vía email/SMS) si el 2FA se mantiene, y la recuperación de contraseña (ver más abajo: hoy tampoco funciona de verdad).

---

## 1.1 ¿Olvidé mi contraseña?

**¿Qué intenta hacer el usuario?**
Recuperar el acceso cuando olvidó su contraseña.

**¿Puede hacerlo fácilmente?**
Aparentemente sí: ingresa su correo, ve un mensaje de "Email enviado" con una lista de confirmaciones ("✓ Revisa tu bandeja de entrada", "✓ Si no ves el email, revisa spam", "✓ El enlace expira en 1 hora"). **Ninguna de esas tres cosas es verdad** — el formulario no llama a ningún backend real, solo espera 1.5 segundos y muestra el mensaje de éxito sin importar qué correo se haya escrito (incluso uno que no exista). Es el mismo problema que el 2FA: la interfaz promete una acción que nunca ocurre.

**¿Qué sobra?**
El botón "Enviar de nuevo" — reintentar algo que nunca se envió la primera vez no cambia nada.

**¿Qué falta?**
La funcionalidad real de recuperación de contraseña. Hoy, si un usuario real olvida su contraseña, **no tiene ninguna forma de recuperar el acceso a la cuenta**, solo la ilusión de que sí la tiene.

**¿Qué botón no tiene sentido?**
"Enviar de nuevo", por lo mismo.

**¿Qué información confunde?**
Todo el paso de confirmación — comunica éxito y seguridad ("recupera el acceso de forma segura") sobre una acción que es puramente decorativa.

**¿Qué flujo puede simplificarse?**
Mientras no exista recuperación real, sería más honesto mostrar un mensaje tipo "contacta a tu administrador para restablecer tu contraseña" en vez de simular un envío de correo.

**¿Qué componente debería eliminarse?**
Nada debería eliminarse — debería completarse. Es la funcionalidad más crítica ausente de toda la app para un usuario que se queda sin acceso.

**¿Qué debería automatizarse?**
El envío real de un enlace/código de reseteo vinculado a una cuenta válida.

---

## 2. Sidebar (menú lateral)

**¿Qué intenta hacer el usuario?**
Ubicarse dentro de la app y moverse entre las secciones principales.

**¿Puede hacerlo fácilmente?**
Sí — el sidebar es uno de los puntos más sólidos de la app. Está agrupado en tres bloques claros: **Principal** (Dashboard, Tickets, Calendario), **Administración** (solo visible para admins: Analítica KPI, Métricas SLA, Técnicos, Órdenes de Trabajo) y **Cuenta** (Perfil, Cerrar sesión). El ítem activo se resalta y hay una versión de menú deslizable para celular.

**¿Qué sobra?**
Nada sobra dentro del sidebar en sí — su problema no es exceso, es que **no existen varias secciones que se esperaría encontrar ahí** (ver "Empresas", "Usuarios" y "Configuración" más abajo).

**¿Qué falta?**
- Un ítem de **Configuración/Ajustes** (no existe ningún lugar en toda la app para cambiar la propia contraseña, notificaciones, o preferencias).
- Alguna señal de rol más visible en el propio sidebar (el rol solo se ve en el nombre "Administrador"/"Técnico" en la barra superior, no en el sidebar).
- Indicador de notificaciones/alertas pendientes en el propio menú (hoy solo existen notificaciones tipo "toast" que aparecen y desaparecen).

**¿Qué botón no tiene sentido?**
Ninguno técnicamente "sin sentido", pero **"Analítica KPI" y "Métricas SLA" como dos ítems separados** es confuso para un usuario nuevo: ambos suenan a "reportes de desempeño" y no queda claro por el nombre cuál mirar para qué (uno es productividad de técnicos, el otro es cumplimiento de SLA).

**¿Qué información confunde?**
La cantidad de secciones bajo "Administración" (4 ítems) frente a que ninguna se llama "Reportes" — un admin buscando "un reporte" tiene que adivinar si lo que busca está en Analítica KPI, Métricas SLA, u Órdenes de Trabajo.

**¿Qué flujo puede simplificarse?**
Fusionar "Analítica KPI" y "Métricas SLA" en una sola sección de "Reportes" con pestañas internas (Productividad / SLA) sería más intuitivo que dos ítems de nivel superior con nombres parecidos.

**¿Qué componente debería eliminarse?**
Nada del sidebar debería eliminarse — es de las partes mejor resueltas de la app.

**¿Qué debería automatizarse?**
Nada específico del sidebar en sí; su comportamiento (mostrar/ocultar ítems según rol) ya está automatizado correctamente.

---

## 3. Navbar (barra superior)

**¿Qué intenta hacer el usuario?**
Confirmar en qué pantalla está y quién es la persona conectada.

**¿Puede hacerlo fácilmente?**
Sí, es minimalista: título de la página actual, fecha del día, nombre y rol del usuario, y su avatar. Cumple su función sin ruido visual.

**¿Qué sobra?**
Nada — de hecho, es tan mínima que raya en "falta".

**¿Qué falta?**
- Ningún acceso rápido a notificaciones, ayuda, o búsqueda global desde la barra superior.
- El avatar no es un menú desplegable con accesos rápidos (perfil, cerrar sesión) — para cerrar sesión hay que volver al sidebar.
- En celular, el nombre/rol del usuario se oculta (`topbar-user-hide`) y solo queda el avatar — un usuario en un dispositivo compartido no puede confirmar rápidamente con qué cuenta está conectado sin tocar el avatar (que tampoco es interactivo).

**¿Qué botón no tiene sentido?**
No hay botones con comportamiento incorrecto aquí, pero el avatar **parece clicable (tiene sombra y borde) y no hace nada** — es un patrón visual que sugiere interactividad sin tenerla.

**¿Qué información confunde?**
Nada mayor; es la parte más "silenciosa" y menos problemática de la interfaz.

**¿Qué flujo puede simplificarse?**
Convertir el avatar en un menú desplegable (Perfil / Cerrar sesión / Notificaciones) evitaría que cerrar sesión dependa exclusivamente de encontrar el botón en el sidebar.

**¿Qué componente debería eliminarse?**
Nada.

**¿Qué debería automatizarse?**
Nada específico — es la pantalla más simple y correcta de la app.

---

## 4. Empresas

**No existe esta pantalla.** Recorrí el sidebar completo, el menú de administración y todas las rutas de la aplicación: no hay ninguna sección, tabla, ni concepto de "Empresas" o "Clientes" como entidad gestionable en todo CoordinaTech. Lo más cercano es el campo de texto libre "Cliente" que se llena manualmente al crear un ticket o al completar una orden de soporte — no hay una lista de empresas/clientes en ningún lado, ni forma de ver el historial de tickets de una empresa en particular.

**Si esta pantalla es parte de la visión del producto:** hoy un administrador no tiene ninguna forma de responder "¿cuántos tickets ha tenido la Empresa X este trimestre?" sin revisar ticket por ticket manualmente, porque el nombre del cliente es texto libre no normalizado (cada persona puede escribirlo distinto: "Empresa X", "empresa x", "EMPRESA X SPA").

---

## 5. Usuarios

**No existe esta pantalla como tal.** Lo que sí existe es "Técnicos" (ver sección 7), que administra únicamente el rol técnico. No hay ninguna pantalla para:
- Ver o gestionar cuentas de **administradores** (el único admin se define por una variable de entorno oculta, no por una tabla de usuarios visible).
- Cambiar el rol de una persona.
- Desactivar/eliminar un usuario administrador.
- Ver un historial de quién hizo qué (auditoría de acciones por usuario).

**Impacto real:** si la empresa quiere agregar un segundo administrador, o dar de baja a uno, no hay ninguna pantalla en la aplicación para hacerlo — requeriría intervención directa fuera de la app (variables de entorno / base de datos).

---

## 6. Técnicos

**¿Qué intenta hacer el usuario?**
Un administrador quiere ver quiénes son sus técnicos de campo, revisar sus datos de contacto y agregar uno nuevo.

**¿Puede hacerlo fácilmente?**
Ver el listado sí — es una tabla simple con avatar, nombre, correo, teléfono y estado (Activo/Inactivo). Crear uno nuevo también es un formulario corto. El problema aparece después: **no hay forma de editar ni desactivar a un técnico una vez creado.** El pill "Activo/Inactivo" se ve en la tabla pero no hay ningún botón para cambiarlo.

**¿Qué sobra?**
El formulario de "Nuevo técnico" trae la contraseña **pre-rellenada con el texto `tech123`**, visible en texto plano en el campo de contraseña por defecto — nada obliga a cambiarla antes de guardar.

**¿Qué falta?**
- Editar los datos de un técnico existente (nombre, correo, teléfono).
- Desactivar/reactivar un técnico (el dato existe, el control no).
- Forzar que el técnico cambie su contraseña en el primer inicio de sesión.
- Ver, desde esta misma pantalla, cuántos tickets tiene asignados cada técnico hoy (hoy hay que ir a Tickets o al Dashboard para eso).

**¿Qué botón no tiene sentido?**
Ninguno incorrecto, pero la ausencia de un botón "Editar" junto a cada fila de la tabla es notoria — toda tabla similar en la app (Tickets) sí tiene una acción por fila, esta no.

**¿Qué información confunde?**
Que todos los técnicos nuevos reciban la misma contraseña visible por defecto (`tech123`) sin ninguna advertencia sobre seguridad o necesidad de cambiarla.

**¿Qué flujo puede simplificarse?**
El alta de un técnico podría, en un solo paso, generar una contraseña temporal única (no una fija y compartida) y mostrar un botón para "copiar credenciales" en vez de dejar la contraseña visible en el formulario.

**¿Qué componente debería eliminarse?**
Nada debería eliminarse aquí — falta construir, no sobra nada.

**¿Qué debería automatizarse?**
La generación de contraseñas temporales únicas por técnico, y el envío de esas credenciales (por correo o SMS) en vez de que el administrador tenga que comunicarlas manualmente.

---

## 7. Tickets

**¿Qué intenta hacer el usuario?**
Un admin quiere crear, asignar y hacer seguimiento a los tickets. Un técnico quiere ver lo que tiene asignado, aceptar tickets disponibles, y marcar su avance.

**¿Puede hacerlo fácilmente?**
En general sí — el listado principal es claro, con tres bloques bien diferenciados (Activos/Asignados, Disponibles para aceptar, Completados) y contadores arriba. Crear un ticket es un formulario ordenado con una particularidad simpática y bien pensada: al elegir el tipo (ST/INS/RT) se muestra en vivo el ID correlativo que se asignará (ej. "ST-004"), lo que da confianza antes de guardar.

Donde se pierde la facilidad es en el **detalle del ticket y su cierre**:
- El indicador de SLA que se muestra en la tabla de tickets es **distinto en tiempo, colores y umbrales** al que se muestra dentro del detalle del ticket, y distinto también al de las Órdenes de Trabajo y al de Métricas SLA — un mismo ticket puede leerse "en tiempo" en una pantalla y "vencido" en otra. Para un usuario que no sabe que hay varios sistemas de cálculo por debajo, esto simplemente parece que **la app calcula mal**, y erosiona la confianza en el dato más importante de la herramienta.
- El botón "Completar Orden de Soporte" saca al usuario de la app hacia una ventana externa (Zoho) que se abre 1.5 segundos después de guardar — en el celular (el dispositivo que un técnico de campo usaría) es muy probable que esa ventana **ni siquiera se abra**, porque los navegadores móviles bloquean ventanas emergentes que no se abren en el mismo instante del clic. El propio texto en pantalla ya anticipa el problema ("revisa si fue bloqueada por el navegador"), lo cual es una señal de que el equipo sabe que falla a veces.
- El formulario que sí aparece antes de ir a Zoho (nombre de cliente, local, solución) marca los tres campos como "(opcional)" — un técnico apurado puede dejarlos vacíos y el ticket se cierra igual, generándose una orden con datos fijos ("Cliente", "Responsable", calificación 5 estrellas) que no reflejan lo que realmente pasó.

**¿Qué sobra?**
La columna "Prioridad" (Alta/Media/Baja) convive con el "Tipo" de ticket (ST/INS/RT) y ambas parecen influir en la urgencia — para un usuario esto es un campo de más si no tiene claro cuál de las dos manda sobre el SLA (y, viendo el resto de la app, ni la propia herramienta tiene esto resuelto de forma consistente).

**¿Qué falta?**
- Un paso de **evidencia fotográfica real** dentro del flujo de cierre visible (existe una pantalla de "No completado" que sí permite adjuntar una foto, pero el cierre exitoso normal no pide ninguna foto tomada desde la app — todo eso queda en manos del formulario externo de Zoho).
- Confirmación clara de que la orden de trabajo se guardó exitosamente en Zoho, más allá de "cerrar la ventana y confiar".
- Un botón de "editar" ticket para técnicos con permisos limitados (por ejemplo, corregir la dirección si está mal) — hoy "Editar ticket" solo aparece para administradores.

**¿Qué botón no tiene sentido?**
El botón "Archivar" en tickets completados usa un ícono de basurero (🗑) y color rojo de "eliminar", pero en realidad solo oculta el ticket de la vista activa (no lo borra). Un usuario nuevo probablemente dude en usarlo por miedo a perder el registro para siempre.

**¿Qué información confunde?**
El SLA — es, con diferencia, el elemento más confuso de toda la aplicación desde el punto de vista de un usuario común, porque el mismo dato (tiempo restante para cumplir el SLA) se ve distinto según en qué pantalla se mire el mismo ticket.

**¿Qué flujo puede simplificarse?**
El cierre de un ticket hoy tiene demasiados saltos: ticket → botón "Completar Orden de Soporte" → formulario corto opcional → ventana externa de Zoho → confiar en que se envió → volver manualmente. Podría ser: un solo formulario dentro de la misma app (con foto, firma y datos obligatorios) que cierre el ticket al enviarse, sin depender de una ventana externa que puede no abrirse.

**¿Qué componente debería eliminarse?**
El botón/ícono de "Archivar" con apariencia de "eliminar" debería cambiar su ícono y color para no generar temor de pérdida de datos.

**¿Qué debería automatizarse?**
- El cálculo de SLA (unificarlo para que sea el mismo número en todas las pantallas).
- La apertura del formulario de cierre debería ser inmediata al clic (no diferida), o el formulario de cierre debería vivir completamente dentro de la app.
- Marcar campos realmente obligatorios en el cierre (foto, solución) en vez de dejarlos opcionales.

### 7.1 Calendario (vista relacionada de Tickets)

Vale la pena mencionarlo aparte porque está en el sidebar principal: es una vista mensual bien lograda, con un panel lateral de "próximos eventos" y "sin asignar" (solo admin). Es una de las pantallas más pulidas de la app. Lo único que confunde: los tickets "sin asignar" muestran un botón "Asignar →" que lleva a la pantalla de **editar** ticket — un usuario esperaría un flujo de asignación más directo (elegir técnico ahí mismo) en vez de saltar a otra pantalla.

---

## 8. Reportes

**No existe una pantalla llamada "Reportes"**, pero hay tres pantallas que cumplen ese rol sin llamarse así, y eso mismo genera confusión:

1. **"Analítica KPI"** (`/admin/analytics`) — KPIs de productividad por técnico (eficiencia, tiempo activo, pausas), con selector de período (7/14/30/90 días). Buena idea de diseño: al final de la página explica en 4 pasos "cómo leer" el dashboard, algo que ayuda mucho a un usuario no técnico.
2. **"Métricas SLA"** (`/admin/metricas-sla`) — dashboard de cumplimiento de SLA, actualizado cada 30 segundos según el propio texto en pantalla.
3. **"Órdenes de Trabajo"** (`/ordenes-trabajo`) — un historial buscable de órdenes completadas y de todos los tickets, con filtros por tipo y estado. Esta es, en la práctica, la pantalla que más se parece a un "reporte" clásico exportable — salvo que **no hay ningún botón para exportar o descargar nada** (ni PDF, ni Excel, ni CSV) en ninguna de las tres pantallas.

**¿Puede el usuario hacer lo que busca fácilmente?**
Para *mirar* datos, sí. Para **llevarse esos datos** fuera de la pantalla (a una reunión, a un cliente, a un archivo de respaldo), no hay ninguna forma. Si un administrador necesita un PDF con el detalle de una orden de trabajo para enviárselo a un cliente o guardarlo como respaldo legal, hoy no existe ningún botón "Exportar" o "Descargar" visible en ninguna de estas tres pantallas.

**¿Qué sobra?**
Tener "Analítica KPI" y "Métricas SLA" como dos rutas separadas cuando ambas responden a la misma pregunta general ("¿cómo va el servicio?").

**¿Qué falta?**
- Exportar a PDF/Excel/CSV desde cualquiera de las tres pantallas.
- Un dato muy relevante que **debería estar aquí y no está en ningún lado visible**: el historial de pausas y motivos de descanso de cada técnico por ticket. Se pregunta al técnico el motivo de cada pausa (almuerzo, viaje, reunión, etc.), pero no hay ninguna pantalla de reporte donde un supervisor pueda revisar ese detalle.
- El cuadro "Reglas de servicio / Ventanas por prioridad" en Métricas SLA muestra: **Alta: 4 horas, Media: 24 horas, Baja: 48 horas** — esto es información mostrada directamente al administrador como si fuera la política oficial de SLA. Si la política real de la empresa es otra (por tipo de servicio, no por prioridad), este cuadro está comunicando algo que puede ser sencillamente falso, con toda la autoridad de un dashboard oficial.

**¿Qué botón no tiene sentido?**
Ninguno "sin sentido" propiamente, pero la ausencia total de un botón de exportación en pantallas que existen justamente para reportar es la carencia más notoria de esta sección.

**¿Qué información confunde?**
El cuadro fijo de "Reglas de servicio" mencionado arriba — se presenta como un hecho, no como una referencia editable, y no hay forma desde la interfaz de confirmar si esos números son correctos para el negocio actual.

**¿Qué flujo puede simplificarse?**
Unificar "Analítica KPI" + "Métricas SLA" en una sola sección "Reportes" con pestañas (Productividad / SLA / Órdenes de Trabajo) daría a los administradores un solo lugar mental para "ver cómo va todo", en vez de tener que recordar en cuál de tres pantallas está el dato que necesitan.

**¿Qué componente debería eliminarse?**
El cuadro de "Reglas de servicio" fijo debería eliminarse o conectarse a un valor real y editable — mostrar una política incorrecta es peor que no mostrar ninguna.

**¿Qué debería automatizarse?**
La exportación (PDF/Excel) de cualquiera de estos reportes con un clic, y la generación periódica automática (ej. resumen semanal enviado por correo a los administradores).

---

## 9. Configuración

**No existe ninguna pantalla de configuración/ajustes en toda la aplicación.** No hay dónde:
- Cambiar la propia contraseña (ni para admin ni para técnico).
- Ajustar notificaciones (activarlas/desactivarlas, elegir canal).
- Configurar las reglas de SLA por tipo de ticket (quedan fijas en el código).
- Personalizar la empresa (logo, nombre, zona horaria, moneda si aplica).
- Gestionar integraciones (por ejemplo, la de Zoho que se usa para cerrar órdenes).

**Impacto real:** cualquier cambio a las reglas de negocio (SLA, textos, integraciones) requiere pedirle a un desarrollador que edite el código y vuelva a desplegar la aplicación — nada de eso está en manos del propio equipo que la usa día a día.

**¿Qué debería automatizarse?**
Como mínimo: cambio de contraseña propio desde la app (hoy ni siquiera existe recuperación real, ver sección 1.1) y una pantalla donde el administrador pueda ajustar las reglas de SLA sin depender de un cambio de código.

---

## 10. Perfil

**¿Qué intenta hacer el usuario?**
Confirmar quién es en el sistema y revisar sus propios datos.

**¿Puede hacerlo fácilmente?**
Sí, pero solo para *mirar* — la pantalla muestra nombre, correo, "ID de usuario" (curiosamente listado bajo un ícono de teléfono, no de identificación) y rol. **Ningún campo es editable.** No hay botón "Editar perfil", no hay forma de subir una foto propia (el avatar se genera automáticamente a partir del nombre), no hay forma de cambiar la contraseña ni el teléfono.

**¿Qué sobra?**
El ícono de teléfono (`Phone`) junto al campo "ID de usuario" — es una elección de ícono que no corresponde al contenido (el ID de usuario no es un teléfono) y puede hacer pensar por un segundo que ahí debería ir un número de contacto.

**¿Qué falta?**
- Poder editar el propio nombre, correo o teléfono.
- Poder cambiar la propia contraseña (ítem que debería vivir aquí si no hay una pantalla de Configuración separada).
- Historial propio de actividad (tickets atendidos, tiempo trabajado en el período) — el técnico ya genera esta información via el cronómetro de trabajo, pero no puede verla resumida en su propio perfil.

**¿Qué botón no tiene sentido?**
No hay botones en esta pantalla más allá de la navegación — el problema no es un botón incorrecto, es la ausencia total de acciones en una pantalla que en cualquier otra app suele ser la más interactiva.

**¿Qué información confunde?**
El ícono de teléfono junto al ID de usuario, como se mencionó.

**¿Qué flujo puede simplificarse?**
No hay flujo que simplificar porque no hay flujo — es una ficha de solo lectura. La oportunidad es agregar uno (editar datos, cambiar contraseña) más que simplificar uno existente.

**¿Qué componente debería eliminarse?**
Nada — al contrario, faltan componentes (formulario de edición, cambio de contraseña).

**¿Qué debería automatizarse?**
El resumen de actividad propia (tickets del mes, horas trabajadas, cumplimiento de SLA personal) podría alimentarse automáticamente desde datos que la app ya calcula en otras pantallas (Dashboard, Cronómetro), en vez de dejar el Perfil como una ficha estática desconectada del resto de la actividad del usuario.

---

## Resumen: lo que más le duele a un usuario real

1. **El login no se puede completar de forma confiable** — la pantalla de "2FA" promete un código por correo que nunca llega. Este es, en la práctica, el bloqueador más severo: sin saber el código "secreto", ninguna persona ajena al desarrollo puede entrar.
2. **"Olvidé mi contraseña" no recupera nada** — simula éxito sin enviar nada real. Un usuario bloqueado no tiene salida.
3. **El SLA se ve distinto en cada pantalla** — el dato más importante del producto ("¿estoy a tiempo o no?") no es confiable porque cambia según dónde se mire.
4. **El cierre de tickets depende de una ventana externa que puede no abrirse en el celular** — justo el dispositivo que usan los técnicos de campo.
5. **Faltan pantallas completas que se esperarían en un producto de este tipo**: Empresas/Clientes, gestión de Usuarios/administradores, y Configuración — hoy varias reglas de negocio solo se pueden cambiar editando código.
6. **Perfil y Técnicos son de solo lectura donde deberían permitir editar** — no se puede cambiar la propia contraseña, ni editar/desactivar a un técnico ya creado.
7. Lo que **sí funciona bien** y no debería tocarse: el Sidebar, la Barra superior, el Calendario, y el formulario de creación de tickets (especialmente el preview del ID correlativo) — son las partes de la app donde un usuario nuevo se orienta sin ayuda.
