export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.(ts|mjs|js|json)$/.test(specifier)) {
    try {
      return await next(specifier + '.ts', context)
    } catch {
      // not a typescript sibling, defer
    }
  }
  return next(specifier, context)
}
