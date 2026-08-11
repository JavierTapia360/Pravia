import 'dotenv/config';
import { configuredDatabaseSchema, prisma } from '../src/config/prisma';

async function verifyRuntimeDatabase() {
  try {
    const rows = await prisma.$queryRaw<Array<{ current_schema: string }>>`
      SELECT current_schema() AS current_schema
    `;
    const currentSchema = rows[0]?.current_schema;

    if (currentSchema !== configuredDatabaseSchema) {
      throw new Error(
        `Prisma conectó al esquema ${currentSchema || 'desconocido'}; se esperaba ${configuredDatabaseSchema}.`
      );
    }

    const userCount = await prisma.user.count();
    console.log(JSON.stringify({
      database: 'ok',
      schema: currentSchema,
      users_table_accessible: true,
      users_count: userCount,
    }));
  } finally {
    await prisma.$disconnect();
  }
}

verifyRuntimeDatabase().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
