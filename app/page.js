'use client'
import { Box, Button, Stack, TextField } from '@mui/material'
import { useState, useEffect, useRef } from 'react'

export default function Home() {
  const [messages, setMessages] = useState([
  {
    role: 'assistant',
    content: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
  },
])
const [message, setMessage] = useState('')
const [loading, setLoading] = useState(false);

const sendMessage = async () => {
  if (!message.trim()) return;
  setMessage('')
  setMessages((messages) => [
    ...messages,
    {role: 'user', content: message},
    {role: 'assistant', content: ''},
  ])

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let result = "";
    await reader.read().then(function processText({ done, value }) {
      if (done) return result;

      const text = decoder.decode(value || new Uint8Array(), {
        stream: true,
      });

      result += text

      setMessages((messages) => {
        const updatedMessages = [...messages];
        const lastMessage = updatedMessages[updatedMessages.length - 1];
        lastMessage.content = result;
        return updatedMessages;
      });

      return reader.read().then(processText);
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    setMessages((messages) => [
      ...messages,
      {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      },
    ]);
  }
};

return (
  <Box
    width="100vw"
    height="100vh"
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
  >
    <Stack
      direction={'column'}
      width="500px"
      height="700px"
      border="1px solid black"
      p={2}
      spacing={3}
    >
      <Stack
        direction={'column'}
        spacing={2}
        flexGrow={1}
        overflow="auto"
        maxHeight="100%"
      >
        {messages.map((message, index) => (
          <Box
            key={index}
            display="flex"
            justifyContent={
              message.role === 'assistant' ? 'flex-start' : 'flex-end'
            }
          >
            <Box
              bgcolor={
                message.role === 'assistant'
                  ? 'primary.main'
                  : 'secondary.main'
              }
              color="white"
              borderRadius={16}
              p={3}
            >
              {message.content}
            </Box>
          </Box>
        ))}
      </Stack>
      <Stack direction={'row'} spacing={2}>
        <TextField
          label="Message"
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button variant="contained" onClick={sendMessage}>
          Send
        </Button>
      </Stack>
    </Stack>
  </Box>
)
}
