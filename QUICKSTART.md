# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required for AI functionality
ANTHROPIC_API_KEY=your_key_here

# Optional - for real web search (uses mock data if not provided)
BRAVE_SEARCH_API_KEY=your_key_here

# Set to "true" to use mock data (useful for demos without API keys)
DEMO_MODE=false
```

**Getting API Keys:**
- **Anthropic API**: https://console.anthropic.com/
- **Brave Search API**: https://brave.com/search/api/ (optional)

### Step 3: Run the Development Server
```bash
npm run dev
```

### Step 4: Open Your Browser
Navigate to [http://localhost:3000](http://localhost:3000)

## 🎬 Testing the Application

### Test Scenario 1: Confused User
Type: `"Umm, I need to research a company? Maybe Apple? Or should I do Tesla?"`

**Expected**: Agent asks clarifying questions and provides guidance

### Test Scenario 2: Efficient User
Type: `"Generate an account plan for Salesforce immediately"`

**Expected**: Agent gets straight to work, minimal conversation

### Test Scenario 3: Chatty User
Type: `"I want to research Microsoft. By the way, did you know I used to work there? It was 2015..."`

**Expected**: Agent acknowledges input but redirects to research task

### Test Scenario 4: Edge Case
Type: `"Research XYZ Stealth Startup Inc that doesn't exist"`

**Expected**: Agent handles gracefully, explains limitations

## 🎯 Key Features to Demo

1. **Real-time Streaming**: Watch responses stream in real-time
2. **Research Progress**: See the agent's thinking and tool calls
3. **Account Plan Generation**: Automatic plan generation after research
4. **Section Editing**: Click "Edit" on any section to modify it
5. **Source Citations**: Click on sources to view references

## 🐛 Troubleshooting

### "API key not found" error
- Make sure `.env.local` exists in the root directory
- Verify the API key is correct (no extra spaces)
- Set `DEMO_MODE=true` to use mock data

### Chat not streaming
- Check browser console for errors
- Verify Anthropic API key has credits
- Try refreshing the page

### Plan not generating
- Make sure you mentioned a company name in your message
- Check the browser console for errors
- Try clicking "Generate Account Plan" button manually

## 📝 Next Steps

- Read the full [README.md](./README.md) for architecture details
- Customize the agent behavior in `lib/agent.ts`
- Add your own tools in `lib/api-client.ts`
- Style the UI in `app/globals.css`

Happy researching! 🎉

