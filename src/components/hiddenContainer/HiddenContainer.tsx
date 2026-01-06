import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useThemeColors } from "@/src/utils/theme";
import { SymbolView } from "expo-symbols";
/**
 * Component will take a component as a child and toggle displaying or hiding
 * the content.
 * Will accept a passed "title" prop to display as title
 * Will also accept "startOpen" prop to determine if container is in
 * open state when initially displayed.
 *
 */

const HiddenContainer = ({
  children,
  style,
  title,
  titleInfo,
  leftIconFunction,
  startOpen = false,
}) => {
  const [viewContents, setViewContents] = useState(startOpen);
  const colors = useThemeColors();
  return (
    <View
      style={{
        backgroundColor: "#ffffff85",
        borderTopColor: "#777",
        borderBottomColor: "#aaa",
        borderBottomWidth: viewContents ? 1 : 0,
        borderTopWidth: 1,
        marginVertical: 5,
        marginHorizontal: 8,
        flex: 1,
      }}
    >
      <View className="flex-row border-b border-l border-r border-gray-600 justify-start items-center pl-[2]">
        {leftIconFunction && (
          <Pressable onPress={leftIconFunction}>
            {/* <EraserIcon color={!!titleInfo ? colors.destructive : colors.foreground} /> */}
            <SymbolView
              name="eraser.fill"
              size={20}
              tintColor={!!titleInfo ? colors.destructive : colors.foreground}
            />
          </Pressable>
        )}

        <Pressable
          className="flex-1 flex-row items-center justify-between my-2 mx-2"
          onPress={() => setViewContents((prev) => !prev)}
        >
          <View className="flex-row items-center flex-1">
            <View
              style={{
                paddingRight: 5,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold" }} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingRight: 5,
                flex: 1,
              }}
            >
              <Text className="flex-1" numberOfLines={1} lineBreakMode="tail">
                {titleInfo}
              </Text>
            </View>
          </View>
          <View>
            {!viewContents ? (
              <SymbolView name="arrow.down.to.line.compact" size={22} tintColor={colors.accent} />
            ) : (
              <SymbolView name="arrow.up.to.line.compact" size={22} tintColor={colors.accent} />
            )}
          </View>
        </Pressable>
      </View>
      {viewContents && <View style={{ ...style }}>{children}</View>}
    </View>
  );
};

export default HiddenContainer;

const styles = StyleSheet.create({});
