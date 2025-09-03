import { Button, ContextMenu, Host, Picker } from "@expo/ui/swift-ui";

import * as React from "react";
import { StyleSheet, View } from "react-native";

const videoLink =
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_2MB.mp4";

export default function ContextMenuScreen() {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(1);
  const [switchChecked, setSwitchChecked] = React.useState<boolean>(true);
  const [switch2Checked, setSwitch2Checked] = React.useState<boolean>(true);

  return (
    <View>
      <Host style={{ width: 150, height: 50 }}>
        <ContextMenu>
          <ContextMenu.Items>
            <Button
              systemImage="person.crop.circle.badge.xmark"
              onPress={() => console.log("Pressed1")}
            >
              Hello
            </Button>
            <Button variant="bordered" systemImage="heart" onPress={() => console.log("Pressed2")}>
              I love
            </Button>
            <Picker
              label="Doggos"
              options={["very", "veery", "veeery", "much"]}
              variant="menu"
              selectedIndex={selectedIndex}
              onOptionSelected={({ nativeEvent: { index } }) => setSelectedIndex(index)}
            />
          </ContextMenu.Items>
          <ContextMenu.Trigger>
            <Button variant="bordered">Show Menu</Button>
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    </View>
  );
}

ContextMenuScreen.navigationOptions = {
  title: "Context Menu",
};

const styles = StyleSheet.create({
  menuIcon: {
    width: 32,
    height: 32,
  },
  longPressMenu: {
    width: 200,
    height: 200,
  },
  preview: {
    width: 300,
    height: 200,
    padding: 20,
    backgroundColor: "#ffeeee",
  },
});
