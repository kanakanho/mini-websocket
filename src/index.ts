import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { env } from "hono/adapter";
import type { WSContext } from "hono/ws";

const app = new Hono();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get("/", (c) => {
  const { URL } = env<{ URL: string }>(c);
  return c.html(`<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mini WebSocket Client</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: black;
      }
      body {
        margin: 200px 10%;
        background-color: cadetblue;
      }
      h1 {
        margin: 10px 0;
      }
      h2 {
        margin: 10px 0;
      }
      #connect h2 {
        color: orange;
        font-weight: 600;
      }
      #message {
        display: grid;
        gap: 20px;
      }
      #message p {
        background-color: aliceblue;
        padding: 15px;
        border-radius: 10px;
      }
    </style>
  </head>
  <body>
    <h1 class="title">Mini WebSocket Client</h1>
    <div id="connect"></div>
    <div id="message"></div>
  </body>
  <script>
    const socket = new WebSocket(URL + "/wss");

    socket.addEventListener("open", (event) => {
      // 受信開始を表示
      const h2 = document.createElement("h2");
      h2.innerText = "Connected to server";
      document.getElementById("connect").appendChild(h2);
    });

    socket.addEventListener("message", (event) => {
      // メッセージを表示
      const p = document.createElement("p");
      // 月/日/年 時:分:秒.ミリ秒
      const date = new Date().toLocaleString();
      p.innerText = date + "|" + event.data;
      document.getElementById("message").appendChild(p);
    });

    socket.addEventListener("error", (event) => {
      // エラーメッセージを追加
      const p = document.createElement("p");
      p.innerText = "WebSocket connection failed";
      document.getElementById("message").appendChild(p);
    });

    socket.addEventListener("close", (event) => {
      // 接続が閉じられたことを表示
      const p = document.createElement("p");
      p.innerText = "WebSocket connection closed";
      document.getElementById("message").appendChild(p);
    });
  </script>
</html>`);
});

const clients = new Set<WSContext>();

app.get(
  "/wss",
  upgradeWebSocket(() => {
    console.info(Date.now(), "Client connected");
    return {
      async onOpen(_, ws) {
        clients.add(ws);
        console.info("Client connected");
        Array.from(clients).map((client) => {
          client.send("New client connected");
        });
      },
      async onMessage(event, ws) {
        Array.from(clients).map((client) => {
          if (client !== ws) {
            client.send(`Message from client: ${event.data}`);
          }
        });
      },
      async onClose(_, ws) {
        console.info("Connection closed");
        clients.delete(ws);
      },
      async onError(_, ws) {
        console.error("WebSocket error");
      },
    };
  }),
);

const port = Number(process.env.PORT) || 3000;
console.log(`Server listening on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port,
});

injectWebSocket(server);
