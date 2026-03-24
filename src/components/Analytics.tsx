'use client';

import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

export function Analytics() {
  inject();
  injectSpeedInsights();
  return null;
}
