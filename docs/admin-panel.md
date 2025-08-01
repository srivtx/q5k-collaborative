# Q5K Admin Panel Documentation

The Q5K Admin Panel provides comprehensive monitoring and management capabilities for your collaborative coding platform.

## Overview

The admin panel is a web-based interface that allows administrators to:
- Monitor real-time server statistics
- View and manage active rooms
- Track user activity and connections
- Delete rooms with user notifications
- Monitor system health and performance

## Accessing the Admin Panel

### URL
Navigate to: `http://localhost:3000/admin.html`

### Authentication
**Important**: In the current version, the admin panel has no authentication. For production deployments, you must implement proper authentication and access controls.

## Features

### 1. Real-Time Dashboard

#### Server Statistics
The dashboard displays live server metrics updated every 5 seconds:

- **Total Rooms**: Number of active collaboration rooms
- **Total Users**: Number of connected users across all rooms
- **Server Uptime**: How long the server has been running
- **Memory Usage**: Current memory consumption (RSS, Heap Total, Heap Used)

#### System Health Indicators
- **🟢 Green**: System healthy (< 80% memory usage)
- **🟡 Yellow**: System under moderate load (80-90% memory usage)
- **🔴 Red**: System under high load (> 90% memory usage)

### 2. Room Management

#### Room List
Each room displays:
- **Room ID**: Unique 6-character identifier
- **Users**: List of connected usernames
- **Created**: Timestamp when room was created
- **Last Activity**: Timestamp of most recent activity
- **Language**: Current programming language
- **Code Size**: Length of code in characters

#### Room Actions
- **Delete Room**: Remove room and notify users
- **View Details**: Expand to see more room information

### 3. Room Deletion System

#### Warning Process
1. Admin clicks "Delete Room" button
2. Button becomes disabled and shows "Deleting..."
3. All users in the room receive a warning notification
4. 30-second countdown begins
5. Users are notified with remaining time updates
6. After countdown, users are force-disconnected
7. Room is removed from server memory and database
8. Deleted room is blacklisted to prevent immediate recreation

#### User Experience During Deletion
Users receive notifications in this sequence:
```
⚠️ "This room will be deleted in 30 seconds by an administrator"
⚠️ "This room will be deleted in 20 seconds by an administrator"
⚠️ "This room will be deleted in 10 seconds by an administrator"
⚠️ "This room will be deleted in 5 seconds by an administrator"
🚫 "You have been disconnected. Reason: Room deleted by administrator"
```

## Technical Implementation

### Real-Time Updates
The admin panel uses polling every 5 seconds to fetch fresh data:

```javascript
// Auto-refresh every 5 seconds
setInterval(() => {
    loadStats();
    loadRooms();
}, 5000);
```

### API Endpoints

#### GET /admin/stats
Returns server statistics:
```json
{
    "totalRooms": 3,
    "totalUsers": 7,
    "uptime": 1234567,
    "memoryUsage": {
        "rss": 45678900,
        "heapTotal": 23456789,
        "heapUsed": 12345678
    }
}
```

#### GET /admin/rooms
Returns list of active rooms:
```json
{
    "rooms": [
        {
            "id": "ABC123",
            "users": ["user1", "user2"],
            "createdAt": "2024-01-01T12:00:00.000Z",
            "lastActivity": "2024-01-01T12:05:00.000Z",
            "language": "javascript",
            "codeLength": 245
        }
    ]
}
```

#### DELETE /admin/rooms/:roomId
Deletes a specific room:
```json
{
    "success": true,
    "message": "Room deleted successfully",
    "notifiedUsers": 2
}
```

### Error Handling
The admin panel handles various error scenarios:

