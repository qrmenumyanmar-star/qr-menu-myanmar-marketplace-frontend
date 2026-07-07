import {
  MD3DarkTheme,
  MD3LightTheme,
  configureFonts,
} from 'react-native-paper';

import { AppColors } from '@/constants/colors';

const fontConfig = configureFonts({ config: { fontFamily: 'System' } });

export const qrShopLightTheme = {
  ...MD3LightTheme,
  fonts: fontConfig,
  colors: {
    ...MD3LightTheme.colors,
    primary: AppColors.light.primary,
    onPrimary: AppColors.light.onPrimary,
    secondary: AppColors.light.success,
    onSecondary: AppColors.light.onPrimary,
    secondaryContainer: '#D1FAE5',
    onSecondaryContainer: AppColors.light.success,
    tertiary: AppColors.light.success,
    background: AppColors.light.background,
    onBackground: AppColors.light.text,
    surface: AppColors.light.card,
    onSurface: AppColors.light.text,
    surfaceVariant: AppColors.light.background,
    onSurfaceVariant: AppColors.light.textMuted,
    outline: AppColors.light.border,
    elevation: {
      level0: AppColors.light.background,
      level1: AppColors.light.card,
      level2: AppColors.light.card,
      level3: AppColors.light.card,
      level4: AppColors.light.card,
      level5: AppColors.light.card,
    },
  },
};

export const qrShopDarkTheme = {
  ...MD3DarkTheme,
  fonts: fontConfig,
  colors: {
    ...MD3DarkTheme.colors,
    primary: AppColors.dark.primary,
    onPrimary: AppColors.dark.onPrimary,
    secondary: AppColors.dark.success,
    onSecondary: AppColors.dark.onPrimary,
    secondaryContainer: 'rgba(16, 185, 129, 0.18)',
    onSecondaryContainer: '#34D399',
    tertiary: AppColors.dark.success,
    background: AppColors.dark.background,
    onBackground: AppColors.dark.text,
    surface: AppColors.dark.card,
    onSurface: AppColors.dark.text,
    surfaceVariant: AppColors.dark.background,
    onSurfaceVariant: AppColors.dark.textMuted,
    outline: AppColors.dark.border,
    elevation: {
      level0: AppColors.dark.background,
      level1: AppColors.dark.card,
      level2: AppColors.dark.card,
      level3: AppColors.dark.card,
      level4: AppColors.dark.card,
      level5: AppColors.dark.card,
    },
  },
};
