import { createServer } from "node:http";
import { URL } from "node:url";
import { handlePath } from "./src/path_handlers.js";

const server = createServer((req, res) => {
  const request_url = new URL(`http://${host}${req.url}`);

  handlePath(request_url.pathname, req, res);

  if (!res.writableEnded) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Nie znaleziono strony\n");
  }
});

const port = 8000;
const host = "localhost";

server.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});