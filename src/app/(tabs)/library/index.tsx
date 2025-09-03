import LibraryMain from "@/src/components/absLibrary/LibraryMain";
import { Button, ContextMenu, Host, Picker } from "@expo/ui/swift-ui";
import React, { useState } from "react";
import { Text, View } from "react-native";
const Books = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  return (
    <View>
      <Text>Books From a Library</Text>
      <LibraryMain />
      <Host style={{ width: 150, height: 50 }}>
        <ContextMenu>
          <ContextMenu.Items>
            <Button
              systemImage="person.crop.circle.badge.xmark"
              onPress={() => console.log("Pressed1")}
            >
              Hello
            </Button>
            <Button variant="default" systemImage="heart" onPress={() => console.log("Pressed2")}>
              Love it
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
            <Button variant="bordered" color="" style={{}}>
              Show Menu
            </Button>
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    </View>
  );
};

export default Books;
