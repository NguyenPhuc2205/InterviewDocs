# WebSocket & Realtime

> **Kiến thức realtime** — WebSocket, Socket.IO, SSE, Long Polling. Biết để trả lời: "Bạn implement chat/notifications thời gian thực thế nào?"

---

# 1. HTTP Polling vs SSE vs WebSocket

## Short Polling

```
Client ──► GET /messages (mỗi 3 giây)
Server ──► 200 [] (chưa có gì)
Client ──► GET /messages
Server ──► 200 [] (vẫn chưa)
Client ──► GET /messages
Server ──► 200 [{message: "Hi!"}] ← có tin nhắn mới!
```

**Nhược điểm**: Tốn bandwidth (request liên tục), delay (chờ interval), server load cao.

## Long Polling

```
Client ──► GET /messages     ← request "treo"
Server ──► (giữ connection, chờ đến khi có data mới)
           ... 30 giây sau ...
Server ──► 200 [{message: "Hi!"}] ← có data → trả về
Client ──► GET /messages     ← lập tức request lại
```

**Cải thiện**: Ít request liên tục hơn, response nhanh hơn khi có data. Vẫn overhead mỗi lần reconnect.

## SSE (Server-Sent Events)

```
Client ──► GET /events (Accept: text/event-stream)
Server ──► 200 OK (keep connection open)
           data: {"message": "Hi!"}\n\n          ← push event 1
           data: {"message": "Hello!"}\n\n       ← push event 2
           ...                                    ← server tiếp tục push
```

**Đặc điểm**:
- **Unidirectional** — chỉ server → client
- Dùng HTTP thường, auto-reconnect
- Dùng cho: notifications, live feed, stock prices

## WebSocket

```
Client ──► GET /ws (Upgrade: websocket)         ← HTTP handshake
Server ──► 101 Switching Protocols              ← upgrade thành công

Client ◄──────────── Full-duplex ──────────────► Server
           cả 2 phía gửi messages bất kỳ lúc nào
```

**Đặc điểm**:
- **Bidirectional** — cả client VÀ server gửi nhận
- Persistent connection (không reconnect)
- Dùng cho: chat, gaming, collaborative editing

### So sánh tổng quan

| | Short Polling | Long Polling | SSE | WebSocket |
|---|---|---|---|---|
| **Direction** | Client → Server | Client → Server | Server → Client | Bidirectional |
| **Connection** | New mỗi request | ½ persistent | Persistent | Persistent |
| **Latency** | 🔴 Cao (interval) | 🟡 Trung bình | 🟢 Thấp | 🟢 Thấp |
| **Overhead** | 🔴 Cao | 🟡 Trung bình | 🟢 Thấp | 🟢 Thấp |
| **Complexity** | 🟢 Đơn giản | 🟡 Trung bình | 🟢 Đơn giản | 🟡 Phức tạp |
| **Use case** | Legacy, đơn giản | Tương thích cao | Notifications | Chat, gaming |

---

# 2. WebSocket Protocol — Chi tiết

## Handshake (HTTP Upgrade)

```
Client request:
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket                    ← yêu cầu upgrade
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZQ==  ← base64 random key
Sec-WebSocket-Version: 13

Server response:
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9k...  ← hash(Key + magic GUID)
```

Sau handshake → **TCP connection** chuyển thành WebSocket → gửi nhận frames.

## WebSocket Frames

```
Mỗi message được gửi dưới dạng "frame":
┌──────────┬──────────┬─────────────┐
│ Opcode   │ Length   │ Payload     │
│ (text/   │          │ (data)      │
│ binary/  │          │             │
│ ping/    │          │             │
│ pong/    │          │             │
│ close)   │          │             │
└──────────┴──────────┴─────────────┘
```

## Heartbeat (Ping/Pong)

Server gửi **PING** → Client trả **PONG** → xác nhận connection còn sống.
Nếu không nhận PONG sau timeout → connection dead → close + reconnect.

---

# 3. Socket.IO

## Là gì?

Socket.IO **KHÔNG phải WebSocket**. Nó là một library build **trên** WebSocket với nhiều features bổ sung:
- Auto reconnection
- Fallback (polling → WebSocket)
- Rooms & Namespaces
- Acknowledgements
- Binary support

```
Socket.IO = WebSocket + Polling fallback + Extra features
```

