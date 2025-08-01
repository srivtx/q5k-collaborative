const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CodeExecutor {
    constructor() {
        this.tempDir = path.join(__dirname, 'temp');
        this.dockerImages = {
            javascript: 'node:18-alpine',
            python: 'python:3.11-alpine',
            java: 'openjdk:17-alpine',
            cpp: 'gcc:latest'
        };
        
        this.ensureTempDir();
    }

    async ensureTempDir() {
        try {
            await fs.access(this.tempDir);
        } catch {
            await fs.mkdir(this.tempDir, { recursive: true });
        }
    }

    async executeCode(code, language) {
        const startTime = Date.now();
        const sessionId = crypto.randomUUID();
        
        try {
            // Validate input
            if (!code || !language) {
                throw new Error('Code and language are required');
            }
            
            if (!this.dockerImages[language]) {
                throw new Error(`Unsupported language: ${language}`);
            }
            
            // Security checks
            if (code.length > 100000) { // 100KB limit
                throw new Error('Code too large');
            }
            
            if (this.containsDangerousContent(code, language)) {
                throw new Error('Code contains potentially dangerous operations');
            }
            
            // Execute based on language
            let result;
            switch (language) {
                case 'javascript':
                    result = await this.executeJavaScript(code, sessionId);
                    break;
                case 'python':
                    result = await this.executePython(code, sessionId);
                    break;
                case 'java':
                    result = await this.executeJava(code, sessionId);
                    break;
                case 'cpp':
                    result = await this.executeCpp(code, sessionId);
                    break;
                default:
                    throw new Error(`Unsupported language: ${language}`);
            }
            
            const executionTime = Date.now() - startTime;
            
            return {
                output: result.output || '',
                error: result.error || '',
                executionTime,
                status: result.error ? 'Error' : 'Success'
            };
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            return {
                output: '',
                error: error.message,
                executionTime,
                status: 'Error'
            };
        } finally {
            // Cleanup temp files
            this.cleanup(sessionId).catch(console.error);
        }
    }

    async executeJavaScript(code, sessionId) {
        const fileName = `${sessionId}.js`;
        const filePath = path.join(this.tempDir, fileName);
        
        // Write code to file
        await fs.writeFile(filePath, code);
        
        // Execute with Docker
        return this.runInDocker(
            this.dockerImages.javascript,
            [`node`, `/app/${fileName}`],
            fileName,
            code
        );
    }

    async executePython(code, sessionId) {
        const fileName = `${sessionId}.py`;
        const filePath = path.join(this.tempDir, fileName);
        
        // Write code to file
        await fs.writeFile(filePath, code);
        
        // Execute with Docker
        return this.runInDocker(
            this.dockerImages.python,
            [`python`, `/app/${fileName}`],
            fileName,
            code
        );
    }

    async executeJava(code, sessionId) {
        const className = this.extractJavaClassName(code);
        const fileName = `${className}.java`;
        const filePath = path.join(this.tempDir, fileName);
        
        // Write code to file
        await fs.writeFile(filePath, code);
        
        // Compile and execute with Docker
        return this.runInDocker(
            this.dockerImages.java,
            ['sh', '-c', `javac /app/${fileName} && java -cp /app ${className}`],
            fileName,
            code
        );
    }

    async executeCpp(code, sessionId) {
        const fileName = `${sessionId}.cpp`;
        const execName = sessionId;
        const filePath = path.join(this.tempDir, fileName);
        
        // Write code to file
        await fs.writeFile(filePath, code);
        
        // Compile and execute with Docker
        return this.runInDocker(
            this.dockerImages.cpp,
            ['sh', '-c', `g++ -o /app/${execName} /app/${fileName} && /app/${execName}`],
            fileName,
            code
        );
    }

    async runInDocker(image, command, fileName, code) {
        return new Promise((resolve) => {
            const dockerArgs = [
                'run',
                '--rm',
                '--network=none', // No network access
                '--memory=128m', // Memory limit
                '--cpus=0.5', // CPU limit
                '--timeout=10s', // Execution timeout
                '-v', `${this.tempDir}:/app:ro`, // Mount temp directory as read-only
                '--user', '1000:1000', // Run as non-root user
                '--security-opt=no-new-privileges', // Security
                '--cap-drop=ALL', // Drop all capabilities
                image,
                ...command
            ];
            
            const docker = spawn('docker', dockerArgs);
            
            let output = '';
            let error = '';
            
            docker.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            docker.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            // Set execution timeout
            const timeout = setTimeout(() => {
                docker.kill('SIGKILL');
                error += '\nExecution timed out (10 second limit)';
            }, 10000);
            
            docker.on('close', (code) => {
                clearTimeout(timeout);
                
                // Truncate output if too long
                if (output.length > 10000) {
                    output = output.substring(0, 10000) + '\n... (output truncated)';
                }
                
                if (error.length > 10000) {
                    error = error.substring(0, 10000) + '\n... (error truncated)';
                }
                
                resolve({
                    output: output.trim(),
                    error: error.trim(),
                    exitCode: code
                });
            });
            
            docker.on('error', (err) => {
                clearTimeout(timeout);
                resolve({
                    output: '',
                    error: `Docker execution failed: ${err.message}`,
                    exitCode: 1
                });
            });
        });
    }

    containsDangerousContent(code, language) {
        // Define dangerous patterns for each language
        const dangerousPatterns = {
            javascript: [
                /require\s*\(\s*['"`]fs['"`]\s*\)/, // File system access
                /require\s*\(\s*['"`]child_process['"`]\s*\)/, // Process execution
                /require\s*\(\s*['"`]http['"`]\s*\)/, // Network access
                /require\s*\(\s*['"`]https['"`]\s*\)/, // Network access
                /require\s*\(\s*['"`]net['"`]\s*\)/, // Network access
                /process\.exit/, // Process control
                /process\.kill/, // Process control
                /eval\s*\(/, // Code evaluation
                /Function\s*\(/, // Dynamic function creation
                /global\s*\./, // Global object access
            ],
            python: [
                /import\s+os/, // OS access
                /import\s+subprocess/, // Process execution
                /import\s+sys/, // System access
                /import\s+socket/, // Network access
                /import\s+urllib/, // Network access
                /import\s+requests/, // Network access
                /import\s+shutil/, // File operations
                /from\s+os\s+import/, // OS access
                /open\s*\(/, // File operations
                /exec\s*\(/, // Code execution
                /eval\s*\(/, // Code evaluation
                /__import__/, // Dynamic imports
            ],
            java: [
                /import\s+java\.io\./, // File I/O
                /import\s+java\.net\./, // Network access
                /import\s+java\.lang\.Runtime/, // Runtime access
                /import\s+java\.lang\.ProcessBuilder/, // Process execution
                /System\.exit/, // System exit
                /Runtime\.getRuntime/, // Runtime access
                /ProcessBuilder/, // Process execution
                /Files\./, // File operations
                /Paths\./, // Path operations
            ],
            cpp: [
                /#include\s*<fstream>/, // File operations
                /#include\s*<filesystem>/, // File system access
                /#include\s*<cstdlib>/, // System calls
                /system\s*\(/, // System command execution
                /exec/, // Process execution
                /fork\s*\(/, // Process forking
                /FILE\s*\*/, // File operations
                /fopen/, // File operations
                /popen/, // Process operations
            ]
        };
        
        const patterns = dangerousPatterns[language] || [];
        
        for (const pattern of patterns) {
            if (pattern.test(code)) {
                console.warn(`Dangerous pattern detected: ${pattern}`);
                return true;
            }
        }
        
        return false;
    }

    extractJavaClassName(code) {
        const match = code.match(/public\s+class\s+(\w+)/);
        return match ? match[1] : 'Main';
    }

    async cleanup(sessionId) {
        try {
            const files = await fs.readdir(this.tempDir);
            const sessionFiles = files.filter(file => file.includes(sessionId));
            
            for (const file of sessionFiles) {
                const filePath = path.join(this.tempDir, file);
                await fs.unlink(filePath);
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    // Health check - verify Docker is available
    async healthCheck() {
        return new Promise((resolve) => {
            const docker = spawn('docker', ['--version']);
            
            docker.on('close', (code) => {
                resolve(code === 0);
            });
            
            docker.on('error', () => {
                resolve(false);
            });
        });
    }

    // Pull required Docker images
    async pullImages() {
        const images = Object.values(this.dockerImages);
        
        for (const image of images) {
            console.log(`Pulling Docker image: ${image}`);
            
            await new Promise((resolve, reject) => {
                const docker = spawn('docker', ['pull', image]);
                
                docker.on('close', (code) => {
                    if (code === 0) {
                        console.log(`Successfully pulled ${image}`);
                        resolve();
                    } else {
                        console.error(`Failed to pull ${image}`);
                        reject(new Error(`Failed to pull ${image}`));
                    }
                });
                
                docker.on('error', (error) => {
                    console.error(`Error pulling ${image}:`, error);
                    reject(error);
                });
            });
        }
    }
}

// Fallback execution without Docker (less secure, for development)
class FallbackExecutor {
    async executeCode(code, language) {
        const startTime = Date.now();
        
        try {
            console.warn('Using fallback executor - this is less secure and should only be used for development');
            
            let result;
            switch (language) {
                case 'javascript':
                    result = await this.executeJavaScriptFallback(code);
                    break;
                case 'python':
                    result = await this.executePythonFallback(code);
                    break;
                default:
                    throw new Error(`Fallback execution not supported for ${language}`);
            }
            
            const executionTime = Date.now() - startTime;
            
            return {
                output: result.output || '',
                error: result.error || '',
                executionTime,
                status: result.error ? 'Error' : 'Success'
            };
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            return {
                output: '',
                error: error.message,
                executionTime,
                status: 'Error'
            };
        }
    }

    async executeJavaScriptFallback(code) {
        return new Promise((resolve) => {
            // Create a sandbox context (limited)
            const vm = require('vm');
            const context = {
                console: {
                    log: (...args) => {
                        output += args.join(' ') + '\n';
                    },
                    error: (...args) => {
                        output += 'ERROR: ' + args.join(' ') + '\n';
                    }
                },
                setTimeout: (fn, delay) => setTimeout(fn, Math.min(delay, 1000)),
                setInterval: (fn, delay) => setInterval(fn, Math.max(delay, 100))
            };
            
            let output = '';
            
            try {
                vm.runInNewContext(code, context, {
                    timeout: 5000, // 5 second timeout
                    displayErrors: true
                });
                
                resolve({ output, error: '' });
            } catch (error) {
                resolve({ output, error: error.message });
            }
        });
    }

    async executePythonFallback(code) {
        return new Promise((resolve) => {
            const python = spawn('python3', ['-c', code]);
            
            let output = '';
            let error = '';
            
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            python.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            const timeout = setTimeout(() => {
                python.kill('SIGKILL');
                error += '\nExecution timed out';
            }, 5000);
            
            python.on('close', (code) => {
                clearTimeout(timeout);
                resolve({
                    output: output.trim(),
                    error: error.trim()
                });
            });
            
            python.on('error', (err) => {
                clearTimeout(timeout);
                resolve({
                    output: '',
                    error: `Python execution failed: ${err.message}`
                });
            });
        });
    }
}

// Initialize executor
let executor;

async function initializeExecutor() {
    const codeExecutor = new CodeExecutor();
    
    // Check if Docker is available
    const dockerAvailable = await codeExecutor.healthCheck();
    
    if (dockerAvailable) {
        console.log('Docker is available, using secure Docker execution');
        try {
            // Pull required images in the background
            codeExecutor.pullImages().catch(console.error);
        } catch (error) {
            console.error('Failed to pull Docker images:', error);
        }
        executor = codeExecutor;
    } else {
        console.warn('Docker not available, using fallback executor (less secure)');
        executor = new FallbackExecutor();
    }
}

// Initialize on module load
initializeExecutor();

// Export the main function
async function executeCode(code, language) {
    if (!executor) {
        await initializeExecutor();
    }
    
    return executor.executeCode(code, language);
}

module.exports = { executeCode };
