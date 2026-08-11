import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const url = new URL(process.env.DATABASE_URL || '');
if (process.env.E2E_ALLOW_MUTATIONS !== 'isolated-database-confirmed') {
  throw new Error('E2E_ALLOW_MUTATIONS=isolated-database-confirmed es obligatorio.');
}
if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname) || !url.pathname.includes('pravia_e2e')) {
  throw new Error('El seed E2E solo admite una base local cuyo nombre contenga pravia_e2e.');
}
const email = String(process.env.E2E_EMAIL || '').trim().toLowerCase();
const password = String(process.env.E2E_PASSWORD || '');
if (!email || password.length < 12) throw new Error('Define E2E_EMAIL y una E2E_PASSWORD de al menos 12 caracteres.');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { password_hash: passwordHash, activo: true, rol: 'DIRECCION', requires_password_change: false },
    create: {
      email,
      password_hash: passwordHash,
      nombre: 'Dirección',
      apellido: 'E2E',
      rol: 'DIRECCION',
      activo: true,
      requires_password_change: false,
      password_changed_at: new Date(),
    },
  });
  const existingNotary = await prisma.notaria.findFirst({ where: { numero_notaria: 'E2E-001', archived_at: null } });
  const notaria = existingNotary || await prisma.notaria.create({
    data: {
      numero_notaria: 'E2E-001',
      nombre: 'Notaría Sintética E2E',
      notario_titular: 'Titular Sintético',
      entidad_federativa: 'Entorno aislado',
      municipio: 'Entorno aislado',
      activa: true,
      predeterminada: true,
    },
  });
  let tipo = await prisma.tipoActo.findFirst({ where: { nombre: 'Acto Sintético E2E' } });
  if (!tipo) tipo = await prisma.tipoActo.create({ data: { nombre: 'Acto Sintético E2E', descripcion: 'Solo para pruebas aisladas', activo: true } });
  const caracter = await prisma.caracterCompareciente.upsert({
    where: { clave: 'PARTE_E2E' },
    update: { activo: true },
    create: { clave: 'PARTE_E2E', nombre: 'Parte sintética E2E', descripcion: 'Solo para pruebas aisladas' },
  });
  await prisma.tipoActoCaracterCompareciente.upsert({
    where: { tipo_acto_id_caracter_id: { tipo_acto_id: tipo.id, caracter_id: caracter.id } },
    update: {},
    create: { tipo_acto_id: tipo.id, caracter_id: caracter.id },
  });
  console.log(JSON.stringify({ ok: true, user_id: user.id, notaria_id: notaria.id, tipo_acto_id: tipo.id, caracter_id: caracter.id }));
}

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
