export function areSetsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  return a.size === b.size && [...a].every((value) => b.has(value));
}
