# Q5K Architecture

## System Overview

Q5K is built as a real-time collaborative platform with a client-server architecture using WebSockets for bidirectional communication.

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    SQLite    ┌─────────────┐
│   Client        │◄──────────────►│   Server        │◄────────────►│  Database   │
│   (Browser)     │    HTTP/HTTPS   │   (Node.js)     │              │             │
└─────────────────┘                └─────────────────┘              └─────────────┘
```

## Core Components

### 1. Client-Side (Frontend)

**File**: `index.html`
- **Role**: Single-page application with embedded JavaScript
- **Technologies**: Vanilla HTML5, CSS3, JavaScript ES6+
- **Features**:
  - Real-time code editor
  - WebSocket connection management
  - Room management UI
  - Chat interface
  - Code execution interface

**Key JavaScript Classes/Functions**:
```javascript
// Main application initialization
function initializeApp()

// WebSocket connection management
function connectWebSocket()
function handleServerMessage(message)

// Room management
function generateNewRoom()
function joinRoom()

// Code collaboration
function sendCodeUpdate()
function handleCodeUpdate()
```

### 2. Server-Side (Backend)

**File**: `server.js`
- **Role**: Main application server and WebSocket handler
- **Technologies**: Node.js, Express.js, WebSocket
- **Architecture**: Class-based with dependency injection

**Core Classes**:

#### CodeShareServer Class
```javascript
class CodeShareServer {
    constructor() {
        this.app = express();                    // HTTP server
        this.wss = new WebSocket.Server();     // WebSocket server
        this.rooms = new Map();                // Room storage
        this.userSockets = new Map();          // User connections
        this.deletedRooms = new Set();         // Admin blacklist
    }
}
```

**Key Methods**:
- `setupRoutes()` - HTTP API endpoints
- `setupWebSocket()` - WebSocket event handling
- `handleUserJoin()` - User room management
- `broadcastToRoom()` - Real-time message distribution
- `adminDeleteRoom()` - Administrative controls

### 3. Code Execution Engine

**File**: `executor.js`
- **Role**: Secure code execution in isolated environments
- **Technologies**: Child processes, sandboxing
- **Security**: Timeout limits, resource constraints

```javascript
async function executeCode(code, language) {
    // Sandboxed execution with timeouts
    // Language-specific handlers
    // Error handling and output formatting
}
```

### 4. Database Layer

**Technology**: SQLite3
- **Purpose**: Persistent storage for code shares and execution logs
- **Schema**:
  - `shares` - Code snippets and room data
  - `executions` - Execution history and analytics

### 5. Admin Panel

**File**: `admin.html`
- **Role**: Administrative interface for monitoring and management
- **Features**:
  - Real-time room monitoring
  - User activity tracking
  - Room deletion with user notifications
  - Server statistics and health metrics

## Data Flow

### 1. Room Creation Flow
```
User visits URL → Generate room ID → Create room object → Store in memory → Send room info to client
```

### 2. User Join Flow
```
User connects → WebSocket handshake → Join room message → Add to room users → Broadcast user joined → Send room state
```

### 3. Code Collaboration Flow
```
User types code → Debounced update → WebSocket message → Server broadcasts → All clients update → Database save (async)
```

### 4. Code Execution Flow
```
User clicks run → Send code to server → Execute in sandbox → Return results → Display in terminal → Log execution
```

### 5. Admin Management Flow
```
Admin deletes room → Send warnings to users → 30-second countdown → Force disconnect users → Remove from memory → Clean database
```

## Memory Management

### Room Lifecycle
1. **Creation**: Room created when first user joins
2. **Active**: Room maintained while users are present
3. **Inactive**: Auto-cleanup timer starts when empty (3.5 minutes)
4. **Cleanup**: Room removed from memory and database
5. **Admin Delete**: Immediate removal with user notifications

### Connection Management
```javascript
this.userSockets = new Map(); // userId -> WebSocket connection
this.rooms = new Map();       // roomId -> { users, code, metadata }
```

## Security Architecture

### 1. Input Validation
- Code size limits (1MB per share)
- Message length restrictions
- SQL injection prevention

### 2. Rate Limiting
- General API: 100 requests per 15 minutes
- Code execution: 10 executions per minute
- Admin endpoints: Exempted from rate limiting

### 3. Content Security Policy
```javascript
helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"]
        }
    }
})
```

### 4. Code Execution Security
- Sandboxed environments
- Timeout limits (5 seconds)
- Resource constraints
- No file system access

## Scalability Considerations

### Current Architecture
- Single-node deployment
- In-memory room storage
- SQLite database

### Scaling Options
1. **Horizontal Scaling**: Add Redis for session storage
2. **Database**: Migrate to PostgreSQL/MySQL
3. **Load Balancing**: WebSocket sticky sessions
4. **Microservices**: Separate execution service

## File Structure

```
codeshare/
├── server.js              # Main server application
├── executor.js            # Code execution engine
├── index.html            # Main client application
├── admin.html            # Administrative interface
├── package.json          # Dependencies and scripts
├── codeshare.db          # SQLite database (auto-generated)
├── docs/                 # Documentation
├── docker-compose.yml    # Container orchestration
├── Dockerfile           # Container definition
└── nginx.conf           # Reverse proxy config
```

## Performance Characteristics

### WebSocket Performance
- Connection pooling for efficient resource usage
- Message batching for code updates
- Heartbeat mechanism for connection health

### Database Performance
- Prepared statements for query optimization
- Asynchronous operations to prevent blocking
- Automatic cleanup of old data

### Memory Usage
- Room cleanup prevents memory leaks
- Connection cleanup on user disconnect
- Configurable timeout values
