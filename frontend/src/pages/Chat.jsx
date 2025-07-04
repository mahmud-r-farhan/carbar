import React, { useState } from 'react';
import { motion } from 'framer-motion';

const Chat = ({ role }) => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'Support', text: 'How can we assist you today?' },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      setMessages([...messages, { id: messages.length + 1, sender: role, text: newMessage }]);
      setNewMessage('');
      // Simulate support response
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: prev.length + 1, sender: 'Support', text: 'Thank you for your message!' },
        ]);
      }, 1000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-7 h-screen flex flex-col"
    >
      <h1 className="text-2xl font-bold mb-4">Chat with Support</h1>
      <div className="flex-1 overflow-y-auto bg-gray-100 p-4 rounded">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`mb-2 ${msg.sender === role ? 'text-right' : 'text-left'}`}
          >
            <p className={`inline-block p-2 rounded ${msg.sender === role ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
              <strong>{msg.sender}:</strong> {msg.text}
            </p>
          </motion.div>
        ))}
      </div>
      <form onSubmit={handleSend} className="mt-4">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="bg-[#eeeeee] rounded px-4 border w-full text-base h-11"
          type="text"
          placeholder="Type your message"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
          type="submit"
        >
          Send
        </motion.button>
      </form>
    </motion.div>
  );
};

export default Chat;