import { usePlaybackActions, usePlaybackStore } from "@/src/store/store-playback";
import { useThemeColors } from "@/src/utils/theme";
import { Button, ContextMenu, Host } from "@expo/ui/swift-ui";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Text, View } from "react-native";

const RateViewer = () => {
  const playbackRate = usePlaybackStore((state) => state.playbackRate);

  const { updatePlaybackRate } = usePlaybackActions();
  const themeColors = useThemeColors();

  return (
    <BlurView
      intensity={100}
      // tint="systemMaterial"
      tint="extraLight"
      className="flex-row rounded-2xl overflow-hidden justify-center items-center ml-2"
    >
      <Host style={{ flex: 1 }}>
        <ContextMenu>
          <ContextMenu.Items>
            <Button onPress={() => updatePlaybackRate(0.75)}>.75x</Button>
            <Button onPress={() => updatePlaybackRate(1)}>1x</Button>
            <Button variant="default" onPress={() => updatePlaybackRate(1.25)}>
              1.25x
            </Button>
            <Button variant="bordered" onPress={() => updatePlaybackRate(1.5)}>
              1.5x
            </Button>
            <Button variant="bordered" onPress={() => updatePlaybackRate(1.75)}>
              1.75x
            </Button>
            <Button variant="bordered" onPress={() => updatePlaybackRate(2)}>
              2.0x
            </Button>
            <Button variant="bordered" onPress={() => updatePlaybackRate(2.25)}>
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
    </BlurView>
  );
};

export default RateViewer;
