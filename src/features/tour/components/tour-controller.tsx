"use client";

/**
 * TourController
 *
 * 📍 src/features/tour/components/tour-controller.tsx
 *
 * Mounted once in the dashboard layout. Renders nothing itself — driver.js
 * manages its own overlay DOM; this just wires up the launch-condition hook.
 */

import type { TourCookiePayload } from "../types";
import { useTour } from "../hooks/use-tour";

interface TourControllerProps {
  initialState: TourCookiePayload;
  /** True while a blocking overlay (e.g. What's New) is open. */
  blocked?: boolean;
}

export function TourController({ initialState, blocked }: TourControllerProps) {
  useTour({ initialState, blocked });
  return null;
}
