import { ColorPicker, Host } from "@expo/ui/swift-ui";
import React, { useState } from "react";
import { Text, View } from "react-native";

const HomeTab = () => {
  const [color, setColor] = useState("");
  return (
    <View style={{ backgroundColor: color, flex: 1 }}>
      <Text>HomeTab</Text>
      <View style={{ width: 250, backgroundColor: "white", borderWidth: 1, padding: 5 }}>
        <Host>
          <ColorPicker
            label="Select a color"
            selection={color}
            onValueChanged={setColor}
            style={{ width: 400, height: 30 }}
          />
        </Host>
      </View>
    </View>
  );
};

export default HomeTab;
