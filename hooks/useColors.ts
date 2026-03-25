import { useColorScheme } from 'react-native';
import { LIGHT_COLORS, DARK_COLORS, ColorScheme } from '@/constants/colors';

export function useColors(): ColorScheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}
