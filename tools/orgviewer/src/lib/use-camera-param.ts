import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Viewport } from "@xyflow/react";
import { useUpdateSearchParams } from "./use-update-search-params";

function parseCoordinate(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function useCameraParam(): [Viewport | null, (camera: Viewport) => void] {
  const [searchParams] = useSearchParams();
  // Replace: the camera settles after every pan/zoom, which would otherwise flood Back.
  const update = useUpdateSearchParams(true);
  const zoom = parseCoordinate(searchParams.get("zoom"));
  const x = parseCoordinate(searchParams.get("x"));
  const y = parseCoordinate(searchParams.get("y"));
  const camera = useMemo(
    () => (zoom !== null && zoom > 0 && x !== null && y !== null ? { x, y, zoom } : null),
    [zoom, x, y]
  );

  const setCamera = useCallback(
    (next: Viewport) =>
      update({
        zoom: String(Number(next.zoom.toFixed(3))),
        x: String(Math.round(next.x)),
        y: String(Math.round(next.y)),
      }),
    [update]
  );

  return [camera, setCamera];
}
