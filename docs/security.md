# Q5K Security Guide

## Overview

Q5K implements multiple layers of security to protect against common web application vulnerabilities while maintaining a smooth user experience.

## Security Architecture

### 1. Input Validation & Sanitization

#### Code Content
- **Size Limits**: Maximum 1MB per code share
- **Character Filtering**: Remove null bytes and control characters
- **Language Validation**: Only allow supported programming languages

```javascript
// Example validation
function validateCodeInput(code, language) {
    if (!code || typeof code !== 'string') {
        throw new Error('Invalid code input');
    }
    
    if (code.length > 1024 * 1024) { // 1MB limit
        throw new Error('Code too large');
    }
    
    const allowedLanguages = ['javascript', 'python', 'java', 'cpp'];
    if (!allowedLanguages.includes(language)) {
        throw new Error('Unsupported language');
    }
    
    return true;
}
```

#### User Input
- **Username**: Max 50 characters, alphanumeric only
- **Chat Messages**: Max 500 characters
- **Room IDs**: 6-character alphanumeric strings only

### 2. Code Execution Security

#### Sandboxing
All user code executes in isolated environments with strict limitations:

```javascript
// Execution limits
const EXECUTION_LIMITS = {
    timeout: 5000,        // 5 seconds
    memory: 128 * 1024,   // 128MB
    outputSize: 10240,    // 10KB
    processes: 1          // Single process only
};
```

#### Language-Specific Security

**JavaScript (Node.js)**:
- No file system access
- No network access
- No `require()` of external modules
- VM context isolation

**Python**:
- Restricted imports (no `os`, `sys`, `subprocess`)
- No file operations
- Memory and time limits enforced

**Java**:
- Security manager prevents file/network access
- Classpath restrictions
- No reflection or system calls

**C++**:
- Compile-time restrictions
- No system headers
- Runtime limits enforced

#### Error Handling
- Execution errors are caught and sanitized
- Stack traces are filtered to remove sensitive paths
- Timeout errors provide generic messages

### 3. Network Security

#### Content Security Policy (CSP)
```javascript
helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws://localhost:3000", "wss://localhost:3000"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    }
})
```

#### CORS Configuration
```javascript
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : true,
    credentials: true,
    optionsSuccessStatus: 200
};
```

### 4. Rate Limiting

#### WebSocket Rate Limits
- **Code Updates**: 10 per second per connection
- **Chat Messages**: 5 per second per connection
- **Execution Requests**: 1 per 6 seconds per connection
- **Join Attempts**: 3 per minute per IP

```javascript
// Rate limiting implementation
class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = new Map();
    }
    
    isAllowed(clientId) {
        const now = Date.now();
        const clientRequests = this.requests.get(clientId) || [];
        
        // Remove old requests
        const validRequests = clientRequests.filter(
            time => now - time < this.timeWindow
        );
        
        if (validRequests.length >= this.maxRequests) {
            return false;
        }
        
        validRequests.push(now);
        this.requests.set(clientId, validRequests);
        return true;
    }
}
```

#### HTTP Rate Limits
- **General API**: 100 requests per 15 minutes per IP
- **Admin Endpoints**: Exempt from rate limiting (secure separately)

### 5. Data Protection

#### Database Security
- **SQL Injection Prevention**: Prepared statements only
- **Data Encryption**: Sensitive data encrypted at rest
- **Connection Security**: Database connections use SSL in production

```javascript
// Prepared statement example
const stmt = db.prepare(`
    INSERT INTO shares (id, code, language, created_at) 
    VALUES (?, ?, ?, ?)
`);
stmt.run(roomId, code, language, new Date().toISOString());
```

#### Memory Protection
- **Room Cleanup**: Automatic cleanup prevents memory leaks
- **Connection Cleanup**: WebSocket connections properly closed
- **Sensitive Data**: No passwords or tokens stored in memory

### 6. Admin Panel Security

#### Access Control
```javascript
// Admin authentication middleware (implement in production)
function requireAdminAuth(req, res, next) {
    const token = req.headers.authorization;
    
    if (!token || !verifyAdminToken(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    next();
}
```

