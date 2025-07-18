# AI assistant for government agency

This project is an AI assistant for a government agency using the OpenAI [Assistants API](https://platform.openai.com/docs/assistants/overview) with [Next.js](https://nextjs.org/docs). The primary goal of this assistant is to understand the user's intent and provide relevant information or actions, as well as ability to change different accessibility settings. This is achieved through a two-step process: first, an intent-recognition agent determines what the user needs, and then a specialized assistant for that intent is invoked (chat agent or accessibility agent).

<br/>
<br/>

## Quickstart Setup

### 1. Clone repo

```shell
git clone https://github.com/lorabenjak/ai-assistant-hakom.git
cd ai-assistant-hakom
```

### 2. Set your [OpenAI API key](https://platform.openai.com/api-keys)

Create a `.env` file in the root of the project and add your OpenAI API key:

```
OPENAI_API_KEY="sk_..."
NEXT_PUBLIC_CHAT_ASSISTANT_ID="asst_"
NEXT_PUBLIC_INTENT_ASSISTANT_ID="asst_"
NEXT_PUBLIC_INTENT_ASSISTANT_ID=asst_3w5Og5MaaRuKaqw1mU37wtXF
NEXT_PUBLIC_ENABLE_LOGGING=true
```

### 3. Install dependencies

```shell
npm install
```

### 4. Run

```shell
npm run dev
```

### 5. Navigate to [http://localhost:3000](http://localhost:3000).

## Deployment

You can deploy this project to Vercel or any other platform that supports Next.js.

## Overview


The main logic for chat will be found in the `Chat` component in `app/components/chat.tsx`, and the handlers starting with `api/assistants/threads` (found in `api/assistants/threads/...`). Feel free to start your own project and copy some of this logic in! The `Chat` component itself can be copied and used directly, provided you copy the styling from `app/components/chat.module.css` as well.

### Main Components

- `app/components/chat.tsx` - handles chat rendering, [streaming](https://platform.openai.com/docs/assistants/overview?context=with-streaming), and [function call](https://platform.openai.com/docs/assistants/tools/function-calling/quickstart?context=streaming&lang=node.js) forwarding
- `app/components/intentRecognition.tsx` - handles the logic for recognizing the user's intent.
- `app/components/accessibility.tsx` - provides accessibility features.
- `app/components/warnings.tsx` - displays warnings to the user.

### Endpoints

- `api/assistants` - `POST`: create assistant (only used at startup)
- `api/assistants/intent` - `POST`: recognize the user's intent
- `api/assistants/threads` - `POST`: create new thread
- `api/assistants/threads/[threadId]/messages` - `POST`: send message to assistant
- `api/assistants/threads/[threadId]/actions` - `POST`: inform assistant of the result of a function it decided to call
- `api/accessibility-assistant/analyze` - `POST`: analyze the website for accessibility issues
