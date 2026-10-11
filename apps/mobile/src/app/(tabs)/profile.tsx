import { InfoCard } from '@/components/info-card';
import { ScreenShell } from '@/components/screen-shell';

export default function ProfileScreen() {
  return (
    <ScreenShell title="Your settings" subtitle="Privacy, permissions and preferences should stay under your control.">
      <InfoCard
        eyebrow="ACCOUNT"
        title="Sign-in is not connected yet"
        description="Cognito authentication and preferences will be implemented before starting protected shifts or saving personal exposure history."
      />
      <InfoCard
        eyebrow="PRIVACY"
        title="Location is not being tracked"
        description="This starter does not request location permissions or collect GPS samples. Permission and retention controls will be added with tracking."
      />
    </ScreenShell>
  );
}
