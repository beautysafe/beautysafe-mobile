import type { ComponentType } from "react";
import { Tabs, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { SvgProps } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

function TabIcon({
  focused,
  ActiveIcon,
  Icon,
}: TabIconProps) {
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

  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        tabBarStyle: [
          styles.tabBar,
          {
            height: 58 + Math.max(insets.bottom, 10),
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ],

        tabBarItemStyle: styles.tabItem,
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="(main)/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              ActiveIcon={HomeActive}
              Icon={Home}
            />
          ),
        }}
      />

      {/* EXPLORE */}
      <Tabs.Screen
        name="(main)/explore"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              ActiveIcon={ExploreActive}
              Icon={Explore}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();

            router.replace(
              "/(tabs)/(main)/explore"
            );
          },
        }}
      />

      {/* FAVORITES */}
      <Tabs.Screen
        name="(main)/favori"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              ActiveIcon={FavoriteActive}
              Icon={Favorite}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (!token) {
              e.preventDefault();

              router.push(
                "/(tabs)/(auth)/login"
              );

              return;
            }
          },
        }}
      />

      {/* PROFILE */}
      <Tabs.Screen
        name="(main)/profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              ActiveIcon={UsersActive}
              Icon={Users}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (!token) {
              e.preventDefault();

              router.push(
                "/(tabs)/(auth)/login"
              );

              return;
            }
          },
        }}
      />

      {/* HIDDEN ROUTES */}
      <Tabs.Screen
        name="(main)/category/[id]"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(main)/subgroup/[id]"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(main)/journeys/[id]"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(main)/product-lists/[id]/products"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(main)/banner/[id]"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(main)/product/[ean]"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(main)/profile/edit"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(main)/manual-search"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(main)/scan-history"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(main)/unavailable-product"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(main)/faq"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(main)/contact"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(main)/privacy-policy"
        options={{ href: null }}
      />

      {/* AUTH SCREENS */}
      <Tabs.Screen
        name="(auth)/login"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="(auth)/register"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",

    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",

    paddingTop: 8,

    elevation: 8,

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: -2,
    },
  },

  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },

  iconWrap: {
    width: 44,
    height: 44,

    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",
  },
});
