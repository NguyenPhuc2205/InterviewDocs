# WebSocket & Thời gian thực — WebSocket & Realtime

> Tài liệu ôn tập phỏng vấn — kiến thức giao tiếp thời gian thực (realtime): WebSocket (kết nối hai chiều), Socket.IO (thư viện thời gian thực), SSE (sự kiện gửi từ server), Long Polling (hỏi vòng dài). Biết để trả lời: "Bạn triển khai chat/thông báo thời gian thực thế nào?"

---

# 1. So sánh các phương thức giao tiếp thời gian thực (HTTP Polling, SSE, WebSocket)

## Short Polling (Hỏi vòng ngắn)

```
Client ──► GET /messages (mỗi 3 giây)
Server ──► 200 [] (chưa có gì)
Client ──► GET /messages
Server ──► 200 [] (vẫn chưa)
Client ──► GET /messages
Server ──► 200 [{message: "Hi!"}] ← có tin nhắn mới!
```

**Nhược điểm**: Tốn bandwidth (request liên tục), delay (chờ interval), server load cao.

## Long Polling (Hỏi vòng dài)

```
Client ──► GET /messages     ← request "treo"
Server ──► (giữ connection, chờ đến khi có data mới)
           ... 30 giây sau ...
Server ──► 200 [{message: "Hi!"}] ← có data → trả về
Client ──► GET /messages     ← lập tức request lại
```

**Cải thiện**: Ít request liên tục hơn, response nhanh hơn khi có data. Vẫn overhead mỗi lần reconnect.

## SSE (Server-Sent Events — Sự kiện gửi từ server)

```
Client ──► GET /events (Accept: text/event-stream)
Server ──► 200 OK (keep connection open)
           data: {"message": "Hi!"}\n\n          ← push event 1
           data: {"message": "Hello!"}\n\n       ← push event 2
           ...                                    ← server tiếp tục push
```

**Đặc điểm:**
- **Đơn hướng (Unidirectional)** — chỉ server → client (client không gửi lại được)
- Dùng giao thức HTTP thường, tự động kết nối lại (auto-reconnect)
- Phù hợp khi: thông báo (notifications), dòng tin trực tiếp (live feed), giá cổ phiếu

## WebSocket

```
Client ──► GET /ws (Upgrade: websocket)         ← HTTP handshake
Server ──► 101 Switching Protocols              ← upgrade thành công

Client ◄──────────── Full-duplex ──────────────► Server
           cả 2 phía gửi messages bất kỳ lúc nào
```

**Đặc điểm:**
- **Hai chiều (Bidirectional)** — cả client VÀ server đều gửi nhận được
- Kết nối liên tục (persistent connection) — không cần kết nối lại
- Phù hợp khi: nhắn tin (chat), trò chơi trực tuyến (gaming), soạn thảo cộng tác (collaborative editing)

### Bảng so sánh tổng quan

| | Short Polling | Long Polling | SSE | WebSocket |
|---|---|---|---|---|
| **Hướng** | Client → Server | Client → Server | Server → Client | Hai chiều (Bidirectional) |
| **Kết nối** | Tạo mới mỗi lần | Nửa liên tục | Liên tục (Persistent) | Liên tục (Persistent) |
| **Độ trễ** | 🔴 Cao (chờ khoảng lặp) | 🟡 Trung bình | 🟢 Thấp | 🟢 Thấp |
| **Chi phí** | 🔴 Cao (yêu cầu liên tục) | 🟡 Trung bình | 🟢 Thấp | 🟢 Thấp |
| **Độ phức tạp** | 🟢 Đơn giản | 🟡 Trung bình | 🟢 Đơn giản | 🟡 Phức tạp |
| **Phù hợp khi** | Legacy, đơn giản | Tương thích cao | Thông báo, dòng tin | Chat, trò chơi |

---

# 2. Giao thức WebSocket — Chi tiết

## Bắt tay (Handshake) — nâng cấp từ HTTP

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

## Khung dữ liệu WebSocket (WebSocket Frames)

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

## Nhịp tim (Heartbeat — Ping/Pong)

Server gửi khung **PING** → Client trả khung **PONG** → xác nhận kết nối còn sống.
Nếu không nhận PONG sau thời gian chờ (timeout) → kết nối đã chết → đóng + kết nối lại.

---

# 3. Socket.IO

## Khái niệm

Socket.IO **KHÔNG PHẢI WebSocket**. Nó là một thư viện được xây dựng **trên** WebSocket với nhiều tính năng bổ sung:
- Tự động kết nối lại (auto reconnection)
- Phương án dự phòng (fallback): polling → WebSocket
- Phòng (Rooms) & Không gian tên (Namespaces)
- Xác nhận (Acknowledgements)
- Hỗ trợ dữ liệu nhị phân (Binary support)

```
Socket.IO = WebSocket + Polling fallback + Extra features
```

## Phòng và Không gian tên (Rooms & Namespaces)

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

## Xác nhận (Acknowledgements)

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

# 4. Cổng WebSocket trong NestJS (NestJS WebSocket Gateway)

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

# 5. Mở rộng WebSocket (Scaling WebSocket)

## Vấn đề khi có nhiều server

```
Server 1: [User A, User B] ← connected
Server 2: [User C, User D] ← connected

User A gửi message tới room có User D → User D ở Server 2 → KHÔNG nhận được!
```

## Giải pháp — Redis Adapter (Bộ chuyển đổi Redis)

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

## Phiên cố định (Sticky Sessions)

Khi dùng Socket.IO (có phương án dự phòng HTTP polling) kết hợp với bộ cân bằng tải → client phải luôn kết nối tới **CÙNG server** (vì polling dùng HTTP, mỗi yêu cầu có thể tới server khác → mất phiên).

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

# 6. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| WebSocket khác HTTP thế nào? | HTTP: yêu cầu-phản hồi (request-response), không trạng thái (stateless). WebSocket: kết nối liên tục (persistent), hai chiều (bidirectional), song công toàn phần (full-duplex) |
| WebSocket khác SSE thế nào? | WebSocket: hai chiều (client và server đều gửi được). SSE: chỉ server gửi về client (đơn hướng). SSE đơn giản hơn, WebSocket linh hoạt hơn |
| Socket.IO có phải WebSocket không? | Không. Socket.IO được xây dựng trên WebSocket + phương án dự phòng polling + phòng (rooms) + không gian tên (namespaces) + xác nhận (acknowledgements) |
| Room khác Namespace thế nào? | Namespace: tách logic (đường đi — routes). Room: gộp nhóm các socket trong cùng 1 namespace |
| Mở rộng (scale) WebSocket thế nào? | Dùng Redis Adapter (xuất bản/đăng ký giữa các server — pub/sub) + phiên cố định (sticky sessions) cho phương án dự phòng polling |
| Khi nào dùng WebSocket? | Nhắn tin (chat), trò chơi trực tuyến (gaming), soạn thảo cộng tác — cần hai chiều + độ trễ thấp |
| Khi nào dùng SSE? | Thông báo (notifications), dòng tin trực tiếp (live feed) — chỉ cần server đẩy dữ liệu về client, không cần client gửi ngược lại |
