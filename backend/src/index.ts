import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { configuredDatabaseSchema, prisma } from './config/prisma';
import { BUCKET_NAME, getSupabaseClient } from './services/supabase.service';
import { getOpenAIEscalationModelName, getOpenAIModelName } from './services/openaiDocument.service';

import prospectosRoutes from './routes/prospectos.routes';
import documentosRoutes from './routes/documentos.routes';
import notariasRoutes from './routes/notarias.routes';
import cotizacionesRoutes from './routes/cotizaciones.routes';
import expedientesRoutes from './routes/expedientes.routes';
import comparecientesRoutes from './routes/compareciente.routes';
import comparecienteAltaSessionRoutes from './routes/comparecienteAltaSession.routes';
import finanzasRoutes from './routes/finanzas.routes';
import agendaRoutes from './routes/agenda.routes';
import reportesRoutes from './routes/reportes.routes';
import miDiaRoutes from './routes/miDia.routes';
import aiRoutes from './routes/ai.routes';
import complianceRoutes from './routes/compliance.routes';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import { authenticate, authorizeByMethod, requirePasswordReady, requirePermission } from './middleware/auth.middleware';

const app = express();
app.disable('etag');
app.disable('x-powered-by');
const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

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

// Autenticación pública: solo estas operaciones aceptan solicitudes sin JWT.
app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
  const origin = req.header('origin');
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ code: 'ORIGIN_NOT_ALLOWED', error: 'Origen no autorizado.' });
  }
  return next();
}, authRoutes);

// ══════════════════════════════════════
// Secure IA Diagnostic Endpoint (Rule 4)
// ══════════════════════════════════════
app.get('/api/comparecientes/ia/status', authenticate, requirePermission('ia.read'), (_req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = getOpenAIModelName();
  const provider = 'OPENAI';

  return res.json({
    provider_configured: !!provider,
    model_configured: !!(model && model.trim().length > 0),
    api_key_configured: !!(apiKey && apiKey.trim().length > 0),
    model,
    escalation_model: getOpenAIEscalationModelName(),
    reasoning_effort: process.env.OPENAI_REASONING_EFFORT || 'high',
  });
});

if (process.env.NODE_ENV !== 'production') app.get('/api/debug/openai', authenticate, requirePermission('ia.read'), async (_req: Request, res: Response) => {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  const model = getOpenAIModelName();

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
// Feature Routes
// ══════════════════════════════════════
app.use('/api', authenticate);
app.use('/api', requirePasswordReady);
app.use('/api/users', usersRoutes);
app.use('/api/prospectos', authorizeByMethod('prospectos.read', 'prospectos.write'), prospectosRoutes);
app.use('/api/documentos', authorizeByMethod('documentos.read', 'documentos.write'), documentosRoutes);
app.use('/api/notarias', authorizeByMethod('notarias.read', 'notarias.write'), notariasRoutes);
app.use('/api/cotizaciones', authorizeByMethod('cotizaciones.read', 'cotizaciones.write'), cotizacionesRoutes);
app.use('/api/expedientes', authorizeByMethod('expedientes.read', 'expedientes.write'), expedientesRoutes);
app.use('/api/comparecientes/altas', authorizeByMethod('comparecientes.read', 'comparecientes.write'), comparecienteAltaSessionRoutes);
app.use('/api/comparecientes/alta', authorizeByMethod('comparecientes.read', 'comparecientes.write'), comparecienteAltaSessionRoutes);
app.use('/api/comparecientes', authorizeByMethod('comparecientes.read', 'comparecientes.write'), comparecientesRoutes);
app.use('/api/finanzas', requirePermission('finanzas.read'), finanzasRoutes);
app.use('/api/agenda', authorizeByMethod('agenda.read', 'agenda.write'), agendaRoutes);
app.use('/api/reportes', requirePermission('reportes.read'), reportesRoutes);
app.use('/api/mi-dia', requirePermission('mi_dia.read'), miDiaRoutes);
app.use('/api/ia', requirePermission('ia.read'), aiRoutes);
app.use('/api/cumplimiento', authorizeByMethod('cumplimiento.read', 'cumplimiento.write'), complianceRoutes);

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
