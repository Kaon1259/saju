const http = require('http');
const handler = require('serve-handler');

const server = http.createServer((req, res) => {
  return handler(req, res, {
    public: 'dist',
    rewrites: [{ source: '**', destination: '/index.html' }]
  });
});

const port = process.env.PORT || 8080;
server.listen(port, '0.0.0.0', () => {
  console.log(`Listening on http://0.0.0.0:${port}`);
});
