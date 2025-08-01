# Q5K API Reference

## WebSocket API

Q5K uses WebSocket for real-time communication between clients and server.

### Connection

**Endpoint**: `ws://localhost:3000`

**Connection Flow**:
1. Client establishes WebSocket connection
2. Server sends welcome message
3. Client sends join room message
4. Real-time collaboration begins

### Message Format

All WebSocket messages follow this JSON structure:

```json
{
    "type": "message_type",
    "data": {
        // Message-specific data
    }
}
```

## Client → Server Messages

### 1. Join Room
Join or create a room for collaboration.

```json
{
    "type": "join",
    "data": {
        "roomId": "abc123",
        "username": "user123"
    }
}
```

**Parameters**:
- `roomId` (string): Room identifier (6 characters)
- `username` (string): User display name

### 2. Code Update
Send code changes to other users in the room.

```json
{
    "type": "code",
    "data": {
        "code": "console.log('Hello World');",
        "language": "javascript"
    }
}
```

**Parameters**:
- `code` (string): Current code content
- `language` (string): Programming language

### 3. Chat Message
Send a chat message to the room.

```json
{
    "type": "chat",
    "data": {
        "message": "Hello everyone!"
    }
}
```

**Parameters**:
- `message` (string): Chat message content

### 4. Code Execution Request
Request server to execute the current code.

```json
{
    "type": "execute",
    "data": {
        "code": "print('Hello World')",
        "language": "python"
    }
}
```

**Parameters**:
- `code` (string): Code to execute
- `language` (string): Programming language (`javascript`, `python`, `java`, `cpp`)

### 5. Cursor Position
Share cursor position with other users.

```json
{
    "type": "cursor",
    "data": {
        "line": 10,
        "column": 25
    }
}
```

**Parameters**:
- `line` (number): Line number (0-indexed)
- `column` (number): Column number (0-indexed)

## Server → Client Messages

### 1. User Joined
Notify when a user joins the room.

```json
{
    "type": "userJoined",
    "data": {
        "username": "newuser",
        "users": ["user1", "user2", "newuser"]
    }
}
```

**Response Data**:
- `username` (string): New user's name
- `users` (array): All users in the room

### 2. User Left
Notify when a user leaves the room.

```json
{
    "type": "userLeft",
    "data": {
        "username": "olduser",
        "users": ["user1", "user2"]
    }
}
```

**Response Data**:
- `username` (string): User who left
- `users` (array): Remaining users in the room

### 3. Code Update
Broadcast code changes to all users.

```json
{
    "type": "codeUpdate",
    "data": {
        "code": "console.log('Updated code');",
        "language": "javascript",
        "username": "user1"
    }
}
```

**Response Data**:
- `code` (string): Updated code content
- `language` (string): Programming language
- `username` (string): User who made the change

### 4. Chat Message
Broadcast chat message to all users.

```json
{
    "type": "chatMessage",
    "data": {
        "username": "user1",
        "message": "Hello everyone!",
        "timestamp": 1634567890123
    }
}
```

**Response Data**:
- `username` (string): Message sender
- `message` (string): Message content
- `timestamp` (number): Unix timestamp

### 5. Execution Result
Return code execution results.

```json
{
    "type": "executionResult",
    "data": {
        "output": "Hello World\n",
        "error": null,
        "language": "python",
        "executionTime": 145
    }
}
```

**Response Data**:
- `output` (string): Program output
- `error` (string|null): Error message if execution failed
- `language` (string): Programming language
- `executionTime` (number): Execution time in milliseconds

### 6. Admin Notification
Notify users of administrative actions.

```json
{
    "type": "adminNotification",
    "data": {
        "message": "This room will be deleted in 30 seconds",
        "type": "warning",
        "countdown": 30
    }
}
```

**Response Data**:
- `message` (string): Notification message
- `type` (string): Notification type (`info`, `warning`, `error`)
- `countdown` (number): Countdown in seconds (optional)

### 7. Force Disconnect
Force user to leave the room.

```json
{
    "type": "forceDisconnect",
    "data": {
        "reason": "Room deleted by administrator"
    }
}
```

**Response Data**:
- `reason` (string): Reason for disconnection

## HTTP API

### Admin Endpoints

All admin endpoints require proper authentication in a production environment.

#### 1. Get Server Stats
Get real-time server statistics.

```http
GET /admin/stats
```

**Response**:
```json
{
    "totalRooms": 5,
    "totalUsers": 12,
    "uptime": 3600000,
    "memoryUsage": {
        "rss": 67584000,
        "heapTotal": 29417472,
        "heapUsed": 21234567
    }
}
```

#### 2. Get All Rooms
Get list of all active rooms with details.

```http
GET /admin/rooms
```

**Response**:
```json
{
    "rooms": [
        {
            "id": "abc123",
            "users": ["user1", "user2"],
            "createdAt": "2024-01-01T12:00:00Z",
            "lastActivity": "2024-01-01T12:30:00Z",
            "language": "javascript",
            "codeLength": 150
        }
    ]
}
```

#### 3. Delete Room
Administratively delete a room with user notification.

```http
DELETE /admin/rooms/:roomId
```

**Parameters**:
- `roomId` (string): Room identifier to delete

**Response**:
```json
{
    "success": true,
    "message": "Room deleted successfully",
    "notifiedUsers": 3
}
```

## Error Handling

### WebSocket Errors

When an error occurs, the server sends an error message:

```json
{
    "type": "error",
    "data": {
        "message": "Room not found",
        "code": "ROOM_NOT_FOUND"
    }
}
```

**Common Error Codes**:
- `ROOM_NOT_FOUND`: Specified room doesn't exist
- `INVALID_MESSAGE`: Message format is invalid
- `EXECUTION_FAILED`: Code execution encountered an error
- `RATE_LIMITED`: Too many requests from client
- `ROOM_DELETED`: Room was deleted by administrator

### HTTP Errors

Standard HTTP status codes are used:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

### WebSocket Messages
- Code updates: 10 per second per user
- Chat messages: 5 per second per user
- Execution requests: 1 per 6 seconds per user

### HTTP Requests
- General endpoints: 100 requests per 15 minutes per IP
- Admin endpoints: No rate limiting

## Language Support

### Supported Languages

| Language | Identifier | File Extension | Execution Environment |
|----------|------------|----------------|----------------------|
| JavaScript | `javascript` | `.js` | Node.js |
| Python | `python` | `.py` | Python 3.x |
| Java | `java` | `.java` | OpenJDK |
| C++ | `cpp` | `.cpp` | g++ compiler |

### Execution Limits
- **Timeout**: 5 seconds per execution
- **Memory**: 128MB per execution
- **Output**: 10KB maximum output size

## Security Notes

### Input Validation
- All user inputs are validated and sanitized
- Code size limited to 1MB per share
- Username length limited to 50 characters

### Code Execution
- All code executes in sandboxed environments
- No file system access
- No network access
- Resource limits enforced

### Authentication
- Currently no authentication required
- Rooms are public but require knowledge of room ID
- Admin endpoints should be secured in production
