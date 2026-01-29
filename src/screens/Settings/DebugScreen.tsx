import React from "react";
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import {
  SyncLogEntry,
  useDebugLogsActions,
  useLoggingEnabled,
  useSyncLogs,
} from "../../store/store-debuglogs";

const LogEntry = ({
  item,
  onTitlePress,
  onLabelPress,
}: {
  item: SyncLogEntry;
  onTitlePress: (title: string) => void;
  onLabelPress: (label: string) => void;
}) => {
  const isQueuedPositionApplied = item.syncType === "queued-position-applied";
  return (
    <View
      style={[
        styles.logEntry,
        !item.success && styles.logEntryError,
        isQueuedPositionApplied && styles.logEntryQueuedPosition,
        item.syncType === "zero-reset" && styles.logEntryZeroReset,
      ]}
    >
      <View style={styles.logHeader}>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
        <Pressable onPress={() => onLabelPress(item.syncType)}>
          <Text
            style={[
              styles.syncType,
              !item.success && styles.syncTypeError,
              isQueuedPositionApplied && styles.syncTypeQueuedPosition,
              item.syncType === "zero-reset" && styles.syncTypeZeroReset,
            ]}
          >
            {item.syncType}
          </Text>
        </Pressable>
      </View>
      <Pressable onPress={() => onTitlePress(item.title)}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
      </Pressable>
      <View style={styles.detailsRow}>
        <Text style={styles.position}>{item.position}</Text>
        {item.timeListened !== undefined && (
          <Text style={styles.timeListened}>+{item.timeListened}s</Text>
        )}
        <Text style={styles.route} numberOfLines={1}>
          {item.apiRoute}
        </Text>
      </View>
      <Text style={styles.source}>
        {item.functionName} • {item.fileName}
      </Text>
      {item.errorMessage && <Text style={styles.error}>{item.errorMessage}</Text>}
    </View>
  );
};

const DebugScreen = () => {
  const logs = useSyncLogs();
  const loggingEnabled = useLoggingEnabled();
  const { clearLogs, setLoggingEnabled } = useDebugLogsActions();
  const [filterTitle, setFilterTitle] = React.useState<string | null>(null);
  const [filterLabel, setFilterLabel] = React.useState<string | null>(null);

  const filteredLogs = React.useMemo(() => {
    if (filterTitle) {
      return logs.filter((log) => log.title === filterTitle);
    }
    if (filterLabel) {
      return logs.filter((log) => log.syncType === filterLabel);
    }
    return logs;
  }, [logs, filterTitle, filterLabel]);

  const clearFilter = () => {
    setFilterTitle(null);
    setFilterLabel(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Sync Logging</Text>
        <Switch
          value={loggingEnabled}
          onValueChange={setLoggingEnabled}
          trackColor={{ false: "#555", true: "#4CAF50" }}
          thumbColor={loggingEnabled ? "#fff" : "#888"}
        />
      </View>

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            Logs ({filteredLogs.length}/{logs.length})
          </Text>
          {(filterTitle || filterLabel) && (
            <Text style={styles.filterText} numberOfLines={1}>
              Filter: {filterTitle || filterLabel}
            </Text>
          )}
        </View>
        <View style={styles.headerButtons}>
          {(filterTitle || filterLabel) && (
            <Pressable style={[styles.clearButton, styles.filterButton]} onPress={clearFilter}>
              <Text style={styles.clearButtonText}>Clear Filter</Text>
            </Pressable>
          )}
          <Pressable style={styles.clearButton} onPress={clearLogs}>
            <Text style={styles.clearButtonText}>Clear Logs</Text>
          </Pressable>
        </View>
      </View>

      {filteredLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {logs.length === 0 ? "No sync logs yet." : "No logs match filter."}
          </Text>
          {logs.length === 0 && (
            <Text style={styles.emptySubtext}>Play a book to see sync activity.</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LogEntry
              item={item}
              onTitlePress={(t) => {
                setFilterLabel(null);
                setFilterTitle(t);
              }}
              onLabelPress={(l) => {
                setFilterTitle(null);
                setFilterLabel(l);
              }}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#222",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  clearButton: {
    backgroundColor: "#ff4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  list: {
    padding: 12,
  },
  logEntry: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  logEntryError: {
    borderLeftColor: "#ff4444",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: "#888",
  },
  syncType: {
    fontSize: 11,
    color: "#4CAF50",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  syncTypeError: {
    color: "#ff4444",
  },
  logEntryQueuedPosition: {
    borderLeftColor: "#00BCD4",
    backgroundColor: "#1a3a3a",
  },
  syncTypeQueuedPosition: {
    color: "#00BCD4",
  },
  logEntryZeroReset: {
    borderLeftColor: "#2196F3", // Blue
    backgroundColor: "#1a2a3a",
  },
  syncTypeZeroReset: {
    color: "#2196F3", // Blue
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  position: {
    fontSize: 13,
    color: "#4FC3F7",
    fontFamily: "monospace",
    marginRight: 8,
  },
  timeListened: {
    fontSize: 12,
    color: "#FFA726",
    fontFamily: "monospace",
    marginRight: 8,
  },
  route: {
    fontSize: 11,
    color: "#888",
    flex: 1,
  },
  source: {
    fontSize: 10,
    color: "#666",
  },
  error: {
    fontSize: 11,
    color: "#ff6666",
    marginTop: 4,
    fontStyle: "italic",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    backgroundColor: "#444",
    marginRight: 8,
  },
  filterText: {
    fontSize: 12,
    color: "#4CAF50",
    marginTop: 2,
  },
});

export default DebugScreen;
