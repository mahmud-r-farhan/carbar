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
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 min-h-screen bg-[#f7f7f7] flex flex-col font-sans text-gray-800"
    >
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg flex flex-col h-[80vh]">
        <h2 className="text-2xl font-semibold p-5 border-b border-gray-200">
          {role === 'captain' ? 'Captain Support Chat' : 'User Support Chat'}
        </h2>
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-700"></div>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-gray-500 text-center">No messages yet.</p>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.sender === user.fullname.firstName ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs p-4 rounded-2xl shadow-sm ${
                    msg.sender === user.fullname.firstName
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  <p className="font-semibold mb-1">{msg.sender}</p>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p className="text-xs mt-2 opacity-60 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-200 bg-[#fafafa] rounded-b-xl">
          <div className="flex gap-4">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-5 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900 placeholder-gray-400"
              type="text"
              placeholder="Type your message..."
              autoComplete="off"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 font-semibold transition"
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