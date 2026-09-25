const http = require("http");

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("OK — ответ от простого сервера\n");
}).listen(PORT, () => console.log(`Server listening on ${PORT}`));