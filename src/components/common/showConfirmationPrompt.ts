import { Alert, StyleSheet } from "react-native";

const showConfirmationPrompt = (title: string, message: string) => {
  return new Promise((resolve) => {
    Alert.alert(
      title || "Confirm Delete",
      message || "Are you sure you want to delete this item?",
      [
        {
          text: "Cancel",
          onPress: () => {
            resolve(false);
          },
          style: "cancel",
        },
        {
          text: "OK",
          onPress: () => {
            resolve(true);
          },
        },
      ]
    );
  });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default showConfirmationPrompt;
