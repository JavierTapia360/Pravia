import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './config/prisma';

import prospectosRoutes from './routes/prospectos.routes';
import documentosRoutes from './routes/documentos.routes';
import notariasRoutes from './routes/notarias.routes';
import cotizacionesRoutes from './routes/cotizaciones.routes';
import expedientesRoutes from './routes/expedientes.routes';
import comparecientesRoutes from './routes/compareciente.routes';
import comparecienteAltaSessionRoutes from './routes/comparecienteAltaSession.routes';
import finanzasRoutes from './routes/finanzas.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ══════════════════════════════════════
// Health Check — Real DB verification
// ══════════════════════════════════════
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.user.findFirst();
    return res.json({
      api: 'ok',
      database: 'ok',
      service: 'PRAVIA OS backend',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    });
  } catch (dbErr: any) {
    return res.status(500).json({
      api: 'ok',
      database: 'error',
      database_error: dbErr.message,
      service: 'PRAVIA OS backend',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.user.findFirst();
    return res.json({
      api: 'ok',
      database: 'ok',
      service: 'PRAVIA OS backend',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    });
  } catch (dbErr: any) {
    return res.status(500).json({
      api: 'ok',
      database: 'error',
      database_error: dbErr.message,
      service: 'PRAVIA OS backend',
      timestamp: new Date().toISOString()
    });
  }
});

// ══════════════════════════════════════
// Secure IA Diagnostic Endpoint (Rule 4)
// ══════════════════════════════════════
app.get('/api/comparecientes/ia/status', (_req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_DOCUMENT_MODEL || process.env.AI_DOCUMENT_MODEL || 'gpt-5-mini';
  const provider = 'OPENAI';

  return res.json({
    provider_configured: !!provider,
    model_configured: !!(model && model.trim().length > 0),
    api_key_configured: !!(apiKey && apiKey.trim().length > 0),
    model: model
  });
});

if (process.env.NODE_ENV !== 'production') app.get('/api/debug/openai', async (_req: Request, res: Response) => {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  const model = (process.env.OPENAI_DOCUMENT_MODEL || process.env.AI_DOCUMENT_MODEL || 'gpt-5-mini').trim();

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
// Auth placeholder
// ══════════════════════════════════════
app.post('/api/auth/login', (req: Request, res: Response) => {
  res.json({ token: 'dummy_token', user: { nombre: req.body.username || 'Usuario' } });
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
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`✅ PRAVIA OS Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Supabase Storage: ${process.env.SUPABASE_URL ? '✅ configured' : '❌ NOT configured'}`);
});
