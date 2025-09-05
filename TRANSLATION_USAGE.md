# Message Translation with OpenAI

This document explains how to use the new message translation functionality in your chat application.

## Features

- **Automatic Translation**: Messages can be automatically translated to a target language using OpenAI's GPT-4o-mini model
- **Real-time Processing**: Translations are processed asynchronously after messages are sent
- **Language Support**: Support for any language that OpenAI can translate to
- **Fallback Display**: Shows original content if translation is not available

## Usage

### 1. Sending a Message with Translation

To send a message that will be automatically translated, include the `targetLanguage` parameter:

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const sendMessage = useMutation(api.messages.sendMessage);

// Send a message that will be translated to Spanish
await sendMessage({
  conversationId: "your_conversation_id",
  content: "Hello, how are you?",
  messageType: "text",
  targetLanguage: "Spanish" // This will trigger automatic translation
});
```

### 2. Retrieving Messages with Translations

Use the `getMessagesWithTranslation` query to get messages with translations for a specific language:

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const messages = useQuery(api.messages.getMessagesWithTranslation, {
  conversationId: "your_conversation_id",
  targetLanguage: "Spanish"
});

// Messages will include a `displayContent` field that shows:
// - Translated content if available for the target language
// - Original content if no translation is available
```

### 3. Available Languages

You can specify any language that OpenAI supports. Some examples:

- "Spanish"
- "French"
- "German"
- "Italian"
- "Portuguese"
- "Russian"
- "Chinese"
- "Japanese"
- "Korean"
- "Arabic"

## How It Works

1. **Message Creation**: When you send a message with `targetLanguage`, it's stored in the database
2. **Translation Scheduling**: A background job is scheduled to translate the message
3. **OpenAI Processing**: The message is sent to OpenAI's GPT-4o-mini model for translation
4. **Storage**: The translated content is stored back in the database
5. **Display**: When retrieving messages, the translated content is shown if available

## Database Schema

The `messages` table now includes two new optional fields:

- `translatedContent`: The translated version of the message
- `targetLanguage`: The language the message was translated to

## Error Handling

- If translation fails, the original message remains unchanged
- Translation errors are logged but don't affect the user experience
- Messages without translations fall back to showing the original content

## Performance Considerations

- Translations are processed asynchronously to avoid blocking message sending
- Only text messages are translated (image messages are ignored)
- The system uses OpenAI's efficient GPT-4o-mini model for cost optimization

## Environment Variables

Make sure to set your OpenAI API key in your environment:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Example Implementation

Here's a complete example of a chat component that supports translation:

```typescript
import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function ChatWithTranslation({ conversationId }: { conversationId: string }) {
  const [message, setMessage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  
  const sendMessage = useMutation(api.messages.sendMessage);
  const messages = useQuery(api.messages.getMessagesWithTranslation, {
    conversationId,
    targetLanguage
  });

  const handleSend = async () => {
    if (message.trim()) {
      await sendMessage({
        conversationId,
        content: message,
        messageType: "text",
        targetLanguage
      });
      setMessage("");
    }
  };

  return (
    <div>
      <div>
        <select 
          value={targetLanguage} 
          onChange={(e) => setTargetLanguage(e.target.value)}
        >
          <option value="Spanish">Spanish</option>
          <option value="French">French</option>
          <option value="German">German</option>
          <option value="Italian">Italian</option>
        </select>
      </div>
      
      <div className="messages">
        {messages?.map((msg) => (
          <div key={msg._id}>
            <strong>{msg.sender.displayName}:</strong>
            <span>{msg.displayContent}</span>
            {msg.translatedContent && (
              <small> (Translated to {msg.targetLanguage})</small>
            )}
          </div>
        ))}
      </div>
      
      <div>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
```

## Troubleshooting

### Translation Not Working

1. Check that your OpenAI API key is set correctly
2. Verify that the message type is "text" (not "image")
3. Ensure the targetLanguage parameter is provided
4. Check the Convex logs for any error messages

### Performance Issues

1. Consider implementing rate limiting for translation requests
2. Monitor OpenAI API usage and costs
3. Implement caching for frequently translated phrases

### Language Support

1. Test with your specific target languages
2. Some languages may have better translation quality than others
3. Consider providing fallback languages for better user experience

