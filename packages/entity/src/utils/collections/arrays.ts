/**
 * Process an array in chunks, awaiting each chunk before starting the next.
 * Within each chunk, items are processed concurrently via Promise.all.
 *
 * This is useful for bounding peak memory and concurrency when processing
 * large arrays of async work (e.g., cascade deletions).
 *
 * @param items - array of items to process
 * @param chunkSize - maximum number of items to process concurrently
 * @param processor - async function to apply to each item
 */
export async function processInChunksAsync<T>(
  items: readonly T[],
  chunkSize: number,
  processor: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map(processor));
  }
}
