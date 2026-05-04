# NEXLOAD — Cybernetic Video Downloader

## ▶ Run Locally (3 steps)

1. Install dependencies:
   ```
   npm install
   ```

2. Start the dev server:
   ```
   npm run dev
   ```

3. Open your browser at:
   ```
   http://localhost:3000
   ```

---

## ☁️ Deploy to Cloudflare Pages

1. Push this folder to GitHub
2. Connect repo on Cloudflare Pages
3. Build command: `npx opennextjs-cloudflare build`
4. Output directory: `.open-next/assets`
5. Add environment variable on Cloudflare:
   - Key: `RAPIDAPI_KEY`
   - Value: your RapidAPI key

---

## ⚠️ IMPORTANT — Keep your API key safe

- The `.env.local` file contains your API key
- It is listed in `.gitignore` so it will NOT be pushed to GitHub
- Never share it publicly
- On Cloudflare, add it manually in Settings → Environment Variables
