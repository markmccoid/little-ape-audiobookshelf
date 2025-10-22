import { usePlaybackRate } from "@/src/hooks/trackPlayerHooks";
import { BookContainerRoute } from "@/src/screens/BookViewer/BookContainer";
import { updatePlaybackRate } from "@/src/store/store-playback";
import { useThemeColors } from "@/src/utils/theme";
import { Button, ContextMenu, Host } from "@expo/ui/swift-ui";
import { useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Text, View } from "react-native";
import BookBlurView from "./BookBlurView";

const RateViewer = () => {
  const { libraryItemId } = useLocalSearchParams<BookContainerRoute>();
  const playbackRate = usePlaybackRate(libraryItemId);

  // const { updateActivePlaybackRate: updatePlaybackRate } = usePlaybackActions();
  const themeColors = useThemeColors();

  return (
    <BookBlurView>
      <Host style={{ flex: 1 }}>
        <ContextMenu>
          <ContextMenu.Items>
            <Button onPress={() => updatePlaybackRate(libraryItemId, 0.75)}>.75x</Button>
            <Button onPress={() => updatePlaybackRate(libraryItemId, 1)}>1x</Button>
            <Button variant="default" onPress={() => updatePlaybackRate(libraryItemId, 1.25)}>
              1.25x
            </Button>
            <Button variant="bordered" onPress={() => updatePlaybackRate(libraryItemId, 1.5)}>
              1.5x
            </Button>
            <Button variant="bordered" onPress={() => updatePlaybackRate(libraryItemId, 1.75)}>
              1.75x
            </Button>
            <Button variant="bordered" onPress={() => updatePlaybackRate(libraryItemId, 2)}>
              2.0x
            </Button>
            <Button variant="bordered" onPress={() => updatePlaybackRate(libraryItemId, 2.25)}>
              2.25x
            </Button>
          </ContextMenu.Items>
          <ContextMenu.Trigger>
            <View className="flex-row gap-2 items-center justify-center py-1">
              <SymbolView
                name="hare.circle.fill"
                size={35}
                type="palette"
                colors={[themeColors.accent, "white"]}
              />
              <Text className="text-xl">{playbackRate}x</Text>
            </View>
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    </BookBlurView>
  );
};

export default RateViewer;
