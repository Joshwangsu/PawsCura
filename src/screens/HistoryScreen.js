import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useHealth } from '../context/HealthContext';
import { useSubscription } from '../context/SubscriptionContext';
import StatusBadge from '../components/StatusBadge';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function HistoryScreen({ navigation }) {
  const { healthLogs, pets } = useHealth();
  const { isPremium } = useSubscription();
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedScan, setSelectedScan] = useState(null);

  // Filter logs based on urgency status selection
  const filteredLogs = useMemo(() => {
    // Sort logs descending by date first
    const sorted = [...healthLogs].sort((a, b) => {
      const timeA = a.date?.toMillis ? a.date.toMillis() : Date.parse(a.date) || 0;
      const timeB = b.date?.toMillis ? b.date.toMillis() : Date.parse(b.date) || 0;
      return timeB - timeA;
    });

    if (activeFilter === 'All') return sorted;
    return sorted.filter((log) => {
      const logStatus = log.status?.toLowerCase() || '';
      if (activeFilter === 'Urgent') {
        return logStatus === 'urgent' || logStatus === 'immediate care';
      }
      if (activeFilter === 'Moderate') {
        return logStatus === 'moderate' || logStatus === 'needs evaluation';
      }
      if (activeFilter === 'Safe') {
        return logStatus === 'safe' || logStatus === 'no concerns detected';
      }
      return false;
    });
  }, [healthLogs, activeFilter]);

  // Bulletproof date parser to prevent any Invalid Date / NaN outputs
  const parseDate = (val) => {
    if (!val) return new Date(); // Fallback to now
    
    // If it is a Firestore Timestamp
    if (typeof val.toDate === 'function') {
      return val.toDate();
    }
    if (val.seconds !== undefined) {
      return new Date(val.seconds * 1000);
    }
    if (typeof val.toMillis === 'function') {
      return new Date(val.toMillis());
    }
    
    // If it is already a Date object
    if (val instanceof Date) {
      return val;
    }
    
    // If it is a parseable timestamp number or string
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d;
    }
    
    return new Date(); // Fallback to now
  };

  // Format date grouping key: "Monday, 1 December"
  const formatGroupDate = (timestamp) => {
    const d = parseDate(timestamp);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    return `${weekday}, ${day} ${month}`;
  };

  // Group filtered logs into date-grouped sections
  const groupedSections = useMemo(() => {
    const groups = {};
    filteredLogs.forEach((log) => {
      const dateStr = formatGroupDate(log._timestamp || log.date);
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(log);
    });

    return Object.keys(groups).map((date) => ({
      date,
      data: groups[date],
    }));
  }, [filteredLogs]);

  // Format log time: e.g. "02:30 pm"
  const formatLogTime = (timestamp) => {
    const d = parseDate(timestamp);
    let hours = d.getHours();
    let minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes}\n${ampm}`;
  };

  // Helper to get formatting of simple date for detail modal
  const formatDetailDate = (timestamp) => {
    const d = parseDate(timestamp);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.safe}>
      {/* ── Header ────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.screenTitle}>Assessments History</Text>
          <Text style={styles.screenSubtitle}>
            Timeline of skin health assessments ({filteredLogs.length})
          </Text>
        </View>
      </View>

      {/* ── Filters ───────────────────────────────────── */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterScroll}
        >
          {['All', 'Urgent', 'Moderate', 'Safe'].map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterCap, isActive && styles.filterCapActive]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterCapText, isActive && styles.filterCapTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Timeline list ─────────────────────────────── */}
      <FlatList
        data={groupedSections}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="document-text-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Scans Recorded</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'All'
                ? "You haven't run any AI diagnostics yet. Head to the Scan tab to check your pet's skin."
                : `No diagnostic records match the '${activeFilter}' urgency filter.`}
            </Text>
            {activeFilter === 'All' && (
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Scan')}
              >
                <Text style={styles.actionBtnText}>Start New Scan</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.dateGroup}>
            <Text style={styles.dateGroupTitle}>{item.date}</Text>
            
            {item.data.map((log, index) => {
              const scanImage = log.imageUrl || log.imageUri;
              return (
                <View key={log.id} style={styles.timelineRow}>
                  {/* Left part: Time + Node line */}
                  <View style={styles.leftTimeline}>
                    <View style={styles.timeColumn}>
                      <Text style={styles.timeVal}>{formatLogTime(log._timestamp || log.date).split('\n')[0]}</Text>
                      <Text style={styles.timeAmpm}>{formatLogTime(log._timestamp || log.date).split('\n')[1]}</Text>
                    </View>
                    <View style={styles.nodeColumn}>
                      <View style={styles.verticalLine} />
                      <View style={styles.glowDotOuter}>
                        <View style={styles.glowDotInner} />
                      </View>
                    </View>
                  </View>

                  {/* Right part: Assessment card */}
                  <TouchableOpacity
                    style={styles.cardContainer}
                    activeOpacity={0.85}
                    onPress={() => setSelectedScan(log)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        {scanImage ? (
                          <Image source={{ uri: scanImage }} style={styles.cardThumbnail} />
                        ) : (
                          <View style={styles.cardIconPlaceholder}>
                            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
                          </View>
                        )}
                        <View style={styles.cardHeaderMeta}>
                          <Text style={styles.cardTitle} numberOfLines={1}>{log.issue}</Text>
                          <View style={styles.cardSubRow}>
                            <Text style={styles.cardSubText}>{log.petEmoji || '🐾'} {log.petName}</Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardBody}>
                      <Text style={styles.cardNotes} numberOfLines={2}>
                        {log.description || 'No additional observational advice recorded.'}
                      </Text>
                    </View>

                    <View style={styles.cardFooter}>
                      <StatusBadge status={log.status} size="sm" />
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      />

      {/* ── Sticky bottom Add Assessment Button ───────── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.stickyAddBtn}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Scan')}
        >
          <LinearGradient
            colors={[Colors.primary, '#1E3F66']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.stickyAddGradient}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.stickyAddText}>New Assessment</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Record Details Modal ──────────────────────── */}
      {selectedScan && (
        <Modal
          visible={!!selectedScan}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedScan(null)}
        >
          <View style={styles.modalFullContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan Report</Text>
              <TouchableOpacity onPress={() => setSelectedScan(null)}>
                <Ionicons name="close" size={26} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalMetaRow}>
                <View style={styles.modalMetaCell}>
                  <Text style={styles.modalMetaLabel}>Assessment Date</Text>
                  <Text style={styles.modalMetaValue}>{formatDetailDate(selectedScan._timestamp || selectedScan.date)}</Text>
                </View>
                <View style={styles.modalMetaCell}>
                  <Text style={styles.modalMetaLabel}>Target Pet</Text>
                  <Text style={styles.modalMetaValue}>
                    {selectedScan.petEmoji || '🐾'} {selectedScan.petName} ({selectedScan.breed})
                  </Text>
                </View>
              </View>

              <View style={styles.modalMetaRow}>
                <View style={styles.modalMetaCell}>
                  <Text style={styles.modalMetaLabel}>Urgency Level</Text>
                  <StatusBadge status={selectedScan.status} />
                </View>
                <View style={styles.modalMetaCell}>
                  <Text style={styles.modalMetaLabel}>Clinic Assessment</Text>
                  <Text style={styles.modalMetaValue}>{selectedScan.clinic || 'AI Skin Scan'}</Text>
                </View>
              </View>

              <View style={styles.modalDivider} />

              <Text style={styles.modalSectionTitle}>Suspected Skin Condition</Text>
              <Text style={styles.modalConditionName}>{selectedScan.issue}</Text>
              
              <Text style={[styles.modalSectionTitle, { marginTop: Spacing.md }]}>
                AI Analysis & Recommendations
              </Text>
              <Text style={styles.modalDescriptionText}>
                {selectedScan.description || 'No detailed observations available for this record.'}
              </Text>


              {(selectedScan.imageUrl || selectedScan.imageUri) && (
                <View style={styles.modalImageContainer}>
                  <Text style={styles.modalSectionTitle}>Symptom Photo Scan</Text>
                  <Image
                    source={{ uri: selectedScan.imageUrl || selectedScan.imageUri }}
                    style={styles.modalScannedImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  headerInfo: {
    flexDirection: 'column',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filterContainer: {
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterScroll: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  filterCap: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterCapActive: {
    backgroundColor: '#1E3F66',
    borderColor: '#1E3F66',
    ...Shadows.sm,
  },
  filterCapText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterCapTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  listContent: {
    paddingTop: Spacing.md,
    paddingBottom: 90,
  },
  dateGroup: {
    marginBottom: Spacing.lg,
  },
  dateGroupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    letterSpacing: -0.2,
  },
  timelineRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: 12,
  },
  leftTimeline: {
    width: 72,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeColumn: {
    width: 48,
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  timeVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  timeAmpm: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    textAlign: 'right',
    marginTop: 1,
  },
  nodeColumn: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: -16,
    width: 2,
    backgroundColor: Colors.border,
  },
  glowDotOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    zIndex: 2,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  glowDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0EA5E9',
  },
  cardContainer: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardThumbnail: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
    backgroundColor: Colors.background,
  },
  cardIconPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeaderMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cardSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cardSubText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  cardBody: {
    marginBottom: Spacing.sm,
  },
  cardNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  stickyAddBtn: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.md,
  },
  stickyAddGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  stickyAddText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalFullContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'ios' ? 44 : 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalScrollContent: {
    padding: Spacing.lg,
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  modalMetaCell: {
    flex: 1,
  },
  modalMetaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalMetaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  modalConditionName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  modalDescriptionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  vetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vetText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalImageContainer: {
    marginTop: Spacing.sm,
  },
  modalScannedImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    backgroundColor: Colors.background,
  },
});
