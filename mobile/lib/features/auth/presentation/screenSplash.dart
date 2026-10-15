import 'package:flutter/material.dart';

import 'dart:async';

import 'package:mobile/core/theme/colors.dart';

class ScreenSplash extends StatefulWidget {
  const ScreenSplash({super.key});

  @override
  State<ScreenSplash> createState() => _ScreenSplashState();
}

class _ScreenSplashState extends State<ScreenSplash> {
  @override
  void initState() {
    super.initState();
    Timer(const Duration(seconds: 4), () {
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/mainHome');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Stack(
        children: [
          Center(
            child: Text(
              'Lucine Store',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: LucineColors.gold,
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 40,
            child: Center(child: CircularProgressIndicator()),
          ),
        ],
      ),
    );
  }
}
