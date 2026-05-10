import { useState, useEffect, useRef } from 'react';
import { Send, Smile, Paperclip, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import socket from '../socket/socket';
  const ChatBox = () =>{
    const { user } = useAuth();
const [users, setUsers] = useState([]);
const [activeUser, setActiveUser] = useState(null);

  const [messages, setMessages] = useState([]); 
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);

// Check User List
  useEffect(() => {
  fetch("http://localhost:3000/api/auth/users") 
    .then(res => {
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log("Fetched Data:", data);
      const formatted = data.map(u => ({
        id: u.id,
        name: u.first_name,
        position: u.position || "Staff",
        role: u.role || '',
        status: "online",
        lastSeen: "Active now",
        avatar: (u.first_name || "U")[0].toUpperCase(),
        color: u.role === "admin"
          ? "from-red-400 to-orange-500"
          : "from-indigo-400 to-purple-500"
      }));
      setUsers(formatted);
    })
    .catch(err => {
      console.error("User list failed to load:", err);
      setUsers([]); 
    });
}, []);

// Chat History:
useEffect(() => {
    if (user?.id) {
      // Use receiver 0 for group chat
      fetch(`http://localhost:3000/api/chat/history/${user.id}/0`)
        .then(res => res.json())
        .then(data => {
          const history = data.map(m => ({
            id: m.id,
            text: m.message,
            senderId: m.sender_id,
            senderName: m.first_name,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            avatar: (m.first_name || "U")[0].toUpperCase(),
            color: m.sender_id === user.id ? "from-indigo-600 to-purple-600" : "from-gray-400 to-gray-500"
          }));
          setMessages(history);
        });
    }
  }, [user]);

// 
useEffect(() => {
  socket.on("receive_message", msg => {
    setMessages(prev => [...prev, msg]);
  });

  return () => socket.off("receive_message");
}, []);



//   Socket Connection:
useEffect(() => {
    if (user?.id) {
      socket.emit("join", user.id);
    }

    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, [user]);

//   Handle :
const handleSend = async () => {
    if (!message.trim() || !user) return;

    const tempId = Date.now();
    const messageData = {
      senderId: user.id,
      receiverId: 0, 
      text: message,
      senderName: user.name,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: user.name ? user.name[0] : "U",
      color: "from-indigo-600 to-purple-600"
    };

    socket.emit("send_message", messageData);

    setMessages(prev => [...prev, { ...messageData, id: tempId }]);
    setMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
 
//  Handle 
const handleFileSend = async (e) => {
  const file = e.target.files[0];
  if (!file || !user) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("sender_id", user.id);
  formData.append("receiver_id", 0);

  try {
    const res = await fetch("http://localhost:3000/api/chat/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    const fileMsg = {
      id: data.id,
      text: data.filename,
      senderId: user.id,
      senderName: user.name,
      type: "file",
      time: new Date().toLocaleTimeString(),
      avatar: user.name[0],
      color: "from-indigo-600 to-purple-600"
    };

    socket.emit("send_message", fileMsg);
    setMessages(prev => [...prev, fileMsg]);

  } catch (err) {
    alert("Upload failed");
  }
};



  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100">
      {/* Main Container with Chat and User List */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl h-[700px] flex gap-4"
      >
        {/* Chat Container */}
        <div className="flex-1 bg-gradient-to-b from-white/80 to-white/60 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-200/40 border border-white/60 flex flex-col overflow-hidden">
          {/* Glassmorphism Header */}
          <div className="bg-white/70 backdrop-blur-lg border-b border-white/60 px-6 py-5">
            <div className="flex items-center gap-4">
              {/* Group Avatar */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Users size={24} className="text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow-sm">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-emerald-400 opacity-50"
                  />
                </div>
              </div>
              
              {/* Group info */}
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">All Team Members</h2>
                <p className="text-sm text-gray-600">
                  {user?.name}
                </p>
              </div>

              {/* Action dots */}
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <AnimatePresence initial={false}>
            {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.3,
                    delay: msg * 0.05,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className={`flex gap-2 ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Avatar for other users */}
                  {msg.senderId !== user.id && (
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${msg.color} flex items-center justify-center shadow-md`}>
                        <span className="text-white text-xs font-medium">{msg.avatar}</span>
                      </div>
                    </div>
                  )}

                  <div className={`max-w-[75%] ${msg.senderId === user.id ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    {/* Sender name for other users */}
                    {msg.senderId !== user.id && (
                      <span className="text-xs font-semibold text-gray-700 px-2">{msg.senderName}</span>
                    )}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                      className={`
                        px-5 py-3.5 rounded-2xl
                        ${msg.senderId === user.id 
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-300/50 rounded-tr-sm' 
                          : msg.senderId === 'admin'
                          ? 'bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 text-gray-800 shadow-lg shadow-red-200/50 rounded-tl-sm'
                          : 'bg-white shadow-lg shadow-gray-200/50 text-gray-800 rounded-tl-sm'
                        }
                      `}
                    >
                      <p className="text-[15px] leading-relaxed">{msg.text}</p>
                    </motion.div>
                    <span className="text-xs text-gray-500 px-2">{msg.time}</span>
                  </div>

                  {/* Avatar placeholder for own messages */}
                  {msg.senderId === user.id && (
                    <div className="flex-shrink-0 w-8"></div>
                  )}
                </motion.div>
              ))}
              {isOtherUserTyping && (
                <motion.div
                  key="typing-indicator"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.3,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="flex justify-start"
                >
                  <div className="max-w-[75%] items-start flex flex-col gap-1">
                    <div className="px-5 py-4 rounded-2xl bg-white shadow-lg shadow-gray-200/50 rounded-tl-sm">
                      <div className="flex gap-1.5">
                        <motion.div
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          className="w-2 h-2 rounded-full bg-gray-400"
                        />
                        <motion.div
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          className="w-2 h-2 rounded-full bg-gray-400"
                        />
                        <motion.div
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          className="w-2 h-2 rounded-full bg-gray-400"
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 px-2">typing...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white/70 backdrop-blur-lg border-t border-white/60 px-6 py-5">
            <div className="flex items-end gap-3">
              {/* Text Input */}
              <div className="flex-1 relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                   onKeyDown={handleKeyPress}
                  placeholder="Type your message…" aria-label="Type your message"
                  rows="1"
                  className="w-full px-5 py-3 rounded-2xl bg-white border border-gray-200 focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 text-gray-800 placeholder-gray-400 resize-none shadow-sm transition-all duration-200"
                  style={{ maxHeight: '120px' }}
                />
              </div>

               {/* File */}
               <div className="relative">
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileSend}
      />
      <motion.label
        htmlFor="file-upload"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 hover:from-indigo-100 hover:to-purple-100 flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer"
      >
        <Paperclip className="w-5 h-5 text-gray-600" />
      </motion.label>
    </div>

                 {/* Emojibutton */}

                  <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 hover:from-indigo-100 hover:to-purple-100 flex items-center justify-center transition-all duration-200 shadow-sm"
              >
                <Smile className="w-5 h-5 text-gray-600" />
              </motion.button>

              {/* Send Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-300/50 transition-all duration-200"
              >
                <Send className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* User List Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-80 bg-gradient-to-b from-white/80 to-white/60 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-200/40 border border-white/60 flex flex-col overflow-hidden"
        >
          {/* User List Header */}
          <div className="bg-white/70 backdrop-blur-lg border-b border-white/60 px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            <p className="text-sm text-gray-500 mt-1">
              {users.filter(u => u.status === 'online').length} online • {users.length} total
            </p>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {users.map((u) => (
              <motion.div
                key={u.id}
                whileHover={{ scale: 1.02, x: 4 }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 bg-white/50 hover:bg-white/80 shadow-sm"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${u.color} flex items-center justify-center shadow-md`}>
                    <span className="text-white text-sm font-medium">{u.avatar}</span>
                  </div>
                  {/* Status Indicator */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
                    u.status === 'online' ? 'bg-emerald-400' : 'bg-gray-400'
                  }`}>
                    {u.status === 'online' && (
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-emerald-400 opacity-50"
                      />
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                   <p className="text-sm font-semibold text-gray-900 truncate">
                     {u.name}
                       </p>

                {u.role === 'admin' && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-red-100 to-orange-100 text-red-700 text-[10px] font-bold rounded-full border border-red-200">
                  ADMIN
      </span>
    )}
  </div>

  <p className={`text-xs truncate ${
    u.status === 'online'
      ? 'text-emerald-500 font-medium'
      : 'text-gray-500'
  }`}>
    {u.position} • {u.lastSeen}
  </p>
</div>


                {/* Unread Badge */}
                {u.status === 'online' && u?.id !== 0 && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ChatBox;