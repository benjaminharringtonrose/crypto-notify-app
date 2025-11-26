import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createStaticNavigation,
  StaticParamList,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform } from "react-native";

import { Home } from "./screens/Home";
import { SmartFlows } from "./screens/SmartFlows";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/IconSymbol";
import TabBarBackground from "@/components/TabBarBackground";

const HomeTabs = createBottomTabNavigator({
  screens: {
    Home: {
      screen: Home,
      options: {
        headerShown: false,
        tabBarIcon: ({ color }) => (
          <IconSymbol size={28} name="house.fill" color={color} />
        ),
      },
    },
    SmartFlows: {
      screen: SmartFlows,
      options: {
        headerShown: false,
        tabBarIcon: ({ color }) => (
          <IconSymbol size={28} name="chart.xyaxis.line" color={color} />
        ),
        tabBarLabel: "Smart Flows",
      },
    },
  },
  screenOptions: {
    headerShown: false,
    tabBarButton: HapticTab,
    tabBarBackground: TabBarBackground,
    // @ts-ignore
    tabBarStyle: Platform.select({
      ios: {
        // Use a transparent background on iOS to show the blur effect
        position: "absolute",
      },
      default: {},
    }),
  },
});

const RootStack = createNativeStackNavigator({
  screens: {
    HomeTabs: {
      screen: HomeTabs,
      options: {
        headerShown: false,
      },
    },
  },
});

export const Navigation = createStaticNavigation(RootStack);

type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
