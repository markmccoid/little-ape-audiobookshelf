import React from 'react'
import { View, Text, Button } from 'react-native'
import {
  useSeekForwardSeconds,
  useSeekBackwardSeconds,
  useSettingsActions,
  useSeekSettings,
} from './store-settings'

// Example component showing how to use the settings store
export const SettingsExample = () => {
  // Using atomic selectors (recommended approach)
  const seekForwardSeconds = useSeekForwardSeconds()
  const seekBackwardSeconds = useSeekBackwardSeconds()
  
  // Getting all actions
  const { setSeekForwardSeconds, setSeekBackwardSeconds, resetToDefaults } = useSettingsActions()

  return (
    <View style={{ padding: 20 }}>
      <Text>Current Settings:</Text>
      <Text>Seek Forward: {seekForwardSeconds} seconds</Text>
      <Text>Seek Backward: {seekBackwardSeconds} seconds</Text>
      
      <View style={{ marginTop: 20 }}>
        <Button
          title="Set Forward to 45s"
          onPress={() => setSeekForwardSeconds(45)}
        />
        <Button
          title="Set Backward to 10s"
          onPress={() => setSeekBackwardSeconds(10)}
        />
        <Button
          title="Reset to Defaults"
          onPress={resetToDefaults}
        />
      </View>
    </View>
  )
}

// Alternative: Using the combined selector when you need both values
export const AlternativeExample = () => {
  // This approach uses shallow comparison automatically since we're returning an object
  const { seekForwardSeconds, seekBackwardSeconds } = useSeekSettings()
  const actions = useSettingsActions()

  return (
    <View style={{ padding: 20 }}>
      <Text>Forward: {seekForwardSeconds}s, Backward: {seekBackwardSeconds}s</Text>
      <Button
        title="Increment Forward"
        onPress={() => actions.setSeekForwardSeconds(seekForwardSeconds + 5)}
      />
    </View>
  )
}