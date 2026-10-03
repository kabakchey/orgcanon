import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Viewport } from "@xyflow/react";

function parseCoordinate(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function useCameraParam(): [Viewport | null, (camera: Viewport) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const zoom = parseCoordinate(searchParams.get("zoom"));
  const x = parseCoordinate(searchParams.get("x"));
  const y = parseCoordinate(searchParams.get("y"));
  const camera = useMemo(
    () => (zoom !== null && zoom > 0 && x !== null && y !== null ? { x, y, zoom } : null),
    [zoom, x, y]
  );

  const setCamera = useCallback(
    (next: Viewport) => {
      // Replace: the camera settles after every pan/zoom, which would otherwise flood Back.
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set("zoom", String(Number(next.zoom.toFixed(3))));
          params.set("x", String(Math.round(next.x)));
          params.set("y", String(Math.round(next.y)));
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return [camera, setCamera];
}
