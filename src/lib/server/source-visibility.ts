import { AsyncLocalStorage } from 'node:async_hooks';
import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { projectVisibleSources, type SourceVisibility } from '@/lib/source-visibility';

const scope = new AsyncLocalStorage<SourceVisibility>();
// Never cache this read in Next's persistent cache. A failed DB read fails closed.
export async function getSourceVisibility() {
  noStore();
  const value = await prisma.sourceVisibility.findUniqueOrThrow({ where: { id: 'global' } });
  return { ima: value.ima, duns100: value.duns100, revision: value.revision };
}
export function withSourceVisibility<T>(flags: SourceVisibility, fn: () => Promise<T>) { return scope.run(flags, fn); }

// Public query boundary: filter the stored representations BEFORE aggregation.
// Admin/import code continues using the original Prisma client.
export const publicPrisma = prisma.$extends({ query: { $allModels: { async $allOperations({ model, operation, args, query }) {
  if (!['findMany','findFirst','findUnique','findUniqueOrThrow','findFirstOrThrow'].includes(operation)) return query(args);
  const flags = scope.getStore() ?? await getSourceVisibility();
  return projectVisibleSources(await query(args), flags, model);
}}}});
