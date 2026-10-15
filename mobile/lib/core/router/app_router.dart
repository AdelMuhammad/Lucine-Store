import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/router/app_navigation.dart';
import 'package:mobile/core/router/app_routes.dart';
import 'package:mobile/features/auth/presentation/screenLogin.dart';
import 'package:mobile/features/auth/presentation/screenSingIn.dart';
import 'package:mobile/features/auth/presentation/screenSplash.dart';
import 'package:mobile/features/checkout/presentation/screenChackout.dart';
import 'package:mobile/features/discounts/presentation/screenAbout.dart';
import 'package:mobile/features/discounts/presentation/screenCollections.dart';
import 'package:mobile/features/discounts/presentation/screenDiscounts.dart';
import 'package:mobile/features/discounts/presentation/screenRewards.dart';
import 'package:mobile/features/home/presentation/cart/presentation/screenCart.dart';
import 'package:mobile/features/home/presentation/home/presentation/screenHome.dart';
import 'package:mobile/features/home/presentation/order/presentation/screenOrder.dart';
import 'package:mobile/features/home/presentation/profile/presentation/screenUser.dart';
import 'package:mobile/features/home/presentation/shop/presentation/ScreenShop.dart';
import 'package:mobile/features/main/presentation/MainHome.dart';
import 'package:mobile/features/notfation/presentation/screenNotfation.dart';
import 'package:mobile/features/support/presentation/screenChat.dart';
import 'package:mobile/features/support/presentation/screenSupport.dart';

class AppRouter {
  AppRouter._();

  static final GoRouter router = GoRouter(
    initialLocation: AppRoutes.main,
    routes: [
      GoRoute(
        path: AppRoutes.main,
        builder: (context, state) => const MainHome(),
      ),
      _pageRoute(AppRoutes.splash, 'Splash', const ScreenSplash()),
      _pageRoute(AppRoutes.login, 'Log in', const ScreenLogIn()),
      _pageRoute(AppRoutes.signIn, 'Sign in', const ScreenSingIn()),
      _pageRoute(AppRoutes.home, 'Home', const ScreenHome()),
      _pageRoute(AppRoutes.shop, 'Shop', const ScreenShop()),
      _pageRoute(AppRoutes.cart, 'Cart', const ScreenCart()),
      _pageRoute(AppRoutes.checkout, 'Checkout', const ScreenCheckout()),
      _pageRoute(AppRoutes.order, 'Order', const ScreenOrder()),
      _pageRoute(AppRoutes.user, 'User', const ScreenUser()),
      _pageRoute(AppRoutes.collections, 'Collections', const ScreenCollections()),
      _pageRoute(AppRoutes.discounts, 'Discounts', const ScreenDiscounts()),
      _pageRoute(AppRoutes.rewards, 'Rewards', const ScreenRewards()),
      _pageRoute(AppRoutes.about, 'About', const ScreenAbout()),
      _pageRoute(AppRoutes.notifications, 'Notifications', const ScreenNotation()),
      _pageRoute(AppRoutes.support, 'Support', const ScreenSupport()),
      _pageRoute(AppRoutes.chat, 'Chat', const ScreenChat()),
    ],
  );

  static GoRoute _pageRoute(String path, String title, Widget page) {
    return GoRoute(
      path: path,
      builder: (context, state) => AppPageScaffold(title: title, child: page),
    );
  }
}