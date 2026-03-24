'use client';

import { inject } from '@vercel/analytics';
import { SpeedInsights } from '@vercel/speed-insights';

export function Analytics() {
  inject();
  return <SpeedInsights />;
}
