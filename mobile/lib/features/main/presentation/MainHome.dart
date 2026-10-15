import 'package:flutter/material.dart';
import 'package:mobile/core/theme/colors.dart';
import 'package:mobile/core/router/app_navigation.dart';
import 'package:mobile/features/home/presentation/cart/presentation/screenCart.dart';
import 'package:mobile/features/home/presentation/home/presentation/screenHome.dart';
import 'package:mobile/features/home/presentation/order/presentation/screenOrder.dart';
import 'package:mobile/features/home/presentation/profile/presentation/screenUser.dart';
import 'package:mobile/features/home/presentation/shop/presentation/ScreenShop.dart';

class MainHome extends StatefulWidget {
  const MainHome({super.key});

  @override
  State<MainHome> createState() => _MainHomeState();
}

class _MainHomeState extends State<MainHome> {
  List<Widget> pages = [
    const ScreenHome(),
    const ScreenShop(),
    const ScreenCart(),
    const ScreenOrder(),
    const ScreenUser(),
  ];
  late int initialIndex = 0;
  void onTabTapped(int index) {
    setState(() {
      initialIndex = index;
    });
  }

  // bottomNationBar
  List<BottomNavigationBarItem> bottomNavigationBarItems = const [
    BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
    BottomNavigationBarItem(icon: Icon(Icons.shop), label: 'Shop'),
    BottomNavigationBarItem(icon: Icon(Icons.shopping_cart), label: 'Cart'),
    BottomNavigationBarItem(icon: Icon(Icons.list_alt), label: 'Order'),
    BottomNavigationBarItem(icon: Icon(Icons.person), label: 'User'),
  ];
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: pages[initialIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: initialIndex,
        onTap: onTabTapped,
        items: bottomNavigationBarItems,
        backgroundColor: Colors.transparent,
        selectedItemColor: LucineColors.gold,
        unselectedItemColor: LucineColors.goldDark,
        landscapeLayout: BottomNavigationBarLandscapeLayout.centered,
        showUnselectedLabels: true,
      ),
    );
  }
}
