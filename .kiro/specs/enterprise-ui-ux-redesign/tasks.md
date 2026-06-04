# Implementation Plan

## 1. Migraciones de Base de Datos y Seguridad (RLS)
- [ ] 1.1 Crear migración base para multiempresa extendida
  - Escribir e importar la migración `0012_enterprise_multitenancy.sql` para añadir las columnas solicitadas en `companies`.
  - Crear la tabla `user_companies` y aplicar RLS.
  - Actualizar políticas RLS de `profiles` para delegar la administración a `COMPANY_ADMIN`.
  - Copiar los perfiles actuales a `user_companies` como asociación base de forma automática.
  - Condición de finalización: La migración corre exitosamente en Supabase sin errores de sintaxis o de integridad referencial.
  - _Requirements: 1_

## 2. Biblioteca de Componentes UI (Design System)
- [ ] 2.1 Crear componentes estructurales y de interacción
  - Implementar `AppButton.vue` con estados de carga e interactividad hover.
  - Implementar `AppCard.vue` con bordes redondeados y sombras premium.
  - Implementar `AppBadge.vue` para estados coloreados.
  - Implementar `AppProgressBar.vue` para aforos y metas de ventas.
  - Condición de finalización: Los archivos existen y compilan correctamente en TypeScript sin errores.
  - _Requirements: 11_
  - _Boundary: components/ui_
- [ ] 2.2 Crear componentes de entrada y datos
  - Implementar `AppInput.vue` y `AppSelect.vue` con estilos premium e indicación de error.
  - Implementar `AppTable.vue` con diseño de celdas elegante y estado vacío integrado.
  - Implementar `AppStatCard.vue` con soporte para KPI, porcentajes e iconos decorativos.
  - Condición de finalización: Los componentes están listos para recibir props tipados.
  - _Requirements: 11_
  - _Boundary: components/ui_
- [ ] 2.3 Crear componentes de flujo y control
  - Implementar `AppPageHeader.vue` con título, migas de pan y ranuras para acciones primarias.
  - Implementar `AppEmptyState.vue` con ilustración decorativa y acción directa.
  - Implementar `AppConfirmModal.vue` para validación de acciones críticas.
  - Implementar `AppDropdownMenu.vue` para opciones rápidas por fila.
  - Condición de finalización: Todos los componentes UI están disponibles en la aplicación.
  - _Requirements: 11_
  - _Boundary: components/ui_

## 3. Layouts, Estructura Global y Autenticación
- [ ] 3.1 Implementar pantalla de Login de dos columnas
  - Rediseñar `layouts/auth.vue` y `pages/login.vue` para cumplir la división 50/50 con degradado y estadísticas decorativas a la izquierda, y tarjeta limpia a la derecha.
  - Condición de finalización: La página de login en escritorio muestra ambas columnas y en móvil se apila.
  - _Requirements: 3_
  - _Boundary: layouts/auth_
- [ ] 3.2 Rediseñar default layout y Sidebar responsivo
  - Modificar `layouts/default.vue` y `components/AppNav.vue` incorporando el sidebar oscuro premium, barra superior clara y cajón (drawer) para móvil.
  - Condición de finalización: El sidebar se oculta en móviles y se abre mediante un botón de menú tipo hamburguesa.
  - _Requirements: 2, 12_
  - _Boundary: layouts/default_
- [ ] 3.3 Implementar endpoint y lógica de cambio de empresa activa (Tenant switching)
  - Crear endpoint server `/api/auth/switch-company.post.ts` que valida membresía y actualiza `profiles.company_id` y `profiles.role`.
  - Crear componente selector de empresa activa en el Sidebar de la UI y llamar a `supabase.auth.refreshSession()` al cambiar de empresa.
  - Condición de finalización: Cambiar de empresa actualiza el JWT y actualiza el Dashboard reflejando los nuevos datos.
  - _Requirements: 2_
  - _Depends: 1.1_

## 4. Módulos Administrativos de Empresas y Usuarios
- [ ] 4.1 Crear el módulo de Empresas para SUPER_ADMIN
  - Crear pantallas `/admin/companies` (listado con KPIs) y `/admin/companies/[id]` (creación/edición) y los correspondientes endpoints server bajo `server/api/companies/`.
  - Condición de finalización: Un SUPER_ADMIN puede dar de alta, editar y activar/suspender empresas organizadoras.
  - _Requirements: 1_