```javascript
async function deleteRoom(roomId) {
    try {
        const response = await fetch(`/admin/rooms/${roomId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        showNotification(`Room ${roomId} deleted successfully`);
        
    } catch (error) {
        console.error('Error deleting room:', error);
        showNotification(`Failed to delete room ${roomId}: ${error.message}`);
    }
}
```

## Monitoring and Alerts

### Memory Usage Monitoring
The admin panel monitors memory usage and provides visual indicators:

```javascript
function getMemoryUsageColor(percentage) {
    if (percentage < 80) return '#4CAF50'; // Green
    if (percentage < 90) return '#FF9800'; // Orange
    return '#F44336'; // Red
}
```

### Activity Tracking
Room activity is tracked and displayed:
- Creation timestamps
- Last activity timestamps
- User join/leave events
- Code modification events

## Security Considerations

### Current Limitations
⚠️ **Important Security Notice**: The admin panel currently has no built-in authentication or authorization. This is suitable for development but **NOT for production**.

### Production Security Requirements

#### 1. Authentication
Implement proper admin authentication:

```javascript
// Example middleware for admin authentication
function requireAdminAuth(req, res, next) {
    const token = req.headers.authorization;
    
    if (!verifyAdminToken(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    next();
}

// Apply to all admin routes
app.use('/admin', requireAdminAuth);
```

#### 2. Access Control
- Restrict admin panel access by IP address
- Use VPN or internal network access only
- Implement role-based permissions

#### 3. Audit Logging
Log all admin actions:

```javascript
function logAdminAction(adminId, action, details) {
    console.log(`[ADMIN AUDIT] ${new Date().toISOString()} - Admin: ${adminId}, Action: ${action}`, details);
    
    // Store in secure audit log
    auditLogger.info({
        timestamp: new Date().toISOString(),
        adminId,
        action,
        details,
        ip: req.ip
    });
}
```

### Network Security
- Use HTTPS in production
- Implement proper CORS policies
- Set up firewall rules
- Monitor for suspicious activity

## Troubleshooting

### Common Issues

#### 1. Admin Panel Not Loading
**Symptoms**: Blank page or loading errors
**Solutions**:
- Check server is running on correct port
- Verify admin.html exists and is accessible
- Check browser console for JavaScript errors
- Ensure server endpoints are responding

#### 2. Room Deletion Not Working
**Symptoms**: Delete button not working or rooms not being deleted
**Solutions**:
- Check server logs for errors
- Verify WebSocket connections are active
- Ensure users are properly connected to rooms
- Check database write permissions

#### 3. Statistics Not Updating
**Symptoms**: Dashboard shows stale data
**Solutions**:
- Check /admin/stats endpoint response
- Verify JavaScript polling is working
- Check for network connectivity issues
- Examine browser console for errors

### Debug Mode
Enable debug logging for troubleshooting:

```javascript
// Add to server.js
const DEBUG_ADMIN = process.env.DEBUG_ADMIN === 'true';

function debugLog(message, data) {
    if (DEBUG_ADMIN) {
        console.log(`[ADMIN DEBUG] ${new Date().toISOString()}: ${message}`, data);
    }
}
```

### Log Analysis
Check server logs for admin activities:

```bash
# Filter admin-related logs
grep "ADMIN" logs/combined-*.log

# Monitor real-time admin activity
tail -f logs/combined-*.log | grep "ADMIN"
```

## API Rate Limiting

Admin endpoints are exempt from standard rate limiting to ensure reliable monitoring:

```javascript
// Rate limiting configuration
const adminRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // Much higher limit for admin
    message: 'Too many admin requests'
});

app.use('/admin', adminRateLimit);
```

## Performance Considerations

### Efficient Polling
The admin panel uses optimized polling to minimize server load:

```javascript
// Efficient stats collection
function getServerStats() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime() * 1000;
    
    return {
        totalRooms: rooms.size,
        totalUsers: Array.from(rooms.values()).reduce((sum, room) => sum + room.users.length, 0),
        uptime,
        memoryUsage: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed
        }
    };
}
```

### Caching Strategy
Implement caching for frequently accessed data:

```javascript
// Simple in-memory cache with TTL
const statsCache = {
    data: null,
    timestamp: 0,
    ttl: 2000 // 2 seconds
};

function getCachedStats() {
    const now = Date.now();
    if (statsCache.data && (now - statsCache.timestamp) < statsCache.ttl) {
        return statsCache.data;
    }
    
    statsCache.data = getServerStats();
    statsCache.timestamp = now;
    return statsCache.data;
}
```

## Future Enhancements

### Planned Features
- [ ] User role management
- [ ] Advanced filtering and search
- [ ] Historical data and analytics
- [ ] Email notifications for events
- [ ] Export functionality for reports
- [ ] Real-time alerts and notifications
- [ ] Multi-server support
- [ ] Advanced security controls

### Integration Possibilities
- Slack/Discord notifications
- Grafana dashboards
- Prometheus metrics
- ELK stack logging
- Custom alerting systems

The admin panel provides essential monitoring and management capabilities while maintaining simplicity and performance. For production use, ensure proper security measures are implemented.
