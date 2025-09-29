import { SymbolView } from "expo-symbols";
import React from "react";
import { Alert, Text, View } from "react-native";
import HeaderButton from "./LAABSHeaderButton";

/**
 * Example usage of HeaderButton component
 * This file demonstrates different ways to use the HeaderButton
 */
export const HeaderButtonExamples: React.FC = () => {
  const handlePress = () => {
    Alert.alert("Button Pressed!");
  };

  return (
    <View style={{ flex: 1, padding: 20, gap: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        HeaderButton Examples
      </Text>

      {/* Basic SymbolView usage */}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <HeaderButton onPress={handlePress}>
          <SymbolView name="brain.fill" size={20} />
        </HeaderButton>
        <Text>Basic SymbolView (default size)</Text>
      </View>

      {/* Different sizes */}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <HeaderButton size="small" onPress={handlePress}>
          <SymbolView name="heart.fill" size={16} />
        </HeaderButton>
        <HeaderButton size="medium" onPress={handlePress}>
          <SymbolView name="heart.fill" size={20} />
        </HeaderButton>
        <HeaderButton size="large" onPress={handlePress}>
          <SymbolView name="heart.fill" size={24} />
        </HeaderButton>
        <Text>Different sizes (small, medium, large)</Text>
      </View>

      {/* Different variants */}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <HeaderButton variant="default" onPress={handlePress}>
          <SymbolView name="star.fill" size={20} />
        </HeaderButton>
        <HeaderButton variant="outlined" onPress={handlePress}>
          <SymbolView name="star.fill" size={20} />
        </HeaderButton>
        <HeaderButton variant="filled" onPress={handlePress}>
          <SymbolView name="star.fill" size={20} />
        </HeaderButton>
        <Text>Different variants</Text>
      </View>

      {/* Custom children (non-SymbolView) */}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <HeaderButton onPress={handlePress}>
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>X</Text>
        </HeaderButton>
        <HeaderButton variant="outlined" onPress={handlePress}>
          <Text style={{ fontSize: 12 }}>MENU</Text>
        </HeaderButton>
        <Text>Custom text children</Text>
      </View>

      {/* With custom container styles */}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <HeaderButton
          onPress={handlePress}
          containerStyle={{
            backgroundColor: "#FF6B6B",
            borderRadius: 20,
          }}
        >
          <SymbolView name="plus" size={20} />
        </HeaderButton>
        <HeaderButton
          onPress={handlePress}
          containerStyle={{
            backgroundColor: "#4ECDC4",
            borderRadius: 5,
            width: 60,
          }}
        >
          <SymbolView name="minus" size={20} />
        </HeaderButton>
        <Text>Custom styling</Text>
      </View>

      {/* Disabled state */}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <HeaderButton onPress={handlePress} disabled>
          <SymbolView name="lock.fill" size={20} />
        </HeaderButton>
        <Text>Disabled button</Text>
      </View>
    </View>
  );
};

export default HeaderButtonExamples;
