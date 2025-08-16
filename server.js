
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        
        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript'
        }[ext] || 'text/plain';
        
        res.writeHead(200, {'Content-Type': contentType});
        res.end(data);
    });
});

server.listen(5000, '0.0.0.0', () => {
    console.log('ArbiCoin server running on port 5000');
});
