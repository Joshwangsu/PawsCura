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
import { doc, setDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export default function ChatbotScreen({ route, navigation }) {
  const { initialContext } = route.params || {};
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const flatListRef = useRef(null);

  const userMessageCount = messages.filter(m => m.role === 'user').length;

  // Real-time listener for chat messages subcollection (Premium only)
  useEffect(() => {
    if (!user) return;

    if (!isPremium) {
      // Free users: load standard greeting locally
      setMessages([{
        id: '1',
        role: 'assistant',
        text: 'Hello! I am your AI Virtual Vet Assistant. I am here to help answer questions about your pet\'s health, behavior, and care. How can I assist you today?'
      }]);
      setIsLoaded(true);
      return;
    }

    // Ensure parent chat document exists
    const chatDocRef = doc(db, 'chats', user.uid);
    setDoc(chatDocRef, {
      id: user.uid,
      userId: user.uid,
      updatedAt: serverTimestamp()
    }, { merge: true }).catch(err => console.log("Failed to ensure chat doc", err));

    const q = query(collection(db, 'chats', user.uid, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let loadedMessages = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedMessages.push({
          id: docSnap.id,
          ...data
        });
      });

      // If absolutely no messages, seed default greeting
      if (loadedMessages.length === 0) {
        const defaultMsg = {
          role: 'assistant',
          text: 'Hello! I am your AI Virtual Vet Assistant. I am here to help answer questions about your pet\'s health, behavior, and care. How can I assist you today?',
          timestamp: serverTimestamp()
        };
        addDoc(collection(db, 'chats', user.uid, 'messages'), defaultMsg).catch(err => console.log(err));
      } else {
        setMessages(loadedMessages);
        setIsLoaded(true);
      }
    }, (error) => {
      console.error("Error loading chat messages subcollection:", error);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, [user, isPremium]);

  // Handle initial scan context once messages are loaded
  useEffect(() => {
    if (isLoaded && initialContext && user) {
      const text = `I see you just ran a scan that suspected: **${initialContext.suspectedCondition}**.\n\nMy observations were: ${initialContext.analysis}\n\nDo you have any specific questions about this assessment or how to care for your pet?`;
      
      if (isPremium) {
        const initMsg = {
          role: 'assistant',
          text: text,
          timestamp: serverTimestamp()
        };
        addDoc(collection(db, 'chats', user.uid, 'messages'), initMsg).catch(err => console.log(err));
      } else {
        // Free users: save locally
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          text: text
        }]);
      }
      navigation.setParams({ initialContext: null });
    }
  }, [isLoaded, initialContext, user, isPremium]);

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    setIsTyping(true);

    if (!isPremium) {
      // Free users: handle chat history in-memory only (do not write to Firestore)
      const newUserMsg = {
        id: Date.now().toString(),
        role: 'user',
        text: userText
      };
      setMessages(prev => [...prev, newUserMsg]);

      try {
        const history = [...messages, newUserMsg].map(m => ({ role: m.role, text: m.text }));
        const aiResponseText = await chatWithVet(history);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: aiResponseText
        }]);
      } catch (error) {
        console.error("Chat error (Free):", error);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: 'I am sorry, I am having trouble connecting right now. Please try again in a moment.'
        }]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Premium users: write user and AI messages to Firestore subcollection
    try {
      await addDoc(collection(db, 'chats', user.uid, 'messages'), {
        role: 'user',
        text: userText,
        timestamp: serverTimestamp()
      });

      const chatDocRef = doc(db, 'chats', user.uid);
      await setDoc(chatDocRef, { updatedAt: serverTimestamp() }, { merge: true });

      const history = messages.map(m => ({ role: m.role, text: m.text }));
      history.push({ role: 'user', text: userText });
      const aiResponseText = await chatWithVet(history);

      await addDoc(collection(db, 'chats', user.uid, 'messages'), {
        role: 'assistant',
        text: aiResponseText,
        timestamp: serverTimestamp()
      });

      await setDoc(chatDocRef, { updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error("Failed to send/receive chat message (Premium):", error);
      await addDoc(collection(db, 'chats', user.uid, 'messages'), {
        role: 'assistant',
        text: 'I am sorry, I am having trouble connecting right now. Please try again in a moment.',
        timestamp: serverTimestamp()
      });
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.aiBubble
      ]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Image 
              source={require('../../assets/dog-chathead.png')} 
              style={styles.chatheadImg}
            />
          </View>
        )}
        <View style={[
          styles.messageContent,
          isUser ? styles.userContent : styles.aiContent
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userText : styles.aiText
          ]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerAvatar}>
            <Image 
              source={require('../../assets/dog-chathead.png')} 
              style={styles.chatheadImg}
            />
            <View style={styles.onlineBadge} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Vet Assistant</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Chat Area */}
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
        />

        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>AI is typing...</Text>
          </View>
        )}

        {/* Input Box or Paywall Banner */}
        {(!isPremium && userMessageCount >= 5) ? (
          <View style={styles.chatLimitBanner}>
            <Ionicons name="warning" size={24} color={Colors.warning} />
            <Text style={styles.chatLimitText}>You've reached your free message limit for this scan.</Text>
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
  }
});
