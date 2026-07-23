/**
 * 📍 src/features/tour/lib/step-registry.ts
 */

import { campusSteps } from "../steps/campus";
import { dashboardSteps } from "../steps/dashboard";
import { districtSteps } from "../steps/district";
import { internSteps } from "../steps/intern";
import { zonalSteps } from "../steps/zonal";
import type { TourKey, TourStep } from "../types";

export const TOUR_STEP_REGISTRY: Record<TourKey, TourStep[]> = {
  dashboard: dashboardSteps,
  intern: internSteps,
  campus: campusSteps,
  zonal: zonalSteps,
  district: districtSteps,
};
