import 'package:flutter/material.dart';

import 'colors.dart';
import 'text_styles.dart';

abstract final class LucineThemes {
  static const double borderRadius = 12;

  static final ThemeData light = ThemeData(
    useMaterial3: true,
    colorScheme: const ColorScheme.light(
      primary: LucineColors.gold,
      onPrimary: LucineColors.navy,
      primaryContainer: LucineColors.goldLight,
      onPrimaryContainer: LucineColors.navy,
      secondary: LucineColors.navy,
      onSecondary: LucineColors.surface,
      secondaryContainer: LucineColors.navyLight,
      onSecondaryContainer: LucineColors.surface,
      tertiary: LucineColors.rose,
      onTertiary: LucineColors.navy,
      tertiaryContainer: LucineColors.roseLight,
      onTertiaryContainer: LucineColors.navy,
      surface: LucineColors.surface,
      onSurface: LucineColors.textPrimary,
      error: Color(0xFFBA1A1A),
      onError: LucineColors.surface,
      outline: LucineColors.borderMedium,
      outlineVariant: LucineColors.border,
    ),
    scaffoldBackgroundColor: LucineColors.background,
    fontFamily: LucineTextStyles.bodyFontFamily,
    fontFamilyFallback: LucineTextStyles.fallbackFontFamilies,
    textTheme: const TextTheme(
      headlineLarge: LucineTextStyles.h1,
      headlineMedium: LucineTextStyles.h2,
      headlineSmall: LucineTextStyles.h3,
      titleMedium: LucineTextStyles.subtitle1,
      bodyLarge: LucineTextStyles.body1,
      labelLarge: LucineTextStyles.button,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: LucineColors.background,
      foregroundColor: LucineColors.navy,
      elevation: 0,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: LucineColors.gold,
        foregroundColor: LucineColors.navy,
        textStyle: LucineTextStyles.button,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(borderRadius)),
        ),
      ),
    ),
  );
}
