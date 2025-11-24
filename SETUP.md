# Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Get Your Free Gemini API Key**
   - Visit: https://makersuite.google.com/app/apikey
   - Create a new API key (completely free)
   - Copy the key

3. **Create Environment File**
   ```bash
   cp .env.example .env.local
   ```

4. **Add Your API Key**
   - Open `.env.local`
   - Replace `your_gemini_api_key_here` with your actual Gemini API key
   - Save the file

5. **Run the App**
   ```bash
   npm run dev
   ```

6. **Open in Browser**
   - Navigate to http://localhost:3000
   - Start researching companies!

## That's It!

The app works completely free with just the Gemini API key. All other search providers are optional and only enhance the experience.

## Optional Enhancements

### Add More Search Providers

1. **SerpAPI** (Free tier available)
   - Sign up at https://serpapi.com/
   - Get your API key
   - Add to `.env.local`: `SERP_API_KEY=your_key`

2. **Brave Search** (Free tier available)
   - Sign up at https://brave.com/search/api/
   - Get your API key
   - Add to `.env.local`: `BRAVE_SEARCH_API_KEY=your_key`

### Without Additional Keys

The app will automatically use:
- DuckDuckGo (free, no API key needed)
- Mock data as fallback

So you can use the app completely free with just Gemini!

## Troubleshooting

### "API key is missing"
- Make sure you created `.env.local` (not `.env`)
- Check that `GOOGLE_GEMINI_API_KEY` is set correctly
- Restart the dev server after changing `.env.local`

### "Module not found" errors
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then run `npm install`

### Port already in use
- Change the port: `npm run dev -- -p 3001`

## Features

✅ **Completely Free** - Works with free Gemini API tier
✅ **No Database Required** - Uses local storage
✅ **Multiple Search Providers** - Automatic fallback
✅ **Real-time Research** - See progress as it happens
✅ **Export Plans** - JSON, HTML, CSV formats
✅ **Analytics** - Track your research
✅ **Settings** - Customize your experience

Enjoy your free research agent! 🚀

