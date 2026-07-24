const STORAGE_KEY = "orgapi-base-url";

function defaultBaseUrl(): string {
  return `${window.location.origin}/api`;
}

export function getOrgapiBaseUrl(): string {
  return localStorage.getItem(STORAGE_KEY) ?? defaultBaseUrl();
}

export function setOrgapiBaseUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url);
}
