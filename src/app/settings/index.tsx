import { useAuth } from "@/src/contexts/AuthContext";
import {
  useSeekBackwardSeconds,
  useSeekForwardSeconds,
  useSettingsActions,
} from "@/src/store/store-settings";
import {
  Button,
  Form,
  Host,
  HStack,
  Image,
  Section,
  Spacer,
  Switch,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import { background, clipShape, frame } from "@expo/ui/swift-ui/modifiers";
import { useHeaderHeight } from "@react-navigation/elements";
import { Link } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

export default function SettingsView() {
  const headerHeight = useHeaderHeight();
  const [isAirplaneMode, setIsAirplaneMode] = useState(true);
  const settingsActions = useSettingsActions();
  const seekForward = useSeekForwardSeconds();
  const seekBackward = useSeekBackwardSeconds();
  const { isAuthenticated, hasStoredCredentials, authInfo } = useAuth();

  // Format auth info for display
  const displayInfo = {
    absURL: authInfo.serverUrl || (hasStoredCredentials ? "Configured" : "Not configured"),
    username:
      authInfo.username || (hasStoredCredentials ? "Authentication failed" : "Not logged in"),
  };

  const handleSeekForwardPress = () => {
    Alert.prompt(
      "Skip Forward Seconds",
      "Enter the number of seconds to skip forward:",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "OK",
          onPress: (value) => {
            if (value) {
              const numValue = parseInt(value);
              if (!isNaN(numValue) && numValue >= 0) {
                settingsActions.setSeekForwardSeconds(numValue);
              } else {
                Alert.alert("Invalid Input", "Please enter a valid number.");
              }
            }
          },
        },
      ],
      "plain-text",
      seekForward.toString(),
      "number-pad"
    );
  };

  const handleSeekBackwardPress = () => {
    Alert.prompt(
      "Skip Backward Seconds",
      "Enter the number of seconds to skip backward:",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "OK",
          onPress: (value) => {
            if (value) {
              const numValue = parseInt(value);
              if (!isNaN(numValue) && numValue >= 0) {
                settingsActions.setSeekBackwardSeconds(numValue);
              } else {
                Alert.alert("Invalid Input", "Please enter a valid number.");
              }
            }
          },
        },
      ],
      "plain-text",
      seekBackward.toString(),
      "number-pad"
    );
  };

  return (
    <Host style={{ flex: 1, paddingTop: headerHeight }}>
      <Form>
        <Section title="Player">
          <Link href="/settings/abs_auth" asChild>
            <Button>
              <HStack spacing={4} alignment="center">
                <Image
                  systemName="wifi"
                  color="white"
                  size={14}
                  modifiers={[
                    frame({ width: 28, height: 28 }),
                    background("#007aff"),
                    clipShape("roundedRectangle"),
                  ]}
                />
                <VStack alignment="leading">
                  <Text color="primary" size={14}>
                    AudiobookShelf Authorization
                  </Text>
                  <Text color="gray" size={12}>
                    {`${displayInfo.absURL} - (${displayInfo.username})`}
                  </Text>
                </VStack>
                <Spacer />
                <Image systemName="chevron.right" size={14} color="secondary" />
              </HStack>
            </Button>
          </Link>
          <Button onPress={handleSeekForwardPress}>
            <HStack spacing={4} alignment="center">
              <Image
                systemName="forward.fill"
                color="white"
                size={14}
                modifiers={[
                  frame({ width: 28, height: 28 }),
                  background("#34c759"),
                  clipShape("roundedRectangle"),
                ]}
              />
              <VStack alignment="center">
                <Text color="primary" size={14}>
                  Skip Forward Seconds
                </Text>
              </VStack>
              <Spacer />
              <Text color="secondary" size={16} weight="semibold">
                {seekForward.toString()}
              </Text>
              <Image systemName="chevron.right" size={14} color="secondary" />
            </HStack>
          </Button>
          <Button onPress={handleSeekBackwardPress}>
            <HStack spacing={4} alignment="center">
              <Image
                systemName="backward.fill"
                color="white"
                size={14}
                modifiers={[
                  frame({ width: 28, height: 28 }),
                  background("#ff9500"),
                  clipShape("roundedRectangle"),
                ]}
              />
              <VStack alignment="leading">
                <Text color="primary" size={14}>
                  Skip Backward Seconds
                </Text>
              </VStack>
              <Spacer />
              <Text color="secondary" size={16} weight="semibold">
                {seekBackward.toString()}
              </Text>
              <Image systemName="chevron.right" size={14} color="secondary" />
            </HStack>
          </Button>
          <HStack spacing={4}>
            <Image
              systemName="airplane"
              color="white"
              size={14}
              modifiers={[
                frame({ width: 28, height: 28 }),
                background("#ffa500"),
                clipShape("roundedRectangle"),
              ]}
            />
            <Text size={14}>Airplane Mode</Text>
            <Spacer />
            <Switch value={isAirplaneMode} onValueChange={setIsAirplaneMode} />
          </HStack>
        </Section>
      </Form>
    </Host>
  );
}