## Rooms & Namespaces

```typescript
// Namespace — tách logic (như routes)
const chatNamespace = io.of('/chat');
const adminNamespace = io.of('/admin');

chatNamespace.on('connection', (socket) => {
  // Room — group sockets
  socket.join('room:general');        // tham gia room

  // Gửi tới tất cả trong room (trừ sender)
  socket.to('room:general').emit('message', { text: 'Hello!' });

  // Gửi tới tất cả trong room (kể cả sender)
  chatNamespace.to('room:general').emit('announcement', 'Welcome!');

  socket.on('disconnect', () => {
    socket.leave('room:general');     // rời room
  });
});
```

## Acknowledgements

```typescript
// Client gửi + chờ xác nhận từ server
socket.emit('send-message', { text: 'Hi!' }, (response) => {
  console.log('Server confirmed:', response);
  // → { status: 'ok', messageId: 123 }
});

// Server xác nhận
socket.on('send-message', (data, callback) => {
  const saved = saveMessage(data);
  callback({ status: 'ok', messageId: saved.id }); // ← gửi xác nhận về client
});
```

---

# 4. NestJS WebSocket Gateway

```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Client kết nối
  handleConnection(client: Socket) {
    console.log(`Connected: ${client.id}`);
  }

  // Client ngắt kết nối
  handleDisconnect(client: Socket) {
    console.log(`Disconnected: ${client.id}`);
  }

  // Lắng nghe event 'send-message'
  @SubscribeMessage('send-message')
  handleMessage(
    @MessageBody() data: { text: string; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Gửi tới tất cả trong room (trừ sender)
    client.to(`room:${data.roomId}`).emit('new-message', {
      text: data.text,
      sender: client.id,
      timestamp: new Date(),
    });

    // Return = gửi acknowledgement về client
    return { status: 'ok' };
  }

  // Join room
  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`room:${roomId}`);
    this.server.to(`room:${roomId}`).emit('user-joined', {
      userId: client.id,
    });
  }
}
```

---

# 5. Scaling WebSocket

## Vấn đề

```
Server 1: [User A, User B] ← connected
Server 2: [User C, User D] ← connected

User A gửi message tới room có User D → User D ở Server 2 → KHÔNG nhận được!
```

## Giải pháp — Redis Adapter

```
Server 1 ──┐                ┌── Server 2
            ├── Redis Pub/Sub ──┤
Server 3 ──┘                └── Server 4

Message từ Server 1 → publish lên Redis → tất cả servers nhận → gửi tới clients
```

```typescript
// NestJS + Socket.IO Redis Adapter
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: 'redis://localhost:6379' });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);

    const server = this.createIOServer(port, options);
    server.adapter(createAdapter(pubClient, subClient));
  }
}

// main.ts
const redisAdapter = new RedisIoAdapter(app);
await redisAdapter.connectToRedis();
app.useWebSocketAdapter(redisAdapter);
```

## Sticky Sessions

Khi dùng Socket.IO (có HTTP polling fallback) + Load Balancer → client phải luôn kết nối tới **CÙNG server** (vì polling dùng HTTP, mỗi request có thể tới server khác).

```nginx
# Nginx sticky session
upstream websocket {
    ip_hash;                    # ← cùng IP → cùng server
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    location /socket.io/ {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;    # ← WebSocket upgrade
        proxy_set_header Connection "upgrade";
    }
}
```

---

# 6. Chốt — Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Key answer |
|---|---|
| WebSocket vs HTTP? | HTTP: request-response, stateless. WebSocket: persistent, bidirectional, full-duplex |
| WebSocket vs SSE? | WebSocket: bidirectional. SSE: server → client only. SSE đơn giản hơn, WebSocket linh hoạt hơn |
| Socket.IO có phải WebSocket? | Không. Socket.IO build trên WebSocket + polling fallback + rooms + namespaces + acknowledgements |
| Room vs Namespace? | Namespace: tách logic (routes). Room: group sockets trong 1 namespace |
| Scale WebSocket thế nào? | Redis adapter (pub/sub giữa servers) + sticky sessions cho polling fallback |
| Khi nào dùng WebSocket? | Chat, gaming, collaborative editing — cần bidirectional + low latency |
| Khi nào dùng SSE? | Notifications, live feed — chỉ server push, không cần client → server |
