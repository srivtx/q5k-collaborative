const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { nanoid } = require('nanoid');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { executeCode } = require('./executor');

class CodeShareServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.rooms = new Map(); // shareId -> { users: Map, code: string, language: string, lastActivity: Date, cleanupTimer: NodeJS.Timeout }
        this.userSockets = new Map(); // userId -> ws connection
        this.deletedRooms = new Set(); // Track admin-deleted rooms to prevent recreation
        
        // Room cleanup timeout (3.5 minutes of inactivity)
        this.ROOM_CLEANUP_TIMEOUT = 3.5 * 60 * 1000;
        
        this.initializeDatabase();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupCleanup();
        this.setupHealthCheck();
    }

    setupHealthCheck() {
        // Health check endpoint for Railway
        this.app.get('/health', (req, res) => {
            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();
            
            res.status(200).json({
                status: 'healthy',
                uptime: Math.floor(uptime),
                memory: {
                    used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    total: Math.round(memoryUsage.heapTotal / 1024 / 1024)
                },
                rooms: this.rooms.size,
                timestamp: new Date().toISOString()
            });
        });
    }

    initializeDatabase() {
        this.db = new sqlite3.Database('codeshare.db');
        
        // Create tables
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS shares (
                    id TEXT PRIMARY KEY,
                    code TEXT NOT NULL,
                    language TEXT NOT NULL DEFAULT 'javascript',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    access_count INTEGER DEFAULT 0
                )
            `);
            
            this.db.run(`
                CREATE TABLE IF NOT EXISTS executions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    share_id TEXT,
                    user_id TEXT,
                    language TEXT NOT NULL,
                    code TEXT NOT NULL,
                    output TEXT,
                    error TEXT,
                    execution_time INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (share_id) REFERENCES shares (id)
                )
            `);
        });
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                    scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
                    fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "ws:", "wss:"]
                }
            }
        }));
        
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.'
        });
        // Apply rate limiting to API routes, but exclude admin endpoints
        this.app.use((req, res, next) => {
            if (req.path.startsWith('/admin/')) {
                return next(); // Skip rate limiting for admin endpoints
            }
            if (req.path.startsWith('/api/')) {
                return limiter(req, res, next);
            }
            return next(); // Skip rate limiting for non-API routes
        });
        
        // Execution rate limiting (more restrictive)
        const executeLimiter = rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 10, // limit each IP to 10 executions per minute
            message: 'Too many code executions, please wait before trying again.'
        });
        this.app.use('/api/execute', executeLimiter);
        
        // Static files
        this.app.use(express.static(__dirname, {
            index: 'index.html',
            maxAge: '1d'
        }));
    }

    setupRoutes() {
        // API Routes
        this.app.get('/api/share/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const share = await this.getShare(id);
                
                if (!share) {
                    return res.status(404).json({ error: 'Share not found' });
                }
                
                // Increment access count
                this.incrementAccessCount(id);
                
                res.json(share);
            } catch (error) {
                console.error('Error fetching share:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        
        this.app.post('/api/share', async (req, res) => {
            try {
                const { code, language = 'javascript' } = req.body;
                
                if (!code || typeof code !== 'string') {
                    return res.status(400).json({ error: 'Code is required' });
                }
                
                if (code.length > 1000000) { // 1MB limit
                    return res.status(400).json({ error: 'Code too large' });
                }
                
                const shareId = nanoid(8);
                await this.createShare(shareId, code, language);
                
                res.json({ shareId, url: `${req.protocol}://${req.get('host')}/${shareId}` });
            } catch (error) {
                console.error('Error creating share:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        
        this.app.post('/api/execute', async (req, res) => {
            try {
                const { code, language, shareId, userId } = req.body;
                
                if (!code || !language) {
                    return res.status(400).json({ error: 'Code and language are required' });
                }
                
                const result = await executeCode(code, language);
                
                // Log execution
                this.logExecution(shareId, userId, language, code, result.output, result.error, result.executionTime);
                
                res.json(result);
            } catch (error) {
                console.error('Error executing code:', error);
                res.status(500).json({ 
                    error: 'Execution failed',
                    output: '',
                    executionTime: 0,
                    status: 'Error'
                });
            }
        });
        
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // Admin API endpoints
        this.app.get('/admin/stats', (req, res) => {
            console.log('[ADMIN] Stats endpoint called from:', req.ip);
            const stats = this.getServerStats();
            console.log('[ADMIN] Sending stats:', JSON.stringify(stats, null, 2));
            res.json(stats);
        });

        this.app.get('/admin/rooms', (req, res) => {
            console.log('[ADMIN] Rooms endpoint called from:', req.ip);
            const roomsData = this.getRoomsData();
            console.log('[ADMIN] Sending rooms data:', JSON.stringify(roomsData, null, 2));
            res.json(roomsData);
        });

        this.app.delete('/admin/rooms/:shareId', (req, res) => {
            const { shareId } = req.params;
            console.log('[ADMIN] Delete room endpoint called for:', shareId);
            this.adminDeleteRoom(shareId);
            res.json({ success: true, message: `Room ${shareId} scheduled for deletion` });
        });

        this.app.get('/admin', (req, res) => {
            res.sendFile(path.join(__dirname, 'admin.html'));
        });
        
        // Serve main page for all non-API routes
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log('New WebSocket connection from', req.socket.remoteAddress);
            
            ws.userId = null;
            ws.shareId = null;
            ws.isAlive = true;
            
            ws.on('pong', () => {
                ws.isAlive = true;
            });
            
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data);
                    await this.handleWebSocketMessage(ws, message);
                } catch (error) {
                    console.error('Error handling WebSocket message:', error);
                    this.sendToClient(ws, {
                        type: 'error',
                        message: 'Invalid message format'
                    });
                }
            });
            
            ws.on('close', () => {
                this.handleUserDisconnect(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.handleUserDisconnect(ws);
            });
        });
        
        // Heartbeat to detect broken connections
        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (!ws.isAlive) {
                    ws.terminate();
                    return;
                }
                
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }

    async handleWebSocketMessage(ws, message) {
        const { type } = message;
        
        // Reset room activity timer for any message
        if (ws.shareId) {
            this.resetRoomActivity(ws.shareId);
        }
        
        switch (type) {
            case 'join':
                await this.handleUserJoin(ws, message);
                break;
                
            case 'codeUpdate':
                this.handleCodeUpdate(ws, message);
                break;
                
            case 'cursorUpdate':
                this.handleCursorUpdate(ws, message);
                break;
                
            case 'chatMessage':
                this.handleChatMessage(ws, message);
                break;
                
            case 'executeCode':
                await this.handleCodeExecution(ws, message);
                break;
                
            case 'saveCode':
                await this.handleSaveCode(ws, message);
                break;

            case 'createNewRoom':
                this.handleCreateNewRoom(ws, message);
                break;
                
            default:
                console.warn('Unknown message type:', type);
        }
    }

    async handleUserJoin(ws, message) {
        const { shareId, userId, userName, userColor } = message;
        
        // Check if this room was deleted by admin - prevent recreation
        if (this.deletedRooms.has(shareId)) {
            console.log(`Rejecting join to deleted room ${shareId} by user ${userName}`);
            this.sendToClient(ws, {
                type: 'roomUnavailable',
                message: 'This room has been deleted by an administrator.',
                shareId: shareId
            });
            return;
        }
        
        ws.userId = userId;
        ws.shareId = shareId;
        ws.userName = userName;
        ws.userColor = userColor;
        
        // Add to user sockets map
        this.userSockets.set(userId, ws);
        
        // Create or get room
        if (!this.rooms.has(shareId)) {
            this.rooms.set(shareId, {
                users: new Map(),
                code: '',
                language: 'javascript',
                lastActivity: new Date(),
                cleanupTimer: null
            });

            // Start the cleanup timer for this room
            this.resetRoomActivity(shareId);
            
            // Try to load existing share
            const existingShare = await this.getShare(shareId);
            if (existingShare) {
                const room = this.rooms.get(shareId);
                room.code = existingShare.code;
                room.language = existingShare.language;
            } else if (shareId) {
                // Create new share if it doesn't exist
                await this.createShare(shareId, '', 'javascript');
            }
        }
        
        const room = this.rooms.get(shareId);
        const user = { userId, userName, userColor, joinedAt: Date.now() };
        room.users.set(userId, user);
        
        // Reset activity timer when user joins (cancels any scheduled cleanup)
        this.resetRoomActivity(shareId);
        
        // Send current room state to the new user
        this.sendToClient(ws, {
            type: 'codeUpdate',
            code: room.code,
            language: room.language,
            userId: 'server'
        });
        
        // Send users list to the new user
        this.sendToClient(ws, {
            type: 'usersList',
            users: Array.from(room.users.values())
        });

        // Send room stats to the new user
        this.sendToClient(ws, {
            type: 'roomStats',
            userCount: room.users.size,
            shareId: shareId
        });

        // Notify other users about the new user
        this.broadcastToRoom(shareId, {
            type: 'userJoined',
            user: user
        }, userId);

        // Broadcast updated room stats to all users in room
        this.broadcastToRoom(shareId, {
            type: 'roomStats',
            userCount: room.users.size,
            shareId: shareId
        });        // Send share created event if this was a new share
        if (!shareId || shareId === 'undefined') {
            const newShareId = nanoid(8);
            ws.shareId = newShareId;
            
            this.sendToClient(ws, {
                type: 'shareCreated',
                shareId: newShareId
            });
        }
        
        console.log(`User ${userName} (${userId}) joined room ${shareId}`);
    }

    handleUserDisconnect(ws) {
        if (ws.userId && ws.shareId) {
            const room = this.rooms.get(ws.shareId);
            if (room) {
                room.users.delete(ws.userId);
                
                // Notify other users
                this.broadcastToRoom(ws.shareId, {
                    type: 'userLeft',
                    userId: ws.userId
                }, ws.userId);

                // Broadcast updated room stats to remaining users
                this.broadcastToRoom(ws.shareId, {
                    type: 'roomStats',
                    userCount: room.users.size,
                    shareId: ws.shareId
                });

                // If room is now empty, start the cleanup timer
                if (room.users.size === 0) {
                    this.resetRoomActivity(ws.shareId);
                    console.log(`Room ${ws.shareId} is now empty, cleanup timer started`);
                }
            }
            
            this.userSockets.delete(ws.userId);
            console.log(`User ${ws.userName} (${ws.userId}) left room ${ws.shareId}`);
        }
    }

    handleCodeUpdate(ws, message) {
        const { code, shareId } = message;
        const room = this.rooms.get(shareId);
        
        if (room) {
            room.code = code;
            
            // Broadcast to other users in the room
            this.broadcastToRoom(shareId, {
                type: 'codeUpdate',
                code: code,
                userId: ws.userId
            }, ws.userId);
        }
    }

    handleCursorUpdate(ws, message) {
        const { shareId } = message;
        
        // Broadcast cursor position to other users
        this.broadcastToRoom(shareId, {
            type: 'cursorUpdate',
            cursor: message.cursor,
            userId: ws.userId,
            userName: ws.userName,
            userColor: ws.userColor
        }, ws.userId);
    }

    handleChatMessage(ws, message) {
        const { shareId, message: chatMessage } = message;
        
        if (!chatMessage || chatMessage.length > 500) {
            return;
        }
        
        const messageData = {
            type: 'chatMessage',
            message: chatMessage,
            userId: ws.userId,
            userName: ws.userName,
            userColor: ws.userColor,
            timestamp: Date.now()
        };
        
        // Broadcast to all users in the room (including sender)
        this.broadcastToRoom(shareId, messageData);
    }

    async handleCodeExecution(ws, message) {
        const { code, language, shareId, userId } = message;
        
        try {
            const result = await executeCode(code, language);
            
            // Log execution
            this.logExecution(shareId, userId, language, code, result.output, result.error, result.executionTime);
            
            // Send result back to the user
            this.sendToClient(ws, {
                type: 'executionResult',
                ...result
            });
            
            // Optionally broadcast execution to other users in the room
            this.broadcastToRoom(shareId, {
                type: 'executionBroadcast',
                userId: userId,
                userName: ws.userName,
                language: language,
                status: result.status
            }, userId);
            
        } catch (error) {
            console.error('Code execution error:', error);
            this.sendToClient(ws, {
                type: 'executionResult',
                error: 'Execution failed: ' + error.message,
                output: '',
                executionTime: 0,
                status: 'Error'
            });
        }
    }

    async handleSaveCode(ws, message) {
        const { code, shareId } = message;
        
        try {
            await this.updateShare(shareId, code);
            console.log(`Code saved for share ${shareId}`);
        } catch (error) {
            console.error('Error saving code:', error);
        }
    }

    handleCreateNewRoom(ws, message) {
        const { currentCode } = message;
        const newShareId = nanoid(6);
        
        // Create new room with current code
        this.rooms.set(newShareId, {
            users: new Map(),
            code: currentCode || '',
            language: 'javascript',
            lastActivity: new Date(),
            cleanupTimer: null
        });

        // Start cleanup timer for new room
        this.resetRoomActivity(newShareId);

        // Create new share in database
        this.createShare(newShareId, currentCode || '', 'javascript');

        // Send new room info to user
        this.sendToClient(ws, {
            type: 'newRoomCreated',
            shareId: newShareId,
            url: `${process.env.BASE_URL || 'http://localhost:3000'}/${newShareId}`
        });

        console.log(`New room ${newShareId} created for user ${ws.userName}`);
    }

    // Admin method to delete room with warning
    adminDeleteRoom(shareId) {
        const room = this.rooms.get(shareId);
        if (!room) {
            console.log(`Room ${shareId} not found for deletion`);
            return;
        }

        console.log(`Admin initiated deletion of room ${shareId} with ${room.users.size} users`);

        // Add to deleted rooms blacklist to prevent recreation
        this.deletedRooms.add(shareId);
        console.log(`Added ${shareId} to deleted rooms blacklist`);

        // Remove from blacklist after 10 minutes to allow potential reuse
        setTimeout(() => {
            this.deletedRooms.delete(shareId);
            console.log(`Removed ${shareId} from deleted rooms blacklist`);
        }, 10 * 60 * 1000);

        // Send 30-second warning to all users in room
        this.broadcastToRoom(shareId, {
            type: 'adminNotification',
            message: 'This room will be deleted by administrator in 30 seconds. Please save your work!',
            countdown: 30,
            severity: 'warning',
            currentCode: room.code
        });

        // Countdown every 5 seconds
        let countdown = 25;
        const countdownInterval = setInterval(() => {
            if (countdown > 0) {
                this.broadcastToRoom(shareId, {
                    type: 'adminNotification',
                    message: `Room closing in ${countdown} seconds...`,
                    countdown: countdown,
                    severity: 'warning',
                    currentCode: room.code
                });
                countdown -= 5;
            }
        }, 5000);

        // Final deletion after 30 seconds
        setTimeout(() => {
            console.log(`[ADMIN DELETE] 30-second timer fired for room ${shareId}`);
            clearInterval(countdownInterval);
            
            const roomToDelete = this.rooms.get(shareId);
            if (roomToDelete) {
                console.log(`[ADMIN DELETE] Room ${shareId} found, proceeding with deletion`);
                // Send final notification
                this.broadcastToRoom(shareId, {
                    type: 'roomDeleted',
                    message: 'Room has been deleted by administrator',
                    severity: 'error'
                });

                // Properly disconnect all users and clean up their connections
                roomToDelete.users.forEach((user, userId) => {
                    console.log(`[ADMIN DELETE] Disconnecting user ${user.userName} (${userId})`);
                    const userWs = this.userSockets.get(userId);
                    if (userWs && userWs.readyState === WebSocket.OPEN) {
                        // Send disconnect message first
                        this.sendToClient(userWs, {
                            type: 'forceDisconnect',
                            reason: 'Room deleted by administrator'
                        });
                        
                        // Give the message time to be delivered before closing connection
                        setTimeout(() => {
                            if (userWs.readyState === WebSocket.OPEN) {
                                userWs.terminate();
                            }
                            // Clean up user socket mapping
                            this.userSockets.delete(userId);
                        }, 1000); // 1 second delay to ensure message delivery
                    }
                });

                // Clear the cleanup timer if it exists
                if (roomToDelete.cleanupTimer) {
                    clearTimeout(roomToDelete.cleanupTimer);
                    console.log(`[ADMIN DELETE] Cleared cleanup timer for room ${shareId}`);
                }
            } else {
                console.log(`[ADMIN DELETE] Room ${shareId} not found when trying to delete`);
            }

            // Force delete room from memory and database after admin deletion
            console.log(`[ADMIN DELETE] Force removing room ${shareId} from memory and database`);
            
            // Clear the cleanup timer if it exists
            const finalRoomToDelete = this.rooms.get(shareId);
            if (finalRoomToDelete && finalRoomToDelete.cleanupTimer) {
                clearTimeout(finalRoomToDelete.cleanupTimer);
                console.log(`[ADMIN DELETE] Cleared final cleanup timer for room ${shareId}`);
            }
            
            // Delete from database
            this.deleteShare(shareId);
            console.log(`[ADMIN DELETE] Deleted room ${shareId} from database`);
            
            // Remove the room from memory regardless of user status
            this.rooms.delete(shareId);
            console.log(`[ADMIN DELETE] Removed room ${shareId} from memory`);
            
            console.log(`[ADMIN DELETE] Room ${shareId} has been forcibly deleted by admin. Rooms remaining: ${this.rooms.size}`);
        }, 30000);
    }

    // Database operations
    createShare(id, code, language) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO shares (id, code, language, updated_at) 
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `);
            
            stmt.run([id, code, language], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id });
                }
            });
            
            stmt.finalize();
        });
    }

    getShare(id) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM shares WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    updateShare(id, code) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE shares 
                SET code = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `);
            
            stmt.run([code, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
            
            stmt.finalize();
        });
    }

    deleteShare(id) {
        return new Promise((resolve, reject) => {
            // Delete related execution logs first
            const deleteExecutions = this.db.prepare('DELETE FROM executions WHERE share_id = ?');
            deleteExecutions.run([id], (err) => {
                if (err) {
                    console.error('Error deleting executions for share:', err);
                }
            });
            deleteExecutions.finalize();

            // Then delete the share
            const stmt = this.db.prepare('DELETE FROM shares WHERE id = ?');
            
            stmt.run([id], function(err) {
                if (err) {
                    console.error('Error deleting share from database:', err);
                    reject(err);
                } else {
                    console.log(`Deleted share ${id} and related data from database`);
                    resolve({ changes: this.changes });
                }
            });
            
            stmt.finalize();
        });
    }

    incrementAccessCount(id) {
        this.db.run(
            'UPDATE shares SET access_count = access_count + 1 WHERE id = ?',
            [id],
            (err) => {
                if (err) {
                    console.error('Error incrementing access count:', err);
                }
            }
        );
    }

    logExecution(shareId, userId, language, code, output, error, executionTime) {
        const stmt = this.db.prepare(`
            INSERT INTO executions (share_id, user_id, language, code, output, error, execution_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([shareId, userId, language, code, output, error, executionTime], (err) => {
            if (err) {
                console.error('Error logging execution:', err);
            }
        });
        
        stmt.finalize();
    }

    // WebSocket utilities
    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    broadcastToRoom(shareId, message, excludeUserId = null) {
        const room = this.rooms.get(shareId);
        if (!room) {
            console.log(`Cannot broadcast to room ${shareId} - room not found`);
            return;
        }
        
        console.log(`Broadcasting message type '${message.type}' to room ${shareId} with ${room.users.size} users`);
        
        room.users.forEach((user, userId) => {
            if (userId !== excludeUserId) {
                const userWs = this.userSockets.get(userId);
                if (userWs) {
                    console.log(`Sending message to user ${user.userName} (${userId})`);
                    this.sendToClient(userWs, message);
                } else {
                    console.log(`User ${userId} websocket not found in userSockets map`);
                }
            }
        });
    }

    setupCleanup() {
        // Clean up old shares periodically
        setInterval(() => {
            this.cleanupOldShares();
        }, 24 * 60 * 60 * 1000); // Once per day
        
        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('Shutting down server...');
            this.db.close();
            this.server.close(() => {
                console.log('Server shut down successfully');
                process.exit(0);
            });
        });
    }

    cleanupOldShares() {
        // Delete shares older than 30 days with no recent access
        this.db.run(`
            DELETE FROM shares 
            WHERE updated_at < datetime('now', '-30 days') 
            AND access_count = 0
        `, (err) => {
            if (err) {
                console.error('Error cleaning up old shares:', err);
            } else {
                console.log('Cleaned up old shares');
            }
        });
        
        // Delete old executions (older than 7 days)
        this.db.run(`
            DELETE FROM executions 
            WHERE created_at < datetime('now', '-7 days')
        `, (err) => {
            if (err) {
                console.error('Error cleaning up old executions:', err);
            }
        });
    }

    // Reset room activity timer to prevent cleanup
    resetRoomActivity(shareId) {
        const room = this.rooms.get(shareId);
        if (!room) return;

        // Update last activity
        room.lastActivity = new Date();

        // Clear existing cleanup timer
        if (room.cleanupTimer) {
            clearTimeout(room.cleanupTimer);
        }

        // Set new cleanup timer
        room.cleanupTimer = setTimeout(() => {
            this.cleanupInactiveRoom(shareId);
        }, this.ROOM_CLEANUP_TIMEOUT);
    }

    // Clean up an inactive room
    cleanupInactiveRoom(shareId) {
        const room = this.rooms.get(shareId);
        if (!room) return;

        // Check if room still has no users
        if (room.users.size === 0) {
            console.log(`Cleaning up inactive room: ${shareId} - deleting from memory AND database`);
            
            // Clear the cleanup timer
            if (room.cleanupTimer) {
                clearTimeout(room.cleanupTimer);
            }
            
            // Delete from database completely
            this.deleteShare(shareId);
            
            // Remove the room from memory
            this.rooms.delete(shareId);
        } else {
            // Room has users, reset the timer
            this.resetRoomActivity(shareId);
        }
    }

    // Admin utility methods
    getServerStats() {
        const totalUsers = this.userSockets.size;
        const totalRooms = this.rooms.size;
        const totalConnections = this.wss.clients.size;
        
        let totalCodeSize = 0;
        this.rooms.forEach(room => {
            totalCodeSize += room.code.length;
        });

        return {
            totalUsers,
            totalRooms,
            totalConnections,
            totalCodeSize,
            serverUptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
    }

    getRoomsData() {
        const roomsArray = [];
        
        this.rooms.forEach((room, shareId) => {
            const users = Array.from(room.users.values()).map(user => ({
                userId: user.userId,
                userName: user.userName,
                userColor: user.userColor,
                joinedAt: user.joinedAt,
                connected: this.userSockets.has(user.userId)
            }));

            roomsArray.push({
                shareId,
                userCount: room.users.size,
                users,
                code: room.code,
                language: room.language,
                lastActivity: room.lastActivity,
                codeLength: room.code.length,
                hasCleanupTimer: !!room.cleanupTimer
            });
        });

        return roomsArray.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    }

    start(port = process.env.PORT || 3000) {
        this.server.listen(port, () => {
            console.log(`CodeShare server running on port ${port}`);
            console.log(`http://localhost:${port}`);
        });
    }
}

// Start the server
const server = new CodeShareServer();
server.start();

module.exports = CodeShareServer;
