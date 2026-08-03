import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';
import { chatWithVet } from '../services/gemini';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { doc, setDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

import { Modal } from 'react-native';

export default function ChatbotScreen({ route, navigation }) {
  const { initialContext } = route.params || {};
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'history'
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const flatListRef = useRef(null);

  const userMessageCount = messages.filter((m) => m.role === 'user').length;

  const deleteSession = async (sessId) => {
    if (!user || sessions.length <= 1) return;
    try {
      await deleteDoc(doc(db, 'chats', user.uid, 'userSessions', sessId));
      if (activeSessionId === sessId) {
        const remaining = sessions.filter(s => s.id !== sessId);
        if (remaining.length > 0) setActiveSessionId(remaining[0].id);
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  // Helper to format session title as "Pet Name - Condition"
  const formatSessionTitle = (ctx, fallbackName) => {
    if (ctx && ctx.suspectedCondition) {
      const pet = ctx.matchedPetName || ctx.petName || 'Pet';
      return `${pet} - ${ctx.suspectedCondition}`;
    }
    return fallbackName || 'Pet - Health Consultation';
  };

  // Load / Sync Sessions & Messages for ALL logged-in users
  useEffect(() => {
    if (!user) return;

    const initialTitle = formatSessionTitle(initialContext, 'Pet - General Care');

    const sessionsQuery = query(collection(db, 'chats', user.uid, 'userSessions'), orderBy('updatedAt', 'desc'));
    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
      let loadedSessions = [];
      snapshot.forEach((d) => {
        loadedSessions.push({ id: d.id, ...d.data() });
      });

      if (loadedSessions.length === 0) {
        createNewSession(initialTitle);
      } else {
        setSessions(loadedSessions);
        if (!activeSessionId) {
          // If initialContext provided, try to find existing past conversation or create new one for it
          if (initialContext && initialContext.suspectedCondition) {
            const targetTitle = formatSessionTitle(initialContext);
            const matchedSess = loadedSessions.find((s) => s.title === targetTitle);
            if (matchedSess) {
              setActiveSessionId(matchedSess.id);
              return;
            } else {
              // Automatically create a new session for this assessment!
              createNewSession(targetTitle);
              return;
            }
          }
          setActiveSessionId(loadedSessions[0].id);
        }
      }
    });

    return () => unsubSessions();
  }, [user, initialContext]);

  // Handle messages subscription for activeSessionId for ALL users
  useEffect(() => {
    if (!user || !activeSessionId) return;

    const messagesQuery = query(collection(db, 'chats', user.uid, 'userSessions', activeSessionId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      let loaded = [];
      snapshot.forEach((d) => {
        loaded.push({ id: d.id, ...d.data() });
      });

      if (loaded.length === 0) {
        const pet = (initialContext && (initialContext.matchedPetName || initialContext.petName)) || 'your pet';
        const condition = initialContext ? initialContext.suspectedCondition : '';
        const observations = initialContext ? initialContext.analysis : '';

        const greeting = initialContext && condition
          ? `Hello! I have loaded the AI assessment for **${pet}** regarding **${condition}**.\n\nObservations: ${observations}\n\nHow can I help answer questions or guide care for ${pet}?`
          : 'Hello! I am your AI Virtual Vet Assistant. How can I assist you with your pet today?';

        const defaultMsg = {
          role: 'assistant',
          text: greeting,
          timestamp: serverTimestamp(),
        };
        addDoc(collection(db, 'chats', user.uid, 'userSessions', activeSessionId, 'messages'), defaultMsg).catch((e) => console.log(e));
      } else {
        setMessages(loaded);
      }
    });

    return () => unsubMessages();
  }, [user, activeSessionId, initialContext]);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  const createNewSession = async (customTitle) => {
    if (!user) return;
    const sessId = `sess_${Date.now()}`;
    const newTitle = customTitle || (initialContext ? formatSessionTitle(initialContext) : `Pet - Consultation #${sessions.length + 1}`);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const newSess = {
      id: sessId,
      title: newTitle,
      date: dateStr,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'chats', user.uid, 'userSessions', sessId), newSess);
      setActiveSessionId(sessId);
      setActiveTab('chat');
      setShowHistoryModal(false);
    } catch (err) {
      console.error('Error creating chat session:', err);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user || !activeSessionId) return;

    const userText = inputText.trim();
    setInputText('');
    Keyboard.dismiss();
    setIsTyping(true);

    try {
      const messagesRef = collection(db, 'chats', user.uid, 'userSessions', activeSessionId, 'messages');
      await addDoc(messagesRef, {
        role: 'user',
        text: userText,
        timestamp: serverTimestamp(),
      });

      // Update session title if first user message and not set from scan
      const userMsgs = messages.filter((m) => m.role === 'user');
      if (userMsgs.length === 0 && (!currentSession || currentSession.title.includes('Consultation #'))) {
        const snippet = userText.length > 20 ? `${userText.substring(0, 20)}...` : userText;
        const autoTitle = `Pet - ${snippet}`;
        await setDoc(doc(db, 'chats', user.uid, 'userSessions', activeSessionId), {
          title: autoTitle,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      const history = messages.map((m) => ({ role: m.role, text: m.text }));
      history.push({ role: 'user', text: userText });
      const aiResponseText = await chatWithVet(history);

      await addDoc(messagesRef, {
        role: 'assistant',
        text: aiResponseText,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const currentSession = sessions.find((s) => s.id === activeSessionId);

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Image source={require('../../assets/dog-chathead.png')} style={styles.chatheadImg} />
          </View>
        )}
        <View style={[styles.messageContent, isUser ? styles.userContent : styles.aiContent]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header with History Tab & New Chat Buttons */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <View style={styles.headerAvatar}>
            <Image source={require('../../assets/dog-chathead.png')} style={styles.chatheadImg} />
            <View style={styles.onlineBadge} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>AI Vet Assistant</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {currentSession ? currentSession.title : 'Active Consultation'}
            </Text>
          </View>
        </View>

        {/* Action Controls (New Chat Button) */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => createNewSession()}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Segmented Tab Switcher: Chat vs History ── */}
      <View style={styles.tabSegmentContainer}>
        <TouchableOpacity
          style={[styles.tabSegmentBtn, activeTab === 'chat' && styles.tabSegmentBtnActive]}
          onPress={() => setActiveTab('chat')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chatbubbles"
            size={16}
            color={activeTab === 'chat' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabSegmentText, activeTab === 'chat' && styles.tabSegmentTextActive]}>
            Active Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabSegmentBtn, activeTab === 'history' && styles.tabSegmentBtnActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="time"
            size={16}
            color={activeTab === 'history' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabSegmentText, activeTab === 'history' && styles.tabSegmentTextActive]}>
            History ({sessions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Active Tab View ── */}
      {activeTab === 'chat' ? (
        /* Chat Area */
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
          />

          {isTyping && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>AI is typing...</Text>
            </View>
          )}

          {!isPremium && userMessageCount >= 5 ? (
            <View style={styles.chatLimitBanner}>
              <Ionicons name="warning" size={24} color={Colors.warning} />
              <Text style={styles.chatLimitText}>You've reached your free message limit for this session.</Text>
              <TouchableOpacity
                style={styles.chatLimitBtn}
                onPress={() => navigation.navigate('Paywall')}
              >
                <Text style={styles.chatLimitBtnText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ask about your pet..."
                placeholderTextColor={Colors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim() || isTyping}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      ) : (
        /* History Area */
        <View style={styles.historyTabContainer}>
          {/* Start New Chat Action Banner */}
          <TouchableOpacity
            style={styles.historyNewChatCard}
            onPress={() => createNewSession()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.historyNewChatGradient}
            >
              <View style={styles.historyNewChatIcon}>
                <Ionicons name="add-circle" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyNewChatTitle}>Start New Consultation</Text>
                <Text style={styles.historyNewChatSub}>Ask questions about a new symptom or pet</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.historySectionTitle}>Conversation History ({sessions.length})</Text>

          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.historyListContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isActive = item.id === activeSessionId;
              return (
                <TouchableOpacity
                  style={[styles.historyCard, isActive && styles.historyCardActive]}
                  onPress={() => {
                    setActiveSessionId(item.id);
                    setActiveTab('chat');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.historyCardIcon, isActive && styles.historyCardIconActive]}>
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={20}
                      color={isActive ? '#fff' : Colors.primary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.historyCardHeaderRow}>
                      <Text style={[styles.historyCardTitle, isActive && styles.historyCardTitleActive]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {isActive && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.historyCardDate}>
                      {item.date ? `Updated ${item.date}` : 'Recent Consultation'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {sessions.length > 1 && (
                      <TouchableOpacity
                        onPress={() => deleteSession(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
                      </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={isActive ? Colors.primary : Colors.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* ChatGPT-Style Side Drawer Chat History Overlay */}
      <Modal visible={showHistoryModal} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.drawerOverlay}
          activeOpacity={1}
          onPress={() => setShowHistoryModal(false)}
        >
          <TouchableOpacity
            style={styles.drawerSidebar}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle} numberOfLines={1}>
                {currentSession ? currentSession.title : 'Chat History'}
              </Text>
              <View style={styles.drawerHeaderIcons}>
                <Ionicons name="pin" size={16} color="#A1A1AA" style={{ marginRight: 8 }} />
                <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#A1A1AA" />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Chat Button */}
            <TouchableOpacity
              style={styles.drawerNewChatBtn}
              onPress={() => createNewSession()}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#ECECF1" />
              <Text style={styles.drawerNewChatText}>New chat</Text>
            </TouchableOpacity>

            {/* Chat Threads List */}
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.drawerListContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isActive = item.id === activeSessionId;
                return (
                  <TouchableOpacity
                    style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                    onPress={() => {
                      setActiveSessionId(item.id);
                      setShowHistoryModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isActive ? "chatbubble" : "chatbubble-outline"}
                      size={16}
                      color={isActive ? "#FFFFFF" : "#A1A1AA"}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[styles.drawerItemTitle, isActive && styles.drawerItemTitleActive]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    ...Shadows.md,
  },
  backBtn: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  chatheadImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: Colors.success,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  container: {
    flex: 1,
  },
  chatList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  chatLimitBanner: {
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    alignItems: 'center',
    gap: 8,
  },
  chatLimitText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  chatLimitBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  chatLimitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  
  // Messages
  messageBubble: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  messageContent: {
    padding: 14,
    borderRadius: 20,
    ...Shadows.sm,
  },
  userContent: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: 4,
  },
  aiContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: Colors.textPrimary,
  },

  // Input
  typingIndicator: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  typingText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    marginBottom: 2,
    ...Shadows.sm,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
  },

  // ChatGPT-Style Dark Side Drawer History Styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  headerHistoryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  drawerSidebar: {
    width: '78%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#171717',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 14,
    paddingBottom: 24,
    ...Shadows.lg,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  drawerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ECECF1',
    flex: 1,
    marginRight: 8,
  },
  drawerHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerNewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#202123',
    borderWidth: 1,
    borderColor: '#3E3F4B',
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  drawerNewChatText: {
    color: '#ECECF1',
    fontSize: 14,
    fontWeight: '600',
  },
  drawerListContent: {
    paddingVertical: 4,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  drawerItemActive: {
    backgroundColor: '#343541',
  },
  drawerItemTitle: {
    fontSize: 14,
    color: '#C5C5D2',
    flex: 1,
    fontWeight: '500',
  },
  drawerItemTitleActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Tab Segment Switcher Styles ──
  tabSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    gap: 8,
  },
  tabSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: BorderRadius.full || 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabSegmentBtnActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  tabSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabSegmentTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // ── History Tab View Styles ──
  historyTabContainer: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.background,
  },
  historyNewChatCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    ...Shadows.sm,
  },
  historyNewChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  historyNewChatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyNewChatTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  historyNewChatSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  historySectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  historyListContent: {
    paddingBottom: 24,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...Shadows.sm,
  },
  historyCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
  },
  historyCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCardIconActive: {
    backgroundColor: Colors.primary,
  },
  historyCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 3,
  },
  historyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  historyCardTitleActive: {
    color: Colors.primary,
  },
  activeBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  historyCardDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
