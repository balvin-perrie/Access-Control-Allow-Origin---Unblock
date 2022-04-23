const http = require('http');

{
  const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/HTML');
    res.end(`

  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title></title>
  </head>
  <body>
    <script>
      document.cookie = 'a=1';
      fetch('http://127.0.0.1:3001/', {
        credentials: "include"
      }).then(r => r.text()).then(content => {
        console.log(content);
        document.title = 'CORS OK';
      }).catch(() => document.title = 'CORS FAILED');
    </script>
  </body>
  </html>

    `);
  });

  server.listen(3000, '127.0.0.1', () => {
    console.log('Main server is ready!', '127.0.0.1:3000');
  });
}
{
  const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/TEXT');
    res.end(`hello`);
  });

  server.listen(3001, '127.0.0.1', () => {
    console.log('API server is ready!', '127.0.0.1:3001');
  });
}
