import { getContainerRuntimeClient, ImageName } from 'testcontainers';

export default async function (globalConfig, projectConfig) {
  const client = await getContainerRuntimeClient();
  for (const i of ['redis', 'postgres:14', 'testcontainers/ryuk:0.11.0']) {
    await client.image.pull(ImageName.fromString(i));
  }
}
