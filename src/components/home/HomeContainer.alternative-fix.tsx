// Alternative approach using separate className variables
const ItemComponent = React.memo<ItemComponentProps>(
  ({ item, onInitBook, togglePlayPause }) => {
    console.log(`ITEM RENDER: ${item.title} - Playing: ${item.isPlaying} - Loaded: ${item.isCurrentlyLoaded}`);
    
    // Define button styles separately to avoid template literal issues
    const buttonBaseClass = "border p-2";
    const buttonColorClass = item.isPlaying ? "bg-red-400" : "bg-blue-500";
    const buttonFullClass = `${buttonBaseClass} ${buttonColorClass}`;
    
    return (
      <View key={item.id} className="flex-row">
        <Image source={item.cover} style={{ width: 150, height: 150 }} contentFit="contain" />
        <View className="flex-col">
          <Text>{item.title}</Text>
          <Text>{item.author}</Text>
          <Text>{item.progressPercent}%</Text>
          <Text>
            {formatSeconds(item.currentTime)} of {formatSeconds(item.duration || 0)}
          </Text>
          <View className="flex-row">
            <TouchableOpacity
              onPress={async () => {
                if (item.isCurrentlyLoaded) {
                  await togglePlayPause();
                } else {
                  await onInitBook(item.id);
                  await togglePlayPause();
                }
              }}
              className={buttonFullClass}
              // Force re-render key to ensure styling updates
              key={`button-${item.id}-${item.isPlaying}`}
            >
              <Text className="text-white font-medium">
                {item.isPlaying ? 'Pause' : 'Play'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  },
  // ... rest of memo comparison
);