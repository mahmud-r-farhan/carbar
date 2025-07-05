import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { UserDataContext } from '../context/UserContext';

const Chat = ({ role }) => {
  const [user] = useContext(UserDataContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setMessages([
        { id: 1, sender: 'Support', text: 'Hello! How can we assist you today?', timestamp: new Date() },
        { id: 2, sender: user.fullname.firstName, text: 'I have an issue with my ride.', timestamp: new Date() },
      ]);
      setLoading(false);
    }, 1000);
  }, [user.fullname.firstName]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const message = {
      id: messages.length + 1,
      sender: user.fullname.firstName,
      text: newMessage,
      timestamp: new Date(),
    };
    setMessages([...messages, message]);
    setNewMessage('');
    toast.success('Message sent!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 min-h-screen bg-gray-50 text-gray-800 flex flex-col"
    >
      <div className="w-full max-w-3xl mx-auto border rounded-md bg-white flex flex-col h-[80vh]">
        <div className="text-base font-medium px-4 py-3 border-b bg-white">
          {role === 'captain' ? 'Captain Support Chat' : 'User Support Chat'}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-gray-500 text-center">No messages yet.</p>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.sender === user.fullname.firstName ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-3 rounded-md border ${
                    msg.sender === user.fullname.firstName
                      ? 'bg-blue-100 text-blue-900 border-blue-200'
                      : 'bg-gray-100 text-gray-800 border-gray-200'
                  }`}
                >
                  <div className="font-semibold mb-1">{msg.sender}</div>
                  <div>{msg.text}</div>
                  <div className="text-[11px] text-right text-gray-500 mt-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <form onSubmit={handleSendMessage} className="border-t bg-gray-50 p-3">
          <div className="flex gap-3">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              type="text"
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoComplete="off"
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Send
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default Chat;