import { useFiltersActions, useSortDirection, useSortedBy } from "@/src/store/store-filters";
import { useThemeColors } from "@/src/utils/theme";
import { Button, ContextMenu, Host, HStack, Picker } from "@expo/ui/swift-ui";
import { SymbolView } from "expo-symbols";
import { Text, View } from "react-native";

const SortContextMenu = () => {
  const themeColors = useThemeColors();
  const sortedBy = useSortedBy();
  const sortDirection = useSortDirection();
  const { setSortedBy, setSortDirection } = useFiltersActions();

  // "author" | "addedAt" | "title" | "duration" | "publishedYear

  return (
    <Host style={{ width: 30, height: 30 }}>
      <ContextMenu>
        <ContextMenu.Items>
          <Button systemImage="person" onPress={() => setSortedBy("author")}>
            Author {sortedBy === "author" && "      ✅"}
          </Button>
          <Button systemImage="book" onPress={() => setSortedBy("title")}>
            Title {sortedBy === "title" && "      ✅"}
          </Button>
          <Button systemImage="calendar" onPress={() => setSortedBy("addedAt")}>
            Added At {sortedBy === "addedAt" && "      ✅"}
          </Button>
          <Button systemImage="clock" onPress={() => setSortedBy("duration")}>
            Duration {sortedBy === "duration" && "      ✅"}
          </Button>
          <Button systemImage="calendar.and.person" onPress={() => setSortedBy("publishedYear")}>
            Published Year {sortedBy === "publishedYear" && "    ✅"}
          </Button>
          <HStack>
            <Text></Text>
            <Picker
              label={`${sortDirection === "asc" ? "↑" : "↓"} Sort Direction`}
              options={["Ascending", "Descending"]}
              variant="menu"
              selectedIndex={sortDirection === "asc" ? 0 : 1}
              onOptionSelected={({ nativeEvent: { index } }) =>
                setSortDirection(index === 0 ? "asc" : "desc")
              }
            />
          </HStack>
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <View className="flex-row items-center justify-center  w-[35] h-[30]">
            <SymbolView
              name="line.3.horizontal.decrease"
              size={25}
              tintColor={themeColors.accentForeground}
            />
          </View>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
};

export default SortContextMenu;
