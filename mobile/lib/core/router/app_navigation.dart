import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/router/app_routes.dart';

class AppNavigationDrawer extends StatelessWidget {
  const AppNavigationDrawer({super.key});

  static const _destinations = <({String title, String route, IconData icon})>[
    (title: 'Main', route: AppRoutes.main, icon: Icons.dashboard_outlined),
    (title: 'Splash', route: AppRoutes.splash, icon: Icons.waving_hand_outlined),
    (title: 'Log in', route: AppRoutes.login, icon: Icons.login),
    (title: 'Sign in', route: AppRoutes.signIn, icon: Icons.person_add_alt_1),
    (title: 'Home', route: AppRoutes.home, icon: Icons.home_outlined),
    (title: 'Shop', route: AppRoutes.shop, icon: Icons.storefront_outlined),
    (title: 'Cart', route: AppRoutes.cart, icon: Icons.shopping_cart_outlined),
    (title: 'Checkout', route: AppRoutes.checkout, icon: Icons.payment),
    (title: 'Order', route: AppRoutes.order, icon: Icons.receipt_long_outlined),
    (title: 'User', route: AppRoutes.user, icon: Icons.person_outline),
    (
      title: 'Collections',
      route: AppRoutes.collections,
      icon: Icons.category_outlined,
    ),
    (
      title: 'Discounts',
      route: AppRoutes.discounts,
      icon: Icons.local_offer_outlined,
    ),
    (title: 'Rewards', route: AppRoutes.rewards, icon: Icons.stars_outlined),
    (title: 'About', route: AppRoutes.about, icon: Icons.info_outline),
    (
      title: 'Notifications',
      route: AppRoutes.notifications,
      icon: Icons.notifications_outlined,
    ),
    (title: 'Support', route: AppRoutes.support, icon: Icons.support_agent),
    (title: 'Chat', route: AppRoutes.chat, icon: Icons.chat_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: SafeArea(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              child: Align(
                alignment: Alignment.bottomLeft,
                child: Text(
                  'Lucine Store',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            for (final destination in _destinations)
              ListTile(
                leading: Icon(destination.icon),
                title: Text(destination.title),
                onTap: () => context.go(destination.route),
              ),
          ],
        ),
      ),
    );
  }
}

class AppPageScaffold extends StatelessWidget {
  const AppPageScaffold({
    required this.title,
    required this.child,
    super.key,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      drawer: const AppNavigationDrawer(),
      body: child,
    );
  }
}
