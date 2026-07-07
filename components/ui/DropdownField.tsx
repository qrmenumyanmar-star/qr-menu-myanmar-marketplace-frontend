import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Modal, Portal, Text, useTheme } from 'react-native-paper';

type DropdownFieldProps = {
  label?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  variant?: 'default' | 'header';
  sortOptions?: boolean;
};

export function DropdownField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  compact = false,
  variant = 'default',
  sortOptions = true,
}: DropdownFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const isHeader = variant === 'header';

  const sortedOptions = useMemo(
    () => (sortOptions ? [...options].sort((a, b) => a.localeCompare(b)) : options),
    [options, sortOptions],
  );

  const pick = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <View style={compact ? styles.compactRoot : undefined}>
      {label && !compact ? (
        <Text
          variant="labelMedium"
          style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          compact && styles.compactField,
          isHeader && styles.headerField,
          {
            borderColor: isHeader ? 'rgba(255,255,255,0.35)' : theme.colors.outline,
            backgroundColor: isHeader ? 'rgba(255,255,255,0.95)' : theme.colors.surface,
          },
        ]}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: value
              ? isHeader
                ? '#0F172A'
                : theme.colors.onSurface
              : isHeader
                ? '#64748B'
                : theme.colors.onSurfaceVariant,
            fontSize: compact ? 13 : 15,
          }}>
          {value || placeholder}
        </Text>
        <Icon
          source="chevron-down"
          size={compact ? 18 : 22}
          color={isHeader ? '#64748B' : theme.colors.onSurfaceVariant}
        />
      </Pressable>

      <Portal>
        <Modal
          visible={open}
          onDismiss={() => setOpen(false)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}>
          <Text variant="titleMedium" style={styles.modalTitle}>
            {label || placeholder}
          </Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            <Pressable
              onPress={() => pick('')}
              style={({ pressed }) => [
                styles.option,
                pressed && { backgroundColor: theme.colors.surfaceVariant },
              ]}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>All</Text>
            </Pressable>
            {sortedOptions.map(option => (
              <Pressable
                key={option}
                onPress={() => pick(option)}
                style={({ pressed }) => [
                  styles.option,
                  value === option && {
                    backgroundColor: theme.colors.primaryContainer,
                  },
                  pressed && { backgroundColor: theme.colors.surfaceVariant },
                ]}>
                <Text
                  style={{
                    color:
                      value === option
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurface,
                    fontWeight: value === option ? '600' : '400',
                  }}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  compactRoot: {
    minWidth: 140,
    maxWidth: 200,
  },
  label: {
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  compactField: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
  },
  headerField: {
    minWidth: 120,
  },
  modal: {
    alignSelf: 'center',
    width: 320,
    maxWidth: '92%',
    maxHeight: '70%',
    borderRadius: 16,
    padding: 12,
  },
  modalTitle: {
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  list: {
    maxHeight: 360,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
