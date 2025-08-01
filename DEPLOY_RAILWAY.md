# 🚀 Deploy Q5K to Railway

## Quick Deployment Steps

### 1. Prepare Your Code
✅ Already done! Your project is Railway-ready.

### 2. Push to GitHub
```bash
# If not already a git repo
git init
git add .
git commit -m "Initial Q5K commit"

# Create GitHub repo and push
git remote add origin https://github.com/yourusername/q5k.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "Deploy from GitHub repo"
4. Select your Q5K repository
5. Railway will auto-detect Node.js and deploy!

### 4. Add Database (Optional)
1. In Railway dashboard, click "Add Service"
2. Select "PostgreSQL"
3. Railway will automatically set DATABASE_URL

### 5. Configure Environment Variables
In Railway dashboard → Variables tab:
```
NODE_ENV=production
ADMIN_PASSWORD=your_secure_password_here
```

### 6. Access Your App
Railway will provide a URL like: `https://q5k-production.up.railway.app`

## What Railway Does Automatically
- ✅ Detects Node.js from package.json
- ✅ Runs `npm install`
- ✅ Starts with `npm start`
- ✅ Provides HTTPS domain
- ✅ Sets up health checks
- ✅ Auto-restarts on crashes
- ✅ WebSocket support enabled

## Cost
- **Free tier**: $5/month in credits (enough for small apps)
- **Paid**: Pay-per-use after credits exhausted

## Alternative Quick Deploy Options

### Render.com
1. Connect GitHub repo
2. Select "Web Service"
3. Build: `npm install`
4. Start: `npm start`
5. Add PostgreSQL database

### Heroku (Paid)
```bash
# Install Heroku CLI
heroku create your-q5k-app
heroku addons:create heroku-postgresql:mini
git push heroku main
```

## Why Railway is Best for Q5K
- ✅ WebSocket support (real-time collaboration works)
- ✅ Always-on server (no cold starts)
- ✅ Built-in PostgreSQL
- ✅ Auto-deploy from GitHub
- ✅ Custom domains + HTTPS
- ✅ Great free tier