#### Admin Actions Logging
```javascript
function logAdminAction(action, adminId, details) {
    console.log(`[ADMIN] ${new Date().toISOString()} - ${adminId}: ${action}`, details);
    
    // In production, log to secure audit trail
    auditLogger.info({
        timestamp: new Date().toISOString(),
        adminId,
        action,
        details,
        ip: req.ip
    });
}
```

### 7. WebSocket Security

#### Connection Validation
```javascript
wss.on('connection', (ws, req) => {
    // Rate limit connections per IP
    if (!connectionRateLimit.isAllowed(req.ip)) {
        ws.close(1008, 'Rate limited');
        return;
    }
    
    // Validate origin in production
    if (process.env.NODE_ENV === 'production') {
        const origin = req.headers.origin;
        if (!isAllowedOrigin(origin)) {
            ws.close(1008, 'Invalid origin');
            return;
        }
    }
});
```

#### Message Validation
```javascript
function validateWebSocketMessage(message) {
    try {
        const parsed = JSON.parse(message);
        
        if (!parsed.type || !parsed.data) {
            throw new Error('Invalid message format');
        }
        
        const allowedTypes = ['join', 'code', 'chat', 'execute', 'cursor'];
        if (!allowedTypes.includes(parsed.type)) {
            throw new Error('Invalid message type');
        }
        
        return parsed;
    } catch (error) {
        throw new Error('Message validation failed');
    }
}
```

## Security Best Practices

### Development
1. **Never trust user input**: Validate and sanitize all inputs
2. **Principle of least privilege**: Grant minimum necessary permissions
3. **Defense in depth**: Multiple security layers
4. **Fail securely**: Default to secure state on errors

### Deployment
1. **Use HTTPS**: Always use SSL/TLS in production
2. **Environment variables**: Store secrets in environment variables
3. **Regular updates**: Keep dependencies updated
4. **Monitoring**: Implement security monitoring and alerting

### Code Review
1. **Security-focused reviews**: Review for security vulnerabilities
2. **Automated scanning**: Use security scanners in CI/CD
3. **Dependency auditing**: Regular dependency security audits

## Vulnerability Mitigation

### XSS (Cross-Site Scripting)
- **CSP Headers**: Prevent inline script execution
- **Input Sanitization**: Escape user-generated content
- **Template Security**: Use safe templating practices

### CSRF (Cross-Site Request Forgery)
- **SameSite Cookies**: Prevent cross-site cookie usage
- **CSRF Tokens**: Validate request authenticity
- **Origin Validation**: Check request origins

### Code Injection
- **Sandboxed Execution**: Isolate user code execution
- **Input Validation**: Validate code before execution
- **Resource Limits**: Prevent resource exhaustion

### DoS (Denial of Service)
- **Rate Limiting**: Prevent request flooding
- **Resource Limits**: Limit memory and CPU usage
- **Connection Limits**: Limit concurrent connections

## Security Monitoring

### Logging
```javascript
// Security event logging
function logSecurityEvent(event, severity, details) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        severity,
        details,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    };
    
    console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
}
```

### Metrics
- Failed authentication attempts
- Rate limit violations
- Execution timeouts
- Connection anomalies
- Admin actions

### Alerting
- Multiple failed attempts from same IP
- Unusual execution patterns
- Memory usage spikes
- Repeated error conditions

## Production Security Checklist

- [ ] Enable HTTPS with valid SSL certificate
- [ ] Implement admin authentication
- [ ] Configure proper CORS settings
- [ ] Set up security monitoring
- [ ] Enable request logging
- [ ] Configure firewall rules
- [ ] Set up intrusion detection
- [ ] Implement backup and recovery
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning

## Security Updates

Keep these components updated regularly:
- Node.js runtime
- Express.js framework
- WebSocket library
- Database drivers
- Security middleware (helmet, cors)
- Operating system packages

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:
1. Do not publicly disclose the vulnerability
2. Contact the development team privately
3. Provide detailed reproduction steps
4. Allow reasonable time for fixes before disclosure
