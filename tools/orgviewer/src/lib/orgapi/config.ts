import { readStored, writeStored } from "../storage";

const STORAGE_KEY = "orgapi-base-url";

function defaultBaseUrl(): string {
  return window.location.origin;
}

export function getOrgapiBaseUrl(): string {
  return readStored(STORAGE_KEY) ?? defaultBaseUrl();
}

export function setOrgapiBaseUrl(url: string): void {
  writeStored(STORAGE_KEY, url);
}
