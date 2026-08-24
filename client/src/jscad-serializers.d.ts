declare module '@jscad/stl-serializer' {
  export function serialize(options: { binary?: boolean }, ...geometries: unknown[]): Uint8Array | Uint8Array[]
}

declare module '@jscad/obj-serializer' {
  export function serialize(options: Record<string, unknown>, ...geometries: unknown[]): string | string[]
}
