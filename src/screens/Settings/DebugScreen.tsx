import React from "react";
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import {
  SyncLogEntry,
  useDebugLogsActions,
  useLoggingEnabled,
  useSyncLogs,
} from "../../store/store-debuglogs";

const LogEntry = ({ item }: { item: SyncLogEntry }) => {
  return (
    <View style={[styles.logEntry, !item.success && styles.logEntryError]}>
      <View style={styles.logHeader}>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
        <Text style={[styles.syncType, !item.success && styles.syncTypeError]}>
          {item.syncType}
        </Text>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      <View style={styles.detailsRow}>
        <Text style={styles.position}>{item.position}</Text>
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
        <Text style={styles.headerTitle}>Sync Logs ({logs.length})</Text>
        <Pressable style={styles.clearButton} onPress={clearLogs}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </Pressable>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No sync logs yet.</Text>
          <Text style={styles.emptySubtext}>Play a book to see sync activity.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LogEntry item={item} />}
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
});

export default DebugScreen;
