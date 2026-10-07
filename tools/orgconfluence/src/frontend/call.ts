import { invoke } from "@forge/bridge";

/** `invoke` only wraps its result in `{ body, metadata }` when metadata is requested, which this never does. */
export async function call<Result>(resolverKey: string, payload?: Record<string, unknown>): Promise<Result> {
  return (await invoke(resolverKey, payload)) as Result;
}
