import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs, useRouter } from "expo-router";
import { House } from "lucide-react-native";
export default function SettingsLayout() {
  const router = useRouter();
  return (
    <Tabs>
      <Tabs.Screen
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
      />
    </Tabs>
  );
}
