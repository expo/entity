import createAppAsync from './app';

async function main(): Promise<void> {
  const app = await createAppAsync();
  app.listen(3000);
}

main();
