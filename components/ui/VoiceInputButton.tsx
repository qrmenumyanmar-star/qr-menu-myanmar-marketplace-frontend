import { StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

type VoiceInputButtonProps = {
  listening: boolean;
  supported: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export function VoiceInputButton({
  listening,
  supported,
  onPress,
  disabled = false,
}: VoiceInputButtonProps) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <IconButton
        icon={listening ? 'microphone' : 'microphone-outline'}
        size={20}
        mode="contained-tonal"
        containerColor={
          listening ? theme.colors.errorContainer : theme.colors.secondaryContainer
        }
        iconColor={listening ? theme.colors.error : theme.colors.primary}
        onPress={onPress}
        disabled={disabled || !supported}
        accessibilityLabel={
          listening ? 'Stop Myanmar voice input' : 'Start Myanmar voice input'
        }
      />
      <Text
        variant="labelSmall"
        style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
        {supported ? 'မြန်မာ အသံ' : 'Web only'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  hint: {
    marginRight: 4,
  },
});
