import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import type { MessageData } from '../context/SocketContext';
import { api } from '../services/api';
import { stickerPacks, getRecentStickers, addRecentSticker, Sticker } from '../data/stickers';
import './ChatPage.css';

interface Profile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

interface SearchUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  lastSeen: string;
}

interface ChatParticipant {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  lastSeen: string;
}

interface ChatData {
  id: string;
  type: 'private' | 'group';
  participant: ChatParticipant | null;
  name?: string;
  description?: string;
  photoUrl?: string;
  participantCount?: number;
  unreadCount?: number;
  isPinned?: boolean;
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  sender?: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  type: string;
  status: string;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
    sender?: any;
  };
  forwardedFrom?: {
    chatId: string;
    messageId: string;
    senderName: string;
  };
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
}

export default function ChatPage() {
  const { user, logout } = useAuth();
  const { isConnected, isUserOnline, isUserTypingInChat, getUserLastSeen, joinChat, leaveChat, startTyping, stopTyping, onNewMessage, onMessagesRead, onMessageEdited, onMessageDeleted } = useSocket();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chats, setChats] = useState<ChatData[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [activeStickerPack, setActiveStickerPack] = useState('recent');
  const [recentStickers, setRecentStickers] = useState<Sticker[]>([]);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<SearchUser[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Reply feature
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  // Forward feature
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  // Edit feature
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);
  // Chat context menu
  const [chatContextMenu, setChatContextMenu] = useState<{ x: number; y: number; chat: ChatData } | null>(null);
  // Search messages
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageSearchResults, setMessageSearchResults] = useState<Message[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevChatIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stickerPickerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchChats();
    setRecentStickers(getRecentStickers());
    
    // Handle window resize for responsive
    const handleResize = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sticker picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stickerPickerRef.current && !stickerPickerRef.current.contains(e.target as Node)) {
        setShowStickerPicker(false);
      }
    };
    if (showStickerPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStickerPicker]);

  // Handle chat room joining/leaving and load messages
  useEffect(() => {
    if (prevChatIdRef.current && prevChatIdRef.current !== selectedChat?.id) {
      leaveChat(prevChatIdRef.current);
    }
    if (selectedChat?.id) {
      joinChat(selectedChat.id);
      prevChatIdRef.current = selectedChat.id;
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat?.id, joinChat, leaveChat]);

  // Listen for new messages
  useEffect(() => {
    const unsubscribe = onNewMessage((newMsg: MessageData) => {
      // Add message to current chat if it matches
      if (selectedChat && newMsg.chatId === selectedChat.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg as Message];
        });
        
        // Mark messages as read if chat is open and message is from other user
        if (newMsg.senderId !== profile?.id) {
          markMessagesAsRead(selectedChat.id);
        }
      }
      
      // Update chat list with new last message and unread count
      setChats(prev => prev.map(chat => {
        if (chat.id === newMsg.chatId) {
          // Increment unread count if message is from other user and chat is not selected
          const isCurrentChat = selectedChat?.id === newMsg.chatId;
          const isFromOther = newMsg.senderId !== profile?.id;
          const newUnreadCount = (!isCurrentChat && isFromOther) 
            ? (chat.unreadCount || 0) + 1 
            : chat.unreadCount;

          return {
            ...chat,
            lastMessage: {
              text: newMsg.text,
              senderId: newMsg.senderId,
              createdAt: newMsg.createdAt
            },
            unreadCount: newUnreadCount,
            updatedAt: newMsg.createdAt
          };
        }
        return chat;
      }));
    });

    return unsubscribe;
  }, [onNewMessage, selectedChat, profile?.id]);

  // Listen for messages read event
  useEffect(() => {
    const unsubscribe = onMessagesRead((data) => {
      // Update message statuses to 'read'
      if (selectedChat && data.chatId === selectedChat.id) {
        setMessages(prev => prev.map(msg => {
          if (msg.senderId === profile?.id && msg.status !== 'read') {
            return { ...msg, status: 'read' };
          }
          return msg;
        }));
      }
    });

    return unsubscribe;
  }, [onMessagesRead, selectedChat, profile?.id]);

  // Listen for message edited event
  useEffect(() => {
    const unsubscribe = onMessageEdited((data) => {
      if (selectedChat && data.chatId === selectedChat.id) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            return { ...msg, text: data.text, isEdited: true };
          }
          return msg;
        }));
      }
    });
    return unsubscribe;
  }, [onMessageEdited, selectedChat]);

  // Listen for message deleted event
  useEffect(() => {
    const unsubscribe = onMessageDeleted((data) => {
      if (selectedChat && data.chatId === selectedChat.id) {
        if (data.forEveryone) {
          setMessages(prev => prev.map(msg => {
            if (msg.id === data.messageId) {
              return { ...msg, text: 'This message was deleted', isDeleted: true };
            }
            return msg;
          }));
        }
      }
    });
    return unsubscribe;
  }, [onMessageDeleted, selectedChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile/me');
      setProfile(response.data.data);
    } catch (err) {
      console.error('Failed to fetch profile');
    }
  };

  const fetchChats = async () => {
    try {
      setLoadingChats(true);
      const response = await api.get('/chat/my');
      setChats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch chats');
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      setLoadingMessages(true);
      const response = await api.get(`/messages/${chatId}`);
      setMessages(response.data.data);
      // Mark messages as read when opening chat
      markMessagesAsRead(chatId);
    } catch (err) {
      console.error('Failed to fetch messages');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const markMessagesAsRead = async (chatId: string) => {
    try {
      await api.post('/messages/read', { chatId });
    } catch (err) {
      console.error('Failed to mark messages as read');
    }
  };

  const searchUsers = async (query: string) => {
    try {
      const response = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
      setSearchResults(response.data.data);
    } catch (err) {
      console.error('Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const getDisplayName = (u?: { firstName?: string; lastName?: string; username?: string } | null) => {
    const target = u || profile;
    if (target?.firstName || target?.lastName) {
      return `${target.firstName || ''} ${target.lastName || ''}`.trim();
    }
    return target?.username || user?.username || 'User';
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat || sendingMessage) return;
    
    // If replying, use reply endpoint
    if (replyingTo) {
      await sendReplyMessage();
      return;
    }
    
    const messageText = message.trim();
    setMessage('');
    setSendingMessage(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping(selectedChat.id);

    try {
      await api.post('/messages/send', {
        chatId: selectedChat.id,
        text: messageText
      });
      // Message will be added via socket event
    } catch (err) {
      console.error('Failed to send message');
      setMessage(messageText); // Restore message on error
    } finally {
      setSendingMessage(false);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    if (selectedChat && e.target.value.trim()) {
      startTyping(selectedChat.id);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedChat.id);
      }, 2000);
    } else if (selectedChat) {
      stopTyping(selectedChat.id);
    }
  };

  const getOnlineStatus = useCallback((userId: string | undefined) => {
    if (!userId) return false;
    return isUserOnline(userId);
  }, [isUserOnline]);

  const getTypingStatus = useCallback((chatId: string, userId: string | undefined) => {
    if (!userId) return false;
    return isUserTypingInChat(chatId, userId);
  }, [isUserTypingInChat]);

  const handleSelectUser = async (searchUser: SearchUser) => {
    try {
      const response = await api.post('/chat/create', {
        participantId: searchUser.id,
        type: 'private'
      });
      
      const chatData = response.data.data;
      
      setChats(prev => {
        const exists = prev.find(c => c.id === chatData.id);
        if (exists) return prev;
        return [chatData, ...prev];
      });
      
      setSelectedChat(chatData);
      setSearchQuery('');
      setSearchResults([]);
      setSearchFocused(false);
    } catch (err) {
      console.error('Failed to create chat');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const isMyMessage = (msg: Message) => {
    return msg.senderId === profile?.id || msg.sender?._id === profile?.id;
  };

  const handleSendSticker = async (sticker: Sticker) => {
    if (!selectedChat || sendingMessage) return;
    
    setSendingMessage(true);
    setShowStickerPicker(false);
    addRecentSticker(sticker);
    setRecentStickers(getRecentStickers());

    try {
      await api.post('/messages/send', {
        chatId: selectedChat.id,
        text: sticker.emoji,
        type: 'sticker'
      });
    } catch (err) {
      console.error('Failed to send sticker');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleSendImage = async () => {
    if (!selectedChat || !selectedImage || uploadingImage) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('chatId', selectedChat.id);
    formData.append('caption', message.trim());

    try {
      await api.post('/messages/send-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      handleCancelImage();
      setMessage('');
    } catch (err) {
      console.error('Failed to send image');
      alert('Failed to send image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        alert('Video size must be less than 100MB');
        return;
      }
      setSelectedVideo(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const handleCancelVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setSelectedVideo(null);
    setVideoPreview(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleSendVideo = async () => {
    if (!selectedChat || !selectedVideo || uploadingVideo) return;

    setUploadingVideo(true);
    const formData = new FormData();
    formData.append('video', selectedVideo);
    formData.append('chatId', selectedChat.id);
    formData.append('caption', message.trim());

    try {
      await api.post('/messages/send-video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      handleCancelVideo();
      setMessage('');
    } catch (err) {
      console.error('Failed to send video');
      alert('Failed to send video. Please try again.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendFile = async () => {
    if (!selectedChat || !selectedFile || uploadingFile) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('chatId', selectedChat.id);
    formData.append('caption', message.trim());

    try {
      await api.post('/messages/send-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      handleCancelFile();
      setMessage('');
    } catch (err) {
      console.error('Failed to send file');
      alert('Failed to send file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc': case 'docx': return '📝';
      case 'xls': case 'xlsx': return '📊';
      case 'ppt': case 'pptx': return '📑';
      case 'zip': case 'rar': case '7z': return '📦';
      case 'txt': return '📃';
      case 'json': return '📋';
      default: return '📎';
    }
  };

  const handleBackToChats = () => {
    setSelectedChat(null);
  };

  const handleSelectChat = (chat: ChatData) => {
    setSelectedChat(chat);
    // Clear unread count when selecting chat
    if (chat.unreadCount && chat.unreadCount > 0) {
      setChats(prev => prev.map(c => 
        c.id === chat.id ? { ...c, unreadCount: 0 } : c
      ));
    }
  };

  // Group chat functions
  const searchMembers = async (query: string) => {
    if (!query.trim()) {
      setMemberSearchResults([]);
      return;
    }
    try {
      const response = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
      // Filter out already selected members
      const filtered = response.data.data.filter(
        (u: SearchUser) => !selectedMembers.some(m => m.id === u.id) && u.id !== profile?.id
      );
      setMemberSearchResults(filtered);
    } catch (err) {
      console.error('Search failed');
    }
  };

  const handleAddMember = (user: SearchUser) => {
    setSelectedMembers(prev => [...prev, user]);
    setMemberSearchQuery('');
    setMemberSearchResults([]);
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0 || creatingGroup) return;

    setCreatingGroup(true);
    try {
      const response = await api.post('/chat/group/create', {
        name: groupName.trim(),
        description: groupDescription.trim(),
        participantIds: selectedMembers.map(m => m.id)
      });

      const newGroup = response.data.data;
      setChats(prev => [newGroup, ...prev]);
      setSelectedChat(newGroup);
      
      // Reset form
      setShowCreateGroup(false);
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      setShowSidebar(false);
    } catch (err) {
      console.error('Failed to create group');
      alert('Failed to create group. Please try again.');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await sendVoiceMessage(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      audioChunksRef.current = [];
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!selectedChat) return;

    const formData = new FormData();
    formData.append('voice', audioBlob, 'voice.webm');
    formData.append('chatId', selectedChat.id);
    formData.append('duration', recordingTime.toString());

    try {
      await api.post('/messages/send-voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (err) {
      console.error('Failed to send voice message');
      alert('Failed to send voice message');
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Reply function
  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
    setContextMenu(null);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const sendReplyMessage = async () => {
    if (!message.trim() || !selectedChat || !replyingTo || sendingMessage) return;

    const messageText = message.trim();
    setMessage('');
    setSendingMessage(true);

    try {
      await api.post('/messages/reply', {
        chatId: selectedChat.id,
        text: messageText,
        replyToId: replyingTo.id
      });
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed to send reply');
      setMessage(messageText);
    } finally {
      setSendingMessage(false);
    }
  };

  // Forward function
  const handleForward = (msg: Message) => {
    setForwardingMessage(msg);
    setShowForwardModal(true);
    setContextMenu(null);
  };

  const forwardToChat = async (chatId: string) => {
    if (!forwardingMessage) return;

    try {
      await api.post('/messages/forward', {
        messageId: forwardingMessage.id,
        toChatId: chatId
      });
      setShowForwardModal(false);
      setForwardingMessage(null);
    } catch (err) {
      console.error('Failed to forward message');
      alert('Failed to forward message');
    }
  };

  // Edit function
  const handleEdit = (msg: Message) => {
    setEditingMessage(msg);
    setEditText(msg.text);
    setContextMenu(null);
  };

  const saveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;

    try {
      await api.put(`/messages/edit/${editingMessage.id}`, {
        text: editText.trim()
      });
      setMessages(prev => prev.map(msg => 
        msg.id === editingMessage.id ? { ...msg, text: editText.trim(), isEdited: true } : msg
      ));
      setEditingMessage(null);
      setEditText('');
    } catch (err: any) {
      console.error('Failed to edit message');
      alert(err.response?.data?.error?.message || 'Failed to edit message');
    }
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  // Delete function
  const handleDelete = async (msg: Message, forEveryone: boolean) => {
    try {
      await api.delete(`/messages/delete/${msg.id}?forEveryone=${forEveryone}`);
      if (forEveryone) {
        setMessages(prev => prev.map(m => 
          m.id === msg.id ? { ...m, text: 'This message was deleted', isDeleted: true } : m
        ));
      } else {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
      }
      setContextMenu(null);
    } catch (err) {
      console.error('Failed to delete message');
      alert('Failed to delete message');
    }
  };

  // Context menu
  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    if (msg.isDeleted) return;
    setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
  };

  // Search messages
  const searchMessages = async (query: string) => {
    if (!selectedChat || !query.trim()) {
      setMessageSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/messages/search/${selectedChat.id}?query=${encodeURIComponent(query)}`);
      setMessageSearchResults(response.data.data);
    } catch (err) {
      console.error('Search failed');
    }
  };

  // Pin chat
  const handlePinChat = async (chatId: string, isPinned: boolean) => {
    try {
      if (isPinned) {
        await api.post(`/chat/${chatId}/unpin`);
      } else {
        await api.post(`/chat/${chatId}/pin`);
      }
      fetchChats();
    } catch (err) {
      console.error('Failed to pin/unpin chat');
    }
  };

  const getChatDisplayName = (chat: ChatData) => {
    if (chat.type === 'group') {
      return chat.name || 'Group';
    }
    return getDisplayName(chat.participant);
  };

  const getChatAvatar = (chat: ChatData) => {
    if (chat.type === 'group') {
      return chat.photoUrl;
    }
    return chat.participant?.photoUrl;
  };

  return (
    <div className={`chat-app ${selectedChat && isMobileView ? 'chat-open' : ''}`}>
      {!isConnected && (
        <div className="connection-status disconnected">
          Connecting to server...
        </div>
      )}

      {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />}

      <div className={`sidebar-menu ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-profile" onClick={() => { navigate('/profile'); setShowSidebar(false); }}>
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Profile" className="sidebar-avatar" />
            ) : (
              <div className="sidebar-avatar-placeholder">
                {getInitial(getDisplayName())}
              </div>
            )}
            <div className="sidebar-user-info">
              <span className="sidebar-name">{getDisplayName()}</span>
              <span className="sidebar-username">@{profile?.username || user?.username}</span>
            </div>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <button className="sidebar-item" onClick={() => { navigate('/profile'); setShowSidebar(false); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>My Profile</span>
          </button>
          <button className="sidebar-item" onClick={() => { setShowCreateGroup(true); setShowSidebar(false); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>New Group</span>
          </button>
          <button className="sidebar-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            <span>Contacts</span>
          </button>
          <button className="sidebar-item" onClick={() => { navigate('/settings'); setShowSidebar(false); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Settings</span>
          </button>
          <div className="sidebar-divider" />
          <button className="sidebar-item logout" onClick={logout}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Log Out</span>
          </button>
        </nav>
      </div>

      <div className="chat-list-panel">
        <div className="chat-list-header">
          <button className="menu-btn" onClick={() => setShowSidebar(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className={`search-box ${searchFocused ? 'focused' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={clearSearch}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {(searchQuery || searchResults.length > 0) && (
          <div className="search-results">
            {isSearching ? (
              <div className="search-loading">
                <div className="loading-spinner small"></div>
                <span>Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="search-results-header">
                  <span>Global Search</span>
                </div>
                {searchResults.map((searchUser) => (
                  <div key={searchUser.id} className="search-result-item" onClick={() => handleSelectUser(searchUser)}>
                    <div className="chat-avatar">
                      {searchUser.photoUrl ? (
                        <img src={searchUser.photoUrl} alt={searchUser.username} />
                      ) : (
                        <div className="avatar-placeholder" style={{ background: 'var(--tg-secondary)' }}>
                          {getInitial(getDisplayName(searchUser))}
                        </div>
                      )}
                    </div>
                    <div className="search-result-info">
                      <span className="search-result-name">{getDisplayName(searchUser)}</span>
                      <span className="search-result-username">@{searchUser.username}</span>
                    </div>
                  </div>
                ))}
              </>
            ) : searchQuery.trim() ? (
              <div className="no-results">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <p>No users found for "{searchQuery}"</p>
              </div>
            ) : null}
          </div>
        )}

        {!searchQuery && (
          <div className="chat-list">
            {loadingChats ? (
              <div className="chat-list-loading">
                <div className="loading-spinner"></div>
              </div>
            ) : chats.length === 0 ? (
              <div className="no-chats">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p>No chats yet</p>
                <span>Search for users to start chatting</span>
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                  onClick={() => handleSelectChat(chat)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setChatContextMenu({ x: e.clientX, y: e.clientY, chat });
                  }}
                >
                  <div className="chat-avatar">
                    {getChatAvatar(chat) ? (
                      <img src={getChatAvatar(chat)!} alt={getChatDisplayName(chat)} />
                    ) : (
                      <div className="avatar-placeholder" style={{ background: chat.type === 'group' ? '#5eb5f7' : 'var(--tg-secondary)' }}>
                        {chat.type === 'group' ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                        ) : getInitial(getChatDisplayName(chat))}
                      </div>
                    )}
                    {chat.type === 'private' && getOnlineStatus(chat.participant?.id) && <span className="online-dot" />}
                  </div>
                  <div className="chat-info">
                    <div className="chat-top">
                      <span className="chat-name">
                        {chat.isPinned && (
                          <span className="pin-indicator">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                            </svg>
                          </span>
                        )}
                        {getChatDisplayName(chat)}
                      </span>
                      <span className="chat-time">{formatTime(chat.updatedAt)}</span>
                    </div>
                    <div className="chat-bottom">
                      <span className="chat-last-message">
                        {chat.type === 'private' && getTypingStatus(chat.id, chat.participant?.id) 
                          ? <span className="typing-text">typing...</span>
                          : chat.lastMessage?.text || (chat.type === 'group' ? `${chat.participantCount} members` : 'Start a conversation')}
                      </span>
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <span className="unread-badge">{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <button className="new-chat-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>


      <div className="chat-area">
        {selectedChat ? (
          <>
            <div className="chat-area-header">
              {isMobileView && (
                <button className="back-btn-mobile" onClick={handleBackToChats}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
              )}
              <div className="chat-area-info">
                <div className="chat-avatar small">
                  {getChatAvatar(selectedChat) ? (
                    <img src={getChatAvatar(selectedChat)!} alt={getChatDisplayName(selectedChat)} />
                  ) : (
                    <div className="avatar-placeholder" style={{ background: selectedChat.type === 'group' ? '#5eb5f7' : 'var(--tg-secondary)' }}>
                      {selectedChat.type === 'group' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      ) : getInitial(getChatDisplayName(selectedChat))}
                    </div>
                  )}
                  {selectedChat.type === 'private' && getOnlineStatus(selectedChat.participant?.id) && <span className="online-dot small" />}
                </div>
                <div>
                  <h3>{getChatDisplayName(selectedChat)}</h3>
                  <span className={`status ${selectedChat.type === 'private' && getOnlineStatus(selectedChat.participant?.id) ? 'online' : ''}`}>
                    {selectedChat.type === 'group' 
                      ? `${selectedChat.participantCount} members`
                      : getTypingStatus(selectedChat.id, selectedChat.participant?.id)
                        ? 'typing...'
                        : getOnlineStatus(selectedChat.participant?.id)
                          ? 'online'
                          : getUserLastSeen(selectedChat.participant?.id || '')
                            ? `last seen ${formatTime(getUserLastSeen(selectedChat.participant?.id || '') || '')}`
                            : selectedChat.participant?.lastSeen 
                              ? `last seen ${formatTime(selectedChat.participant.lastSeen)}`
                              : 'last seen recently'}
                  </span>
                </div>
              </div>
              <div className="chat-area-actions">
                <button className="icon-btn" onClick={() => setShowMessageSearch(!showMessageSearch)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </button>
                <button className="icon-btn">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="19" cy="12" r="1"/>
                    <circle cx="5" cy="12" r="1"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="messages-area">
              {loadingMessages ? (
                <div className="messages-loading">
                  <div className="loading-spinner"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`message-bubble ${isMyMessage(msg) ? 'sent' : 'received'}${msg.type === 'sticker' ? ' sticker' : ''}${msg.type === 'image' ? ' image-message' : ''}${msg.type === 'video' ? ' video-message' : ''}${msg.type === 'file' ? ' file-message' : ''}${msg.type === 'voice' ? ' voice-message' : ''}${msg.isDeleted ? ' deleted' : ''}`}
                      onContextMenu={(e) => handleContextMenu(e, msg)}
                    >
                      {/* Forwarded label */}
                      {msg.forwardedFrom && (
                        <div className="forwarded-label">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 11l-7-7v4C7 8 4 14 3 19c2.5-3.5 6-5.1 11-5.1V18l7-7z"/>
                          </svg>
                          <span>Forwarded from {msg.forwardedFrom.senderName}</span>
                        </div>
                      )}
                      {/* Reply preview */}
                      {msg.replyTo && (
                        <div className="message-reply">
                          <div className="message-reply-name">
                            {msg.replyTo.sender?.firstName || msg.replyTo.sender?.username || 'User'}
                          </div>
                          <div className="message-reply-text">{msg.replyTo.text}</div>
                        </div>
                      )}
                      {/* Voice message */}
                      {msg.type === 'voice' && msg.voiceUrl && (
                        <div className="voice-player">
                          <audio controls src={`http://localhost:3000${msg.voiceUrl}`} style={{ height: 36, width: '100%' }} />
                        </div>
                      )}
                      {msg.type === 'image' && msg.imageUrl && (
                        <div className="message-image">
                          <img src={`http://localhost:3000${msg.imageUrl}`} alt="Shared" onClick={() => window.open(`http://localhost:3000${msg.imageUrl}`, '_blank')} />
                        </div>
                      )}
                      {msg.type === 'video' && msg.videoUrl && (
                        <div className="message-video">
                          <video controls preload="metadata">
                            <source src={`http://localhost:3000${msg.videoUrl}`} type="video/mp4" />
                            Your browser does not support video.
                          </video>
                        </div>
                      )}
                      {msg.type === 'file' && msg.fileUrl && (
                        <a href={`http://localhost:3000${msg.fileUrl}`} download={msg.fileName} className="message-file" target="_blank" rel="noopener noreferrer">
                          <div className="file-icon">{getFileIcon(msg.fileName || 'file')}</div>
                          <div className="file-info">
                            <span className="file-name">{msg.fileName}</span>
                            <span className="file-size">{formatFileSize(msg.fileSize || 0)}</span>
                          </div>
                          <div className="file-download">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7 10 12 15 17 10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                          </div>
                        </a>
                      )}
                      {(msg.type !== 'image' && msg.type !== 'video' && msg.type !== 'file' && msg.type !== 'voice') || (msg.text && msg.text !== '📷 Photo' && msg.text !== '🎬 Video' && msg.text !== '🎤 Voice message' && !msg.text.startsWith('📎')) ? <p>{msg.text}</p> : null}
                      <span className="message-time">
                        {msg.isEdited && <span className="edited-label">edited</span>}
                        {formatTime(msg.createdAt)}
                        {isMyMessage(msg) && (
                          <span className={`message-status ${msg.status === 'read' ? 'read' : ''}`}>
                            {msg.status === 'read' ? (
                              <svg className="check-icon double" viewBox="0 0 16 11" width="16" height="11">
                                <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .512.203.646.646 0 0 0 .496-.203l6.793-8.385a.495.495 0 0 0 .102-.381.408.408 0 0 0-.178-.305l-.351-.285z" fill="currentColor"/>
                                <path d="M14.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.136-.406.503 1.885 1.885a.724.724 0 0 0 .512.203.646.646 0 0 0 .496-.203l6.793-8.385a.495.495 0 0 0 .102-.381.408.408 0 0 0-.178-.305l-.351-.285z" fill="currentColor"/>
                              </svg>
                            ) : (
                              <svg className="check-icon single" viewBox="0 0 12 11" width="12" height="11">
                                <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .512.203.646.646 0 0 0 .496-.203l6.793-8.385a.495.495 0 0 0 .102-.381.408.408 0 0 0-.178-.305l-.351-.285z" fill="currentColor"/>
                              </svg>
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="image-preview-container">
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button className="image-preview-close" onClick={handleCancelImage}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div className="image-preview-actions">
                  <input
                    type="text"
                    placeholder="Add a caption..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendImage()}
                  />
                  <button className="send-btn" onClick={handleSendImage} disabled={uploadingImage}>
                    {uploadingImage ? (
                      <div className="loading-spinner small"></div>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Video Preview */}
            {videoPreview && (
              <div className="video-preview-container">
                <div className="video-preview">
                  <video src={videoPreview} controls />
                  <button className="video-preview-close" onClick={handleCancelVideo}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div className="video-preview-actions">
                  <input
                    type="text"
                    placeholder="Add a caption..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendVideo()}
                  />
                  <button className="send-btn" onClick={handleSendVideo} disabled={uploadingVideo}>
                    {uploadingVideo ? (
                      <div className="loading-spinner small"></div>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* File Preview */}
            {selectedFile && (
              <div className="file-preview-container">
                <div className="file-preview">
                  <div className="file-preview-icon">{getFileIcon(selectedFile.name)}</div>
                  <div className="file-preview-info">
                    <span className="file-preview-name">{selectedFile.name}</span>
                    <span className="file-preview-size">{formatFileSize(selectedFile.size)}</span>
                  </div>
                  <button className="file-preview-close" onClick={handleCancelFile}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div className="file-preview-actions">
                  <input
                    type="text"
                    placeholder="Add a caption..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendFile()}
                  />
                  <button className="send-btn" onClick={handleSendFile} disabled={uploadingFile}>
                    {uploadingFile ? (
                      <div className="loading-spinner small"></div>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Reply Preview */}
            {replyingTo && (
              <div className="reply-preview">
                <div className="reply-preview-content">
                  <div className="reply-preview-name">
                    {replyingTo.sender?.firstName || replyingTo.sender?.username || 'User'}
                  </div>
                  <div className="reply-preview-text">{replyingTo.text}</div>
                </div>
                <button className="reply-preview-close" onClick={cancelReply}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            <div className="message-input-area" style={{ display: imagePreview || videoPreview || selectedFile ? 'none' : 'flex' }}>
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={videoInputRef}
                accept="video/*"
                onChange={handleVideoSelect}
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Send file">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <button className="icon-btn" onClick={() => imageInputRef.current?.click()} title="Send image">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>
              <button className="icon-btn" onClick={() => videoInputRef.current?.click()} title="Send video">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              </button>
              <input
                type="text"
                placeholder="Write a message..."
                value={message}
                onChange={handleMessageChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={sendingMessage}
              />
              <div className="sticker-picker-container" ref={stickerPickerRef}>
                <button className={`icon-btn sticker-btn ${showStickerPicker ? 'active' : ''}`} onClick={() => setShowStickerPicker(!showStickerPicker)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>
                
                {showStickerPicker && (
                  <div className="sticker-picker">
                    <div className="sticker-tabs">
                      <button className={`sticker-tab ${activeStickerPack === 'recent' ? 'active' : ''}`} onClick={() => setActiveStickerPack('recent')}>🕐</button>
                      {stickerPacks.map(pack => (
                        <button key={pack.id} className={`sticker-tab ${activeStickerPack === pack.id ? 'active' : ''}`} onClick={() => setActiveStickerPack(pack.id)}>{pack.icon}</button>
                      ))}
                    </div>
                    <div className="sticker-grid">
                      {activeStickerPack === 'recent' ? (
                        recentStickers.length > 0 ? (
                          recentStickers.map(sticker => (
                            <button key={sticker.id} className="sticker-item" onClick={() => handleSendSticker(sticker)}>{sticker.emoji}</button>
                          ))
                        ) : (
                          <div className="no-recent-stickers">No recent stickers</div>
                        )
                      ) : (
                        stickerPacks.find(p => p.id === activeStickerPack)?.stickers.map(sticker => (
                          <button key={sticker.id} className="sticker-item" onClick={() => handleSendSticker(sticker)}>{sticker.emoji}</button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {isRecording ? (
                <>
                  <div className="recording-indicator">
                    <span className="recording-dot"></span>
                    <span className="recording-time">{formatRecordingTime(recordingTime)}</span>
                    <button className="recording-cancel" onClick={cancelRecording}>Cancel</button>
                  </div>
                  <button className="send-btn" onClick={stopRecording}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </>
              ) : message.trim() ? (
                <button className="send-btn" onClick={handleSendMessage} disabled={sendingMessage}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              ) : (
                <button className="icon-btn mic-btn" onClick={startRecording}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-icon">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h2>Select a chat to start messaging</h2>
            <p>Choose from your existing conversations or search for users</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="context-menu-overlay" onClick={() => setContextMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
          <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <button className="context-menu-item" onClick={() => handleReply(contextMenu.message)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10l7-7v4c8 0 12 6 13 13-2-4-6-6-13-6v4l-7-7z"/>
              </svg>
              Reply
            </button>
            <button className="context-menu-item" onClick={() => handleForward(contextMenu.message)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11l-7-7v4C7 8 4 14 3 19c2.5-3.5 6-5.1 11-5.1V18l7-7z"/>
              </svg>
              Forward
            </button>
            {isMyMessage(contextMenu.message) && contextMenu.message.type === 'text' && (
              <button className="context-menu-item" onClick={() => handleEdit(contextMenu.message)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
            )}
            <div className="context-menu-divider" />
            {isMyMessage(contextMenu.message) && (
              <button className="context-menu-item danger" onClick={() => handleDelete(contextMenu.message, true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Delete for everyone
              </button>
            )}
            <button className="context-menu-item danger" onClick={() => handleDelete(contextMenu.message, false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Delete for me
            </button>
          </div>
        </>
      )}

      {/* Chat Context Menu */}
      {chatContextMenu && (
        <>
          <div className="context-menu-overlay" onClick={() => setChatContextMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
          <div className="context-menu" style={{ top: chatContextMenu.y, left: chatContextMenu.x }}>
            <button className="context-menu-item" onClick={() => {
              handlePinChat(chatContextMenu.chat.id, chatContextMenu.chat.isPinned || false);
              setChatContextMenu(null);
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
              </svg>
              {chatContextMenu.chat.isPinned ? 'Unpin' : 'Pin'}
            </button>
          </div>
        </>
      )}

      {/* Forward Modal */}
      {showForwardModal && forwardingMessage && (
        <div className="modal-overlay" onClick={() => { setShowForwardModal(false); setForwardingMessage(null); }}>
          <div className="forward-modal" onClick={(e) => e.stopPropagation()}>
            <div className="forward-modal-header">
              <button onClick={() => { setShowForwardModal(false); setForwardingMessage(null); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <h3>Forward to...</h3>
            </div>
            <div className="forward-chat-list">
              {chats.map(chat => (
                <div key={chat.id} className="forward-chat-item" onClick={() => forwardToChat(chat.id)}>
                  <div className="chat-avatar small">
                    {getChatAvatar(chat) ? (
                      <img src={getChatAvatar(chat)!} alt={getChatDisplayName(chat)} />
                    ) : (
                      <div className="avatar-placeholder" style={{ background: chat.type === 'group' ? '#5eb5f7' : 'var(--tg-secondary)' }}>
                        {getInitial(getChatDisplayName(chat))}
                      </div>
                    )}
                  </div>
                  <span className="chat-name">{getChatDisplayName(chat)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMessage && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit message</h3>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
            />
            <div className="edit-modal-actions">
              <button className="cancel-btn" onClick={cancelEdit}>Cancel</button>
              <button className="save-btn" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Message Search Panel */}
      {showMessageSearch && selectedChat && (
        <div className="message-search-panel">
          <div className="message-search-input">
            <input
              type="text"
              placeholder="Search messages..."
              value={messageSearchQuery}
              onChange={(e) => {
                setMessageSearchQuery(e.target.value);
                searchMessages(e.target.value);
              }}
              autoFocus
            />
          </div>
          <div className="message-search-results">
            {messageSearchResults.map(msg => (
              <div key={msg.id} className="message-search-result">
                <div className="message-search-result-text">{msg.text}</div>
                <div className="message-search-result-meta">{formatTime(msg.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="modal-overlay" onClick={() => setShowCreateGroup(false)}>
          <div className="create-group-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="modal-close" onClick={() => setShowCreateGroup(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <h2>New Group</h2>
              <button 
                className="modal-create" 
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0 || creatingGroup}
              >
                {creatingGroup ? 'Creating...' : 'Create'}
              </button>
            </div>

            <div className="modal-body">
              <div className="group-info-section">
                <div className="group-avatar-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div className="group-inputs">
                  <input
                    type="text"
                    placeholder="Group Name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    maxLength={100}
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    maxLength={500}
                  />
                </div>
              </div>

              <div className="members-section">
                <div className="section-label">Add Members</div>
                
                {selectedMembers.length > 0 && (
                  <div className="selected-members">
                    {selectedMembers.map(member => (
                      <div key={member.id} className="selected-member-chip">
                        <span>{member.firstName || member.username}</span>
                        <button onClick={() => handleRemoveMember(member.id)}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="member-search">
                  <input
                    type="text"
                    placeholder="Search users to add..."
                    value={memberSearchQuery}
                    onChange={(e) => {
                      setMemberSearchQuery(e.target.value);
                      searchMembers(e.target.value);
                    }}
                  />
                </div>

                {memberSearchResults.length > 0 && (
                  <div className="member-search-results">
                    {memberSearchResults.map(user => (
                      <div key={user.id} className="member-result-item" onClick={() => handleAddMember(user)}>
                        <div className="member-avatar">
                          {user.photoUrl ? (
                            <img src={user.photoUrl} alt={user.username} />
                          ) : (
                            <div className="avatar-placeholder">
                              {(user.firstName || user.username).charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="member-info">
                          <span className="member-name">{user.firstName || user.username} {user.lastName || ''}</span>
                          <span className="member-username">@{user.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
