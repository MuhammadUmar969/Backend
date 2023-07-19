const http = require("http");
const path = require("path");
const fs = require("fs");
const fsPromise = require("fs").promises;

const logEvent = require("./logEvent");
const EventEmitter = require("events");
class Emitter extends EventEmitter {}
const myEmitter = new Emitter();
myEmitter.on("log", (msg , fileName) => logEvent(msg , fileName));

const PORT = process.env.PORT || 3500;

const serveFile = async (filePath, contextType, response) => {
  try {
    const rawData = await fsPromise.readFile(
        filePath, 
       !contextType.includes('image') ? "utf8" : "");
    const data =
      contextType === 'application/json' ? JSON.parse(rawData) : rawData;
    response.writeHead(
        filePath.includes('404') ? 404 : 200, 
        { "Context-type": contextType }
        );
    response.end(
      contextType === 'application/json' ? JSON.stringify(data) : data
    );
  } catch (err) {
    console.error(err);
    myEmitter.emit("log", `${err.name}: ${err.message}`, 'errLog.txt');
    response.statusCode = 500;
    response.end();
  }
};

const server = http.createServer((req, res) => {
  console.log(req.url, req.method);
  myEmitter.emit("log", `${req.url}\t${req.method}`, 'reqLog.txt');

  const extension = path.extname(req.url);

  let contextType;

  switch (extension) {
    case ".css":
      contextType = "text/css";
      break;
    case ".json":
      contextType = "application/json";
      break;
    case ".js":
      contextType = "text/javascript";
      break;
    case ".jpg":
      contextType = "image/jpeg";
      break;
    case ".png":
      contextType = "image/png";
      break;
    case ".txt":
      contextType = "text/plain";
      break;
    default:
      contextType = "text/html";
  }

  let filePath =
    contextType === "text/html" && req.url === "/"
      ? path.join(__dirname, "views", "index.html")
      : contextType === "text/html" && req.url.slice(-1) === "/"
      ? path.join(__dirname, "views", req.url, "index.html")
      : contextType === "text/html"
      ? path.join(__dirname, "views", req.url)
      : path.join(__dirname, req.url);

  if (!extension && req.url.slice(-1) !== "/") filePath += ".html";

  const fileExist = fs.existsSync(filePath);

  if (fileExist) {
    serveFile(filePath, contextType, res);
  } else {
    switch (path.parse(filePath).base) {
      case "old-page.html":
        res.writeHead(301, { location: "/new-page.html" });
        res.end();
        break;
      case "www-page.html":
        res.writeHead(301, { location: "/" });
        res.end();
        break;
      default:
        serveFile(path.join(__dirname, "views", "404.html"), "text/html", res);
    }
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));




