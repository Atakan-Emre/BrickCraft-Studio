// Public files must follow the deployment prefix, including paths stored in JSON.
export function assetUrl(path, base = import.meta.env?.BASE_URL ?? '/') {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}
