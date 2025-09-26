import * as AC from "@bacons/apple-colors";
import { useRouter } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function SettingsLayout() {
  const router = useRouter();
  return (
    <NativeTabs
      // tintColor={"red"}
      tintColor={AC.systemPurple}
      // labelStyle={{ color: DynamicColorIOS({ light: "purple", dark: "" }) }}
    >
      <NativeTabs.Trigger name="(home)">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <Icon sf={{ default: "books.vertical", selected: "books.vertical.fill" }} />
        <Label>Library</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="collections">
        <Icon sf={{ default: "rectangle.3.group", selected: "rectangle.3.group.fill" }} />
        <Label>Collections</Label>
      </NativeTabs.Trigger>

      {/* <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            return <House size={size} color={color} />;
          },
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            return <Ionicons name="library" size={size} color={color} />;
          },
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          headerShown: false,
          title: "Collections",
          tabBarIcon: ({ color, size }) => {
            return <MaterialCommunityIcons name="library-shelves" size={size} color={color} />;
          },
        }}
      /> */}
    </NativeTabs>
  );
}
