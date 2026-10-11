import { InfoCard } from '@/components/info-card';
import { ScreenShell } from '@/components/screen-shell';

export default function HomeScreen() {
  return (
    <ScreenShell title="Stay safer in the heat" subtitle="Heat awareness for riders on the move.">
      <InfoCard
        eyebrow="CURRENT CONDITIONS"
        title="Weather connection is next"
        description="Current temperature, UV and heat risk will appear here after we connect Open-Meteo. No example values are shown as live data."
      />
      <InfoCard
        eyebrow="YOUR SHIFT"
        title="Shift tracking is not active"
        description="The start/end shift flow and location permission prompts will be added with the authenticated backend."
      />
    </ScreenShell>
  );
}
