# Q5K Railway Deployment Troubleshooting

## 🔧 Current Issues and Fixes

### ✅ **FIXED: Docker Execution Errors**
- **Issue**: `unknown flag: --timeout` error when running code
- **Fix**: Removed unsupported `--timeout=10s` flag from Docker commands
- **Status**: Code execution should now work with Docker (when available)

### ✅ **FIXED: Improved Fallback Execution**
- **Issue**: Limited language support in fallback mode
- **Fix**: Added fallback support for Java and C++ (with helpful error messages)
- **Status**: All languages now have fallback handlers

### 🚧 **WebSocket Connection Issue**
- **Issue**: Browser cache may still use old WebSocket URL
- **Symptoms**: `Firefox can't establish a connection to the server at wss://localhost:3000/`
- **Fix Applied**: Dynamic WebSocket URL detection
- **Additional Steps Needed**:

## 🔄 **Force Browser Cache Refresh**

If you're still seeing WebSocket connection errors:

### Method 1: Hard Refresh
1. Open your Railway app URL
2. Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. This forces a complete cache refresh

### Method 2: Clear Browser Cache
1. Open Developer Tools (`F12`)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Method 3: Incognito/Private Mode
1. Open an incognito/private browser window
2. Navigate to your Railway app URL
3. Test WebSocket connection

## 🌐 **Railway Deployment Status**

### Expected Behavior After Fix:
```
✅ Server starts on Railway-assigned port (8080)
✅ WebSocket connects to wss://your-app.up.railway.app
✅ Code execution works with fallback
✅ Real-time collaboration functional
✅ Admin panel accessible
```

### Environment Variables to Set in Railway:
```
NODE_ENV=production
ADMIN_PASSWORD=your_secure_password_here
```

## 🔍 **Testing Your Deployment**

### 1. Basic Connectivity
- URL: `https://your-app-name.up.railway.app`
- Should show Q5K interface
- Check browser console for WebSocket connection logs

### 2. WebSocket Connection
- Look for: `"Connecting to WebSocket: wss://your-app-name.up.railway.app"`
- Should NOT see: `wss://localhost:3000`

### 3. Code Execution
- Try JavaScript: `console.log('Hello Railway!');`
- Should work with fallback execution
- May show: "Using fallback executor" in logs

### 4. Admin Panel
- URL: `https://your-app-name.up.railway.app/admin.html`
- Should show server stats and active rooms

## 🐛 **Debug Information**

### Console Logs to Look For:
```javascript
// Good - Dynamic WebSocket URL
"Connecting to WebSocket: wss://your-app.up.railway.app"

// Bad - Cached old URL  
"Firefox can't establish a connection to the server at wss://localhost:3000/"
```

### Server Logs (Railway Dashboard):
```
CodeShare server running on port 8080
Docker not available, using fallback executor (less secure)
New WebSocket connection from ::ffff:100.64.0.4
```

## 📋 **Quick Fix Checklist**

- [ ] Hard refresh browser (`Ctrl+Shift+R`)
- [ ] Check WebSocket URL in browser console
- [ ] Verify Railway deployment completed
- [ ] Test in incognito/private mode
- [ ] Check Railway logs for errors
- [ ] Confirm admin panel loads
- [ ] Test code execution (JavaScript should work)

## 🎯 **Expected Final Status**

Your Q5K app should now:
- ✅ Connect via WebSocket properly
- ✅ Execute JavaScript and Python code
- ✅ Show helpful messages for Java/C++ (Docker required)
- ✅ Support real-time collaboration
- ✅ Have working admin panel
- ✅ Handle multiple users in rooms

## 🚀 **Next Steps**

1. **Verify Deployment**: Check that Railway shows latest commit deployed
2. **Test Connection**: Hard refresh and test WebSocket connection  
3. **Test Features**: Try code execution, room sharing, admin panel
4. **Set Environment Variables**: Add secure admin password in Railway dashboard

## 📞 **Still Having Issues?**

If problems persist:
1. Check Railway deployment logs
2. Test in multiple browsers
3. Verify the exact Railway URL being used
4. Check browser network tab for WebSocket connection attempts
