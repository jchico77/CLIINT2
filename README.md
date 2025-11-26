# ClientIntel Dashboard MVP

AI-powered client intelligence dashboard for B2B sales.

## ⚠️ Independencia del Código

**Este proyecto (`CLIINT2/`) es completamente independiente** de cualquier código fuera de su directorio. No importa ni depende de código del directorio padre o de otros proyectos. Todo el código necesario está contenido dentro de `CLIINT2/`.

## Estructura del Proyecto

```
CLIINT2/
  backend/          # Backend Node.js + TypeScript + Express
  frontend/         # Frontend Next.js + TypeScript + Tailwind
  docs/             # Documentación
```

## Requisitos Previos

- Node.js 18+ y npm
- TypeScript
- OpenAI API Key (opcional, para usar LLM - si no se proporciona, se usan datos fake)

## Instalación y Ejecución

### Backend

```bash
cd CLIINT2/backend
npm install

# Configurar API key de OpenAI (opcional)
# Windows PowerShell:
$env:OPENAI_API_KEY="tu-api-key-aqui"

# Linux/Mac:
export OPENAI_API_KEY="tu-api-key-aqui"

npm run dev
```

El backend se ejecutará en `http://localhost:3001`

**Nota**: Si no configuras `OPENAI_API_KEY`, el sistema usará datos fake automáticamente.

### Frontend

```bash
cd CLIINT2/frontend
npm install
npm run dev
```

El frontend se ejecutará en `http://localhost:3000`

## Endpoints del Backend

- `GET /api/health` - Health check
- `POST /api/vendors` - Crear vendor
- `GET /api/vendors/:vendorId` - Obtener vendor
- `POST /api/vendors/:vendorId/clients` - Crear cliente
- `GET /api/vendors/:vendorId/clients` - Listar clientes
- `GET /api/clients/:clientId` - Obtener cliente
- `POST /api/vendors/:vendorId/services` - Crear servicio
- `GET /api/vendors/:vendorId/services` - Listar servicios
- `GET /api/services/:serviceId` - Obtener servicio
- `POST /api/vendors/:vendorId/dashboard` - Generar dashboard
- `GET /api/dashboard/:dashboardId` - Obtener dashboard

## Flujo de Uso

1. Acceder a `http://localhost:3000`
2. Hacer clic en "Crear nuevo análisis de cliente"
3. Completar el formulario:
   - Crear o seleccionar Vendor
   - Crear o seleccionar Cliente
   - Crear o seleccionar Servicio
   - Añadir contexto de la oportunidad
4. Hacer clic en "Generar Strategy Dashboard"
5. Ver el dashboard generado con todas las secciones

## Estado Actual

### Fase 1 ✅ - Completada
- Estructura del proyecto
- Tipos de dominio completos
- Endpoint de health
- Frontend básico conectado

### Fase 2 ✅ - Completada
- Endpoints CRUD para vendors, clients, services
- Endpoint de generación de dashboard con datos fake
- Formulario completo de creación de análisis
- Página de dashboard con todas las cards

### Fase 3 ✅ - Completada
- Integración LLM con OpenAI (GPT-4o)
- ClientResearchAgent: Genera Account Snapshot, Market Context, Strategic Priorities
- VendorResearchAgent: Genera evidencias y diferenciadores
- Fallback automático a datos fake si LLM no está disponible

### Fase 4 ✅ - Completada
- FitAndStrategyAgent: Genera Stakeholder Map, Competitive Landscape, Vendor Fit & Plays, Gaps & Questions
- **100% LLM**: Todas las 8 secciones se generan con LLM cuando hay API key
- Flujo optimizado: Client+Vendor research en paralelo, luego Fit & Strategy
- Datos reales, específicos y estratégicos

### Fase 5 ✅ - Completada
- Hardening y refinamientos: Validación Zod, sistema de errores, cache LLM
- Manejo de errores mejorado en backend y frontend
- Cache de resultados LLM (24h TTL)

## Notas Técnicas

- El backend usa almacenamiento en memoria (se perderá al reiniciar)
- **Con LLM**: Los datos son generados por IA basándose en información real del cliente/vendor
- **Sin LLM**: Se usan datos fake pero respetan la estructura completa
- El frontend usa Next.js 14 con App Router
- Todos los estilos usan TailwindCSS (sin CSS inline)
- Tiempo de generación: ~30-60 segundos con LLM, instantáneo con datos fake

## Documentación Completa

Para información detallada sobre arquitectura, flujos y componentes críticos, consulta:

- **`docs/ARCHITECTURE.md`**: Arquitectura completa, flujos de funcionamiento, componentes críticos
- **`docs/AUDITORIA_DATOS.md`**: Qué es fake vs real, detalle por sección
- **`docs/implementation-notes.md`**: Notas de implementación por fase
- **`docs/client-intel-mvp-spec.md`**: Especificación funcional original

