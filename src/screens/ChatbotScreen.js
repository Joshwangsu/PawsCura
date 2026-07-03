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
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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

  // Load History
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;
      try {
        const chatDocRef = doc(db, 'chats', user.uid);
        const docSnap = await getDoc(chatDocRef);
        
        let loadedMessages = [{
          id: '1',
          role: 'assistant',
          text: 'Hello! I am your AI Virtual Vet Assistant. I am here to help answer questions about your pet\'s health, behavior, and care. How can I assist you today?'
        }];

        if (docSnap.exists() && docSnap.data().messages?.length > 0) {
          loadedMessages = docSnap.data().messages;
        }

        // Append initialContext if we navigated from scan
        if (initialContext) {
          loadedMessages.push({
            id: Date.now().toString(),
            role: 'assistant',
            text: `I see you just ran a scan that suspected: **${initialContext.suspectedCondition}**.\n\nMy observations were: ${initialContext.analysis}\n\nDo you have any specific questions about this assessment or how to care for your pet?`
          });
          // Clear param so it doesn't run again on re-renders
          navigation.setParams({ initialContext: null });
        }

        setMessages(loadedMessages);
        setIsLoaded(true);
      } catch (error) {
        console.error("Error loading chat:", error);
        setIsLoaded(true);
      }
    };
    loadHistory();
  }, [user, initialContext]);

  // Sync to Firestore on messages change
  useEffect(() => {
    if (isLoaded && user && messages.length > 0) {
      const chatDocRef = doc(db, 'chats', user.uid);
      setDoc(chatDocRef, {
        messages: messages,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(err => console.log("Failed to sync chat", err));
    }
  }, [messages, isLoaded, user]);

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

    const newUserMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsTyping(true);

    try {
      // Send the entire conversation history context to Gemini
      const aiResponseText = await chatWithVet([...messages, newUserMessage]);
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: aiResponseText
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'I am sorry, I am having trouble connecting to my database right now. Please try again in a moment.'
      }]);
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
            <Text style={styles.headerSub}>Powered by Gemini</Text>
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
