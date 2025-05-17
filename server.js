const http = require('http');
const fs = require('fs');
const path = require('path');

// Minimal server with extensive logging
const PORT = 8080; // Try a different port
const serverDir = __dirname;

console.log('=======================================');
console.log('MINIMAL SERVER STARTING');
console.log('Server directory:', serverDir);
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('=======================================');

// MIME types for common file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif'
};

// Create a server
const server = http.createServer();

// Add detailed event listeners
server.on('request', (req, res) => {
  console.log(`[${new Date().toISOString()}] Incoming request for: ${req.url}`);
  
  try {
    // Parse the URL to get the pathname
    let filePath = req.url;
    
    // Handle root request
    if (filePath === '/' || filePath === '') {
      filePath = '/index.html';
    }
    
    // Create the absolute file path
    filePath = path.join(serverDir, filePath);
    console.log('Reading file from:', filePath);
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
      console.log('File exists, attempting to read...');
      const content = fs.readFileSync(filePath);
      console.log(`Successfully read ${content.length} bytes`);
      
      // Determine content type based on file extension
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      
      // Set headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', content.length);
      res.setHeader('Connection', 'close'); // Ensure connection closes properly
      res.writeHead(200);
      
      console.log(`Headers set, writing content with type: ${contentType}...`);
      res.end(content);
      console.log('Response sent successfully');
    } else {
      console.error('ERROR: File not found at path:', filePath);
      res.writeHead(404);
      res.end('File not found');
    }
  } catch (err) {
    console.error('CRITICAL ERROR in request handler:', err);
    try {
      res.writeHead(500);
      res.end('Internal Server Error');
    } catch (responseErr) {
      console.error('Failed to send error response:', responseErr);
    }
  }
});

// Error handling
server.on('error', (err) => {
  console.error('SERVER ERROR EVENT:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port.`);
  }
});

// Extra event listeners for debugging
server.on('connection', () => {
  console.log('New TCP connection established');
});

server.on('close', () => {
  console.log('Server is shutting down');
});

// Start listening
try {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Minimal server running at http://localhost:${PORT}/`);
    console.log('Press Ctrl+C to stop the server');
    
    // Show the full path to index.html that will be served
    const indexPath = path.join(serverDir, 'index.html');
    console.log(`Will serve: ${indexPath}`);
    
    // Check if the file exists
    if (fs.existsSync(indexPath)) {
      console.log('✅ index.html file found');
    } else {
      console.error('❌ WARNING: index.html not found at:', indexPath);
    }
  });
} catch (err) {
  console.error('CRITICAL ERROR starting server:', err);
}
