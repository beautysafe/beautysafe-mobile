import type { ComponentType } from "react";
import { Tabs, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { SvgProps } from "react-native-svg";
import { useAuth } from "../../components/AuthProvider";

// SVG imports
import Home from "../../../assets/navbar/home.svg";
import HomeActive from "../../../assets/navbar/home-active.svg";

import Explore from "../../../assets/navbar/explore.svg";
import ExploreActive from "../../../assets/navbar/explore-active.svg";

import Favorite from "../../../assets/navbar/favorite.svg";
import FavoriteActive from "../../../assets/navbar/favorite-active.svg";

import Users from "../../../assets/navbar/users.svg";
import UsersActive from "../../../assets/navbar/users-active.svg";

type TabIconProps = {
  focused: boolean;
  ActiveIcon: ComponentType<SvgProps>;
  Icon: ComponentType<SvgProps>;
};

function TabIcon({ focused, ActiveIcon, Icon }: TabIconProps) {
  const Comp = focused ? ActiveIcon : Icon;
  return (
    <View style={styles.iconWrap}>
      <Comp width={24} height={24} />
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const { token } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      {/* MAIN TABS */}
      <Tabs.Screen
        name="(main)/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} ActiveIcon={HomeActive} Icon={Home} />
          ),
        }}
      />

      <Tabs.Screen
        name="(main)/explore"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} ActiveIcon={ExploreActive} Icon={Explore} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            // Always reset Explore
            e.preventDefault();
            router.replace("/(tabs)/(main)/explore");
          },
        }}
      />

      <Tabs.Screen
        name="(main)/favori"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} ActiveIcon={FavoriteActive} Icon={Favorite} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (!token) {
              e.preventDefault();
              router.push("/(tabs)/(auth)/login");
              return;
            }
            // allow normal navigation if logged in
          },
        }}
      />

      <Tabs.Screen
        name="(main)/profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} ActiveIcon={UsersActive} Icon={Users} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (!token) {
              e.preventDefault();
              router.push("/(tabs)/(auth)/login");
              return;
            }
          },
        }}
      />

      {/* HIDDEN ROUTES (inside tabs, but not shown as buttons) */}
      <Tabs.Screen name="(main)/category/[id]" options={{ href: null }} />
      <Tabs.Screen name="(main)/subgroup/[id]" options={{ href: null }} />
      <Tabs.Screen name="(main)/journeys/[id]" options={{ href: null }} />
      <Tabs.Screen name="(main)/product-lists/[id]/products" options={{ href: null }} />
      <Tabs.Screen name="(main)/banner/[id]" options={{ href: null }} />
      <Tabs.Screen name="(main)/product/[ean]" options={{ href: null }} />
      <Tabs.Screen name="(main)/profile/edit" options={{ href: null }} />
      <Tabs.Screen name="(main)/manual-search" options={{ href: null }} />
      <Tabs.Screen name="(main)/faq" options={{ href: null }} />
      <Tabs.Screen name="(main)/contact" options={{ href: null }} />
      <Tabs.Screen name="(main)/privacy-policy" options={{ href: null }} />


      {/* AUTH SCREENS: still show tab bar, but not clickable tabs */}
      <Tabs.Screen
        name="(auth)/login"
        options={{ href: null}}
      />
      <Tabs.Screen
        name="(auth)/register"
        options={{ href: null}}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 75,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  tabItem: { alignItems: "center", justifyContent: "center" },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
