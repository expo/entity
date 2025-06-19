import { createAppAsync } from './app.ts';

async function mainAsync(): Promise<void> {
  const app = await createAppAsync();
  app.listen(3000);
}

void mainAsync();
