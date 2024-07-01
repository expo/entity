import createAppAsync from './app';

async function mainAsync(): Promise<void> {
  const app = await createAppAsync();
  app.listen(3000);
}

mainAsync();
