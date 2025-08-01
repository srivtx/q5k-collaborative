# CodeShare - Collaborative Code Editor

A real-time collaborative code editor with execution capabilities, built with vanilla HTML, CSS, and JavaScript.

## Features

### Core Features
- **Real-time Code Editor**: Powered by CodeMirror 6 with syntax highlighting
- **Live Collaboration**: Multiple users can edit simultaneously with cursor tracking
- **Code Execution**: Run Python, JavaScript, Java, and C++ code securely in Docker containers
- **Instant Sharing**: Generate unique shareable links
- **Chat System**: Built-in chat for collaborators

### Security Features
- Docker-based code execution with resource limits
- Network isolation for executed code
- Input sanitization and dangerous pattern detection
- Rate limiting on executions
- No file system access for executed code

### UI Features
- Modern, responsive design
- Dark/light theme toggle
- Keyboard shortcuts (Ctrl+S to save, Ctrl+Enter to run)
- Auto-save functionality
- Download code as files
- Mobile-friendly interface

## Quick Start

### Prerequisites
- Node.js 16+ 
- Docker (for secure code execution)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
cd codeshare
npm install
```

2. **Start the server:**
```bash
npm start
```

3. **Open your browser:**
Navigate to `http://localhost:3000`

### Docker Setup (Recommended)

For secure code execution, make sure Docker is installed and running:

```bash
# Verify Docker installation
docker --version

# Pull required images (optional, they'll be pulled automatically)
docker pull node:18-alpine
docker pull python:3.11-alpine
docker pull openjdk:17-alpine
docker pull gcc:latest
```

## Usage

### Creating a New Session
1. Open the application in your browser
2. Start typing code - a unique share ID will be generated automatically
3. Share the URL with collaborators

### Joining an Existing Session
1. Open the shared URL
2. Start collaborating immediately
3. See other users' cursors and changes in real-time

### Running Code
1. Write your code in the editor
2. Select the appropriate language from the dropdown
3. Click "Run" or press Ctrl+Enter
4. View output in the terminal panel

### Keyboard Shortcuts
- `Ctrl+Enter` / `Cmd+Enter`: Run code
- `Ctrl+S` / `Cmd+S`: Save code
- `Ctrl+/` / `Cmd+/`: Toggle comment
- Theme toggle: Click the moon/sun icon

## Supported Languages

| Language | Runtime | Features |
|----------|---------|----------|
| JavaScript | Node.js 18 | Full ES6+ support |
| Python | Python 3.11 | Standard library |
| Java | OpenJDK 17 | Compile and run |
| C++ | GCC latest | C++17 standard |

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

### Database
The application uses SQLite for simplicity. The database file `codeshare.db` will be created automatically.

## API Endpoints

### REST API
- `GET /api/share/:id` - Get shared code
- `POST /api/share` - Create new share
- `POST /api/execute` - Execute code
- `GET /api/health` - Health check

### WebSocket Events
- `join` - Join a collaboration room
- `codeUpdate` - Code changes
- `cursorUpdate` - Cursor position updates
- `chatMessage` - Chat messages
- `executeCode` - Code execution requests

## Security Considerations

### Code Execution Security
- All code runs in isolated Docker containers
- No network access for executed code
- Memory and CPU limits enforced
- Execution timeout (10 seconds)
- Pattern detection for dangerous operations

### Rate Limiting
- 100 requests per 15 minutes per IP
- 10 code executions per minute per IP
- WebSocket connection limits

### Input Validation
- Code size limits (1MB for sharing, 100KB for execution)
- Message length limits
- Dangerous pattern detection

## Development

### Project Structure
```
codeshare/
├── index.html          # Main HTML file
├── styles.css          # All styles
├── app.js             # Frontend JavaScript
├── server.js          # Express server + WebSocket
├── executor.js        # Code execution engine
├── package.json       # Dependencies
└── temp/              # Temporary files (auto-created)
```

### Development Mode
```bash
npm install -g nodemon
npm run dev
```

### Adding New Languages
1. Add language support in `executor.js`
2. Add Docker image configuration
3. Update the language selector in HTML
4. Add syntax highlighting mode in JavaScript

## Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Use a reverse proxy (nginx) for HTTPS
3. Set up proper CORS headers
4. Configure rate limiting
5. Set up monitoring

### Docker Deployment
```bash
# Build and run with Docker
docker build -t codeshare .
docker run -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock codeshare
```

## Troubleshooting

### Common Issues

**Docker not available:**
- The app will fall back to less secure local execution
- Install Docker for full security features

**WebSocket connection fails:**
- Check firewall settings
- Ensure WebSocket support in reverse proxy

**Code execution timeout:**
- Default timeout is 10 seconds
- Reduce code complexity or optimize algorithms

**Database errors:**
- Ensure write permissions in application directory
- Check disk space availability

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- CodeMirror for the excellent code editor
- Docker for secure code execution
- The open source community for inspiration

---

**Note**: This application is designed for educational and collaborative purposes. Always review code before executing it, and never run untrusted code in production environments.