- [ ] 4.2 Crear el módulo de Usuarios (SUPER_ADMIN y COMPANY_ADMIN)
  - Crear pantalla `/admin/users` y endpoints en `server/api/users/` para invitar, editar rol y estado de usuarios filtrados por empresa.
  - Condición de finalización: Un COMPANY_ADMIN puede ver e invitar usuarios de su empresa, y SUPER_ADMIN puede hacerlo transversalmente.
  - _Requirements: 1_

## 5. Dashboards y Analítica
- [ ] 5.1 Implementar endpoint de analítica unificado
  - Crear `server/api/dashboard.get.ts` para calcular y retornar ingresos, ocupación, ventas por mes, ranking de eventos y alertas operativas filtrando por empresa si no es SUPER_ADMIN.
  - Condición de finalización: El endpoint devuelve la estructura correcta de métricas para Super Admin y para empresas.
  - _Requirements: 4, 5_
- [ ] 5.2 Implementar vistas de Dashboard
  - Crear Dashboard Global en `/admin/dashboard/index.vue` usando gráficos SVG o divs formateados para visualizaciones (ventas por mes, ranking, alertas).
  - Modificar la página de inicio `pages/index.vue` para mostrar el dashboard corporativo de la empresa.
  - Crear `/admin/events/[id]/dashboard.vue` para la vista ejecutiva del evento y accesos rápidos.
  - Condición de finalización: Los dashboards cargan los datos reales del endpoint unificado.
  - _Requirements: 4, 5_
  - _Depends: 5.1_

## 6. Mejoras al Listado y Detalle de Eventos
- [ ] 6.1 Rediseñar listado de eventos
  - Modificar `pages/events/index.vue` aplicando filtros rápidos de estado, buscador y visualización premium con menús desplegables de acciones.
  - Condición de finalización: El listado renderiza los badges coloreados y permite filtrar interactivamente.
  - _Requirements: 6_
- [ ] 6.2 Rediseñar detalle de evento con navegación por pestañas
  - Modificar `pages/events/[id]/index.vue` integrando pestañas para Resumen, Boletería, Asistentes e Historial de Check-ins.
  - Condición de finalización: Hacer clic en las pestañas alterna el contenido sin recargar la página.
  - _Requirements: 7_
- [ ] 6.3 Mejorar configuración de Boletería y aforos
  - Modificar `pages/events/[id]/tickets.vue` para usar `AppProgressBar.vue`, badges de estado del tier y formateo COP de precios.
  - Condición de finalización: La vista de tiers de boletería muestra el aforo ocupado/total con su barra de progreso correspondiente.
  - _Requirements: 8_
- [ ] 6.4 Implementar módulo de Asistentes del evento
  - Crear la página `/events/[id]/attendees.vue` incorporando la tabla de asistentes con buscador por cédula/nombre/correo, filtros de tipo de ticket e ingreso, y botón de exportar CSV.
  - Condición de finalización: Se puede buscar asistentes, reenviar el PDF o cancelar un ticket emitiendo los cambios en DB.
  - _Requirements: 10_

## 7. Escáner QR de Portería Operativo
- [ ] 7.1 Rediseñar la pantalla de control de acceso en portería
  - Modificar `pages/scan.vue` adaptándolo a un layout móvil "modo operación" (cámara centralizada a pantalla completa) con selector de evento activo.
  - Implementar alertas grandes de feedback (Verde para admitido, Amarillo para usado, Rojo para inválido/evento incorrecto).
  - Incluir el panel inferior con los últimos 10 check-ins en tiempo real.
  - Condición de finalización: El personal puede validar tickets QR recibiendo de inmediato la respuesta gráfica a color en el teléfono.
  - _Requirements: 9_
  - _Boundary: scan.vue_

## 8. Verificación y Pruebas
- [ ] 8.1 Ejecutar suite de pruebas de validación
  - Ejecutar unit tests existentes (`npm run test`) para descartar regresiones.
  - Escribir pruebas unitarias en `app/utils/authz.spec.ts` para verificar la filtración del sidebar administrativo según el rol.
  - Condición de finalización: Todas las pruebas unitarias y de integración pasan correctamente sin fallas.
  - _Requirements: 11_
