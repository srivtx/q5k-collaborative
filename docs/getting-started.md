# Getting Started with Q5K

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Git (optional)

## Installation

### 1. Clone or Download

```bash
git clone <repository-url>
cd codeshare
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file (optional):

```env
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
```

### 4. Start the Server

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

### 5. Access the Application

- **Main App**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **Health Check**: http://localhost:3000/api/health

## First Use

1. **Create a Room**: Visit the homepage to automatically create a new room
2. **Share the Room**: Copy the room URL to invite collaborators
3. **Start Coding**: Write code and see real-time updates from other users
4. **Execute Code**: Click "Run" to execute your code
5. **Chat**: Use the chat panel to communicate with team members

## Available Scripts

```bash
# Start production server
npm start

# Start development server with nodemon
npm run dev

# Run tests (if available)
npm test

# Check code quality
npm run lint
```

## Configuration

### Server Configuration

The server can be configured through environment variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `BASE_URL`: Base URL for share links

### Database

Q5K uses SQLite for simplicity. The database file `codeshare.db` is created automatically on first run.

### Security Settings

Security features are enabled by default:
- Rate limiting (100 requests per 15 minutes)
- Execution rate limiting (10 executions per minute)
- CSP headers
- CORS protection

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   Error: listen EADDRINUSE :::3000
   ```
   Solution: Change the port in your environment or kill the process using port 3000

2. **Database Locked**
   ```bash
   Error: SQLITE_BUSY: database is locked
   ```
   Solution: Close any other instances of the application

3. **WebSocket Connection Failed**
   ```bash
   WebSocket connection failed
   ```
   Solution: Check firewall settings and ensure WebSocket support

### Getting Help

- Check the [Architecture](./architecture.md) documentation
- Review [API Reference](./api/README.md)
- Look at [Examples](./examples/) for common use cases
