import { useLibraries } from "@/src/hooks/ABSHooks";
import { useAuth } from "@/src/contexts/AuthContext";
import React from "react";
import { Pressable, Text, View } from "react-native";

const ABSLibrarySelect = () => {
  const { isAuthenticated } = useAuth();
  const { libraries, setActiveLibrary } = useLibraries();
  
  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <View>
      <Text>Active Library</Text>
      {libraries.map((el) => {
        return (
          <Pressable
            key={el.id}
            onPress={() => setActiveLibrary(el.id)}
            className={`p-2 border-hairline ${el.active ? "bg-green-500" : "bg-white"}`}
          >
            <Text>{el.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default ABSLibrarySelect;
