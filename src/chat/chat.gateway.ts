import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  // When user joins a room
  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { roomId: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);

    client.to(data.roomId).emit('user-joined', {
      username: data.username,
    });
  }

  // When user sends message
  @SubscribeMessage('send-message')
  handleMessage(
    @MessageBody()
    data: { roomId: string; message: string; username: string },
  ) {
    this.server.to(data.roomId).emit('new-message', {
      username: data.username,
      message: data.message,
      time: new Date(),
    });
  }
}
