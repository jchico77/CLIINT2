## Panel de administración de LLMs

Esta vista ( `frontend/app/admin/page.tsx` ) centraliza todos los parámetros operativos que hasta ahora estaban repartidos en `.env` o requerían tocar código. El objetivo del refactor ha sido:

1. **Disposición compacta tipo dashboard**  
   - La página se divide en **dos columnas** principales (`grid gap-6 xl:grid-cols-2`).  
   - Cada columna agrupa tarjetas relacionadas (modelos/reasoning/tiempos en la izquierda, features/operativa/UX en la derecha).  
   - Dentro de cada tarjeta usamos un `denseGrid` (`grid gap-2 sm:grid-cols-2 lg:grid-cols-3`) para mostrar como máximo **tres controles por fila**, forzando que todo quepa “a la vista” sin scroll horizontal.

2. **Tooltips en lugar de textos largos**  
   - Las descripciones que antes ocupaban espacio duplicado ahora se pasan con `title="…"`, de modo que el layout se mantiene minimalista pero seguimos teniendo ayuda contextual al pasar el ratón.

3. **Componentes reutilizables**  
   - Todos los controles usan los mismos tiles (`tileClass`) con tipografía compacta (`text-xs`, `h-8`).  
   - Selects e inputs son los de nuestro stack (shadcn/ui) para conservar el look & feel del resto de la app.

### Conexión con la aplicación

La vista ya está cableada al backend y usa los mismos tipos (`AdminSettings`) en ambos extremos.

1. **Persistencia real**  
   - Endpoint REST `GET/PUT /api/admin/settings` más `POST /api/admin/settings/reset`, protegidos con cabecera `x-admin-token` (opcional en desarrollo).  
   - Servicio `AdminSettingsService` guarda el payload en `backend/storage/admin-settings.json`, valida con zod y mantiene una caché en memoria.  
   - El frontend carga el JSON al montar la página, muestra el estado de conexión y permite “reset” a defaults directamente desde la UI.

2. **Aplicación de los valores**  
   - `applyAdminSettings` actualiza `llmConfig` en caliente (modelos, reasoning, timeouts, logging level, toggles, idiomas, etc.) y ajusta el nivel del logger sin reiniciar el servidor.  
   - Los agentes (`deepResearchClient`, `clientResearchAgent`, `fitAndStrategyAgent`, `vendorResearchAgent`, `proposalOutlineAgent`) consumen los toggles para activar/desactivar `web_search` / `file_search`.

3. **Template reutilizable**  
   - El formulario ahora usa `AdminSettingsShell`, `AdminSettingsGrid` y `AdminSection` para mantener la disposición compacta (dos columnas + dense grid) sin duplicar markup.  
   - Los descriptores (`phases`, `feature toggles`, etc.) viven en `frontend/lib/admin-settings.ts`, compartidos por la UI y los defaults del backend.

### Hoja de ruta inmediata

1. Sustituir el token estático por autenticación real (session/cookie) y auditar cada cambio.  
2. Añadir versionado/rollback del JSON (por ejemplo guardando snapshots en `storage/admin-settings-history/`).  
3. Propagar `timeoutConfig.agent` a todos los agentes (hoy sólo se usa en Deep Research) y añadir métricas de alertas.  
4. Añadir tests automatizados para `AdminSettingsService` y un healthcheck específico del panel.

Con este refactor ya tenemos la base visual y la estructura de datos lista para persistir y aplicar la configuración de forma centralizada.

