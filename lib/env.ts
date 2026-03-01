export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} environment variable is required`)
  }
  return value
}
