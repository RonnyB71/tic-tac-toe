import { execSync } from 'child_process';

const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5432/tictactoe_test';

export default async function globalSetup() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'inherit',
  });
}
