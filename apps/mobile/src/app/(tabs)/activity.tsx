import { InfoCard } from '@/components/info-card';
import { ScreenShell } from '@/components/screen-shell';

export default function ActivityScreen() {
  return (
    <ScreenShell title="Your exposure history" subtitle="Understand your outdoor work, one shift at a time.">
      <InfoCard
        eyebrow="TODAY"
        title="No shift data yet"
        description="Outdoor time, heat-risk bands, completed trips and safety events will appear after authenticated shift tracking is implemented."
      />
    </ScreenShell>
  );
}
