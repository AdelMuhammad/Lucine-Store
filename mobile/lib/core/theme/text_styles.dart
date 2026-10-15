import 'package:flutter/material.dart';

import 'colors.dart';

abstract final class LucineTextStyles {
  static const String bodyFontFamily = 'Plus Jakarta Sans';
  static const String headingFontFamily = 'Playfair Display';
  static const List<String> fallbackFontFamilies = ['Alexandria'];

  static const TextStyle h1 = TextStyle(
    fontFamily: headingFontFamily,
    fontFamilyFallback: fallbackFontFamilies,
    fontSize: 32,
    fontWeight: FontWeight.w700,
    color: LucineColors.navy,
  );

  static const TextStyle h2 = TextStyle(
    fontFamily: headingFontFamily,
    fontFamilyFallback: fallbackFontFamilies,
    fontSize: 28,
    fontWeight: FontWeight.w600,
    color: LucineColors.navy,
  );

  static const TextStyle h3 = TextStyle(
    fontFamily: headingFontFamily,
    fontFamilyFallback: fallbackFontFamilies,
    fontSize: 24,
    fontWeight: FontWeight.w600,
    color: LucineColors.navy,
  );

  static const TextStyle subtitle1 = TextStyle(
    fontFamily: bodyFontFamily,
    fontFamilyFallback: fallbackFontFamilies,
    fontSize: 16,
    color: LucineColors.textSecondary,
  );

  static const TextStyle body1 = TextStyle(
    fontFamily: bodyFontFamily,
    fontFamilyFallback: fallbackFontFamilies,
    fontSize: 15.2,
    height: 1.6,
    color: LucineColors.textPrimary,
  );

  static const TextStyle button = TextStyle(
    fontFamily: bodyFontFamily,
    fontFamilyFallback: fallbackFontFamilies,
    fontSize: 14.4,
    fontWeight: FontWeight.w600,
  );
}
