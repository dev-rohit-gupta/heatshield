import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

type InfoCardProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function InfoCard({ eyebrow, title, description }: InfoCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  eyebrow: { fontSize: 12, fontWeight: '800', color: colors.brand, marginBottom: 10, letterSpacing: 1.2 },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 21, color: colors.muted },
});
