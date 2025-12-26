import { useAuth } from "@/src/contexts/AuthContext";
import { useBooksActions } from "@/src/store/store-books";
import {
  useSeekBackwardSeconds,
  useSeekForwardSeconds,
  useSettingsActions,
  useSettingsStore,
} from "@/src/store/store-settings";
import { useThemeColors } from "@/src/utils/theme";
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
  const themeColors = useThemeColors();
  const [isAirplaneMode, setIsAirplaneMode] = useState(true);
  const settingsActions = useSettingsActions();
  const seekForward = useSeekForwardSeconds();
  const seekBackward = useSeekBackwardSeconds();
  const homeScreenTimeVariant = useSettingsStore((state) => state.homeScreenTimeVariant);
  const showTimeLeft = homeScreenTimeVariant === "timeleft";

  const { isAuthenticated, hasStoredCredentials, authInfo } = useAuth();
  const bookActions = useBooksActions();
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
          {/* Manage Bookshelves */}
          <Link href="/settings/managebookshelves" asChild>
            <Button>
              <HStack spacing={4} alignment="center">
                <Image
                  systemName="book.and.wrench"
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
                    Manage Bookshelves
                  </Text>
                </VStack>
                <Spacer />
                <Image systemName="chevron.right" size={14} color="secondary" />
              </HStack>
            </Button>
          </Link>
          {/* Time Display */}
          <Button>
            <VStack>
              <HStack spacing={4} alignment="center">
                <Image
                  systemName="timelapse"
                  color="white"
                  size={14}
                  modifiers={[
                    frame({ width: 28, height: 28 }),
                    background("#007aff"),
                    clipShape("roundedRectangle"),
                  ]}
                />
                <Text color="primary" size={16}>
                  Home screen book position display
                </Text>
                <Spacer />
              </HStack>
              <HStack>
                <Spacer />
                <Switch
                  value={showTimeLeft}
                  onValueChange={(checked) => {
                    if (checked) {
                      settingsActions.setHomeScreenTimeVariant("timeleft");
                    } else {
                      settingsActions.setHomeScreenTimeVariant("timeread");
                    }
                  }}
                  label="Time Left"
                  variant="button"
                  color={showTimeLeft ? themeColors.destructive : themeColors.muted}
                />
                <Spacer />
                <Switch
                  value={!showTimeLeft}
                  onValueChange={(checked) => {
                    if (checked) {
                      settingsActions.setHomeScreenTimeVariant("timeread");
                    } else {
                      settingsActions.setHomeScreenTimeVariant("timeleft");
                    }
                  }}
                  label="Time Read"
                  variant="button"
                  color={!showTimeLeft ? themeColors.accent : themeColors.accentMuted}
                />
                <Spacer />
              </HStack>
            </VStack>
          </Button>
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
          {/* Manage Bookshelves */}
          <Link href="/settings/debug" asChild>
            <Button>
              <HStack spacing={4} alignment="center">
                <Image
                  systemName="ladybug.fill"
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
                    Debug
                  </Text>
                </VStack>
                <Spacer />
                <Image systemName="chevron.right" size={14} color="secondary" />
              </HStack>
            </Button>
          </Link>
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
            <Button
              onPress={() => {
                bookActions.clearBooks();
              }}
            >
              <Text size={14}>Clear Books</Text>
            </Button>
            <Spacer />
          </HStack>
        </Section>
      </Form>
    </Host>
  );
}
