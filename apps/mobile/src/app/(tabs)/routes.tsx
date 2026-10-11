import { InfoCard } from '@/components/info-card';
import { ScreenShell } from '@/components/screen-shell';

export default function RoutesScreen() {
  return (
    <ScreenShell title="Find a lower-exposure route" subtitle="Compare travel time and estimated heat exposure.">
      <InfoCard
        eyebrow="ROUTING"
        title="Route planning coming next"
        description="Destination search, Amazon Location route geometry, weather estimates and transparent recommendations will live here."
      />
    </ScreenShell>
  );
}
