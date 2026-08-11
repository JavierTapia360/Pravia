import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { configuredDatabaseSchema, prisma } from './config/prisma';
import { BUCKET_NAME, getSupabaseClient } from './services/supabase.service';

import prospectosRoutes from './routes/prospectos.routes';
import documentosRoutes from './routes/documentos.routes';
import notariasRoutes from './routes/notarias.routes';
import cotizacionesRoutes from './routes/cotizaciones.routes';
import expedientesRoutes from './routes/expedientes.routes';
import comparecientesRoutes from './routes/compareciente.routes';
import comparecienteAltaSessionRoutes from './routes/comparecienteAltaSession.routes';
import finanzasRoutes from './routes/finanzas.routes';

const app = express();
app.disable('etag');
const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.header('x-correlation-id') || randomUUID();
  const startedAt = Date.now();
  (req as Request & { correlationId: string }).correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  }

  res.on('finish', () => {
    console.log(JSON.stringify({
      type: 'http_request',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - startedAt,
      correlation_id: correlationId,
    }));
  });

  next();
});

// ══════════════════════════════════════
// Health Check — infrastructure verification without depending on business data
// ══════════════════════════════════════
const healthHandler = async (req: Request, res: Response) => {
  const correlationId = (req as Request & { correlationId?: string }).correlationId;
  let storage: 'ok' | 'error' | 'not_configured' = 'not_configured';

  try {
    await prisma.$queryRaw`SELECT 1`;

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { error } = await getSupabaseClient().storage.getBucket(BUCKET_NAME);
        storage = error ? 'error' : 'ok';
      } catch {
        storage = 'error';
      }
    }

    return res.json({
      api: 'ok',
      database: 'ok',
      storage,
      service: 'PRAVIA OS backend',
      environment: process.env.NODE_ENV || 'development',
      database_mode: process.env.PRAVIA_DATABASE_MODE || 'cloud',
      database_schema: configuredDatabaseSchema,
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
    });
  } catch (dbErr: any) {
    return res.status(503).json({
      api: 'ok',
      database: 'error',
      storage,
      service: 'PRAVIA OS backend',
      environment: process.env.NODE_ENV || 'development',
      database_mode: process.env.PRAVIA_DATABASE_MODE || 'cloud',
      database_schema: configuredDatabaseSchema,
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      ...(process.env.NODE_ENV === 'development' ? { detail: dbErr.message } : {}),
    });
  }
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ══════════════════════════════════════
// Secure IA Diagnostic Endpoint (Rule 4)
// ══════════════════════════════════════
app.get('/api/comparecientes/ia/status', (_req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_DOCUMENT_MODEL || process.env.AI_DOCUMENT_MODEL || 'gpt-5.4-nano';
  const provider = 'OPENAI';

  return res.json({
    provider_configured: !!provider,
    model_configured: !!(model && model.trim().length > 0),
    api_key_configured: !!(apiKey && apiKey.trim().length > 0),
    model,
    escalation_model: process.env.OPENAI_ESCALATION_MODEL || 'gpt-5.4-mini',
    reasoning_effort: process.env.OPENAI_REASONING_EFFORT || 'high',
  });
});

if (process.env.NODE_ENV !== 'production') app.get('/api/debug/openai', async (_req: Request, res: Response) => {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  const model = (process.env.OPENAI_DOCUMENT_MODEL || process.env.AI_DOCUMENT_MODEL || 'gpt-5.4-nano').trim();

  if (!apiKey) {
    return res.status(503).json({
      success: false,
      provider: 'OPENAI',
      model,
      error: 'La variable OPENAI_API_KEY no está configurada.'
    });
  }

  try {
    const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000)
    });
    const detail = response.ok ? null : (await response.text()).slice(0, 300);
    return res.status(response.ok ? 200 : response.status).json({
      success: response.ok,
      provider: 'OPENAI',
      model,
      api_key_configured: true,
      detail
    });
  } catch (error: any) {
    return res.status(503).json({ success: false, provider: 'OPENAI', model, error: error.message });
  }
});

// ══════════════════════════════════════
// Auth is intentionally unavailable until the real password/JWT flow is enabled.
// Never issue a token that looks valid but carries no authenticated identity.
// ══════════════════════════════════════
app.post('/api/auth/login', (_req: Request, res: Response) => {
  res.status(503).json({
    code: 'AUTH_NOT_CONFIGURED',
    error: 'La autenticación real todavía no está habilitada.',
  });
});

// Catálogo operativo mínimo. No expone contraseñas ni atributos de autenticación.
app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, apellido: true, email: true, rol: true },
      orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'No fue posible cargar el catálogo de usuarios.', detail: error.message });
  }
});

// ══════════════════════════════════════
// Feature Routes
// ══════════════════════════════════════
app.use('/api/prospectos', prospectosRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/notarias', notariasRoutes);
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/expedientes', expedientesRoutes);
app.use('/api/comparecientes/altas', comparecienteAltaSessionRoutes);
app.use('/api/comparecientes/alta', comparecienteAltaSessionRoutes);
app.use('/api/comparecientes', comparecientesRoutes);
app.use('/api/finanzas', finanzasRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  const correlationId = (req as Request & { correlationId?: string }).correlationId;
  res.status(404).json({
    code: 'ROUTE_NOT_FOUND',
    error: `Ruta no encontrada: ${req.method} ${req.path}`,
    correlation_id: correlationId,
  });
});

app.listen(PORT, () => {
  console.log(`✅ PRAVIA OS Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Supabase Storage: ${process.env.SUPABASE_URL ? '✅ configured' : '❌ NOT configured'}`);
});
