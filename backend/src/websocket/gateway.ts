import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class Gateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-surgery')
  handleJoinSurgery(client: Socket, payload: { surgeryId: string }) {
    client.join(`surgery:${payload.surgeryId}`);
    console.log(`Client ${client.id} joined surgery ${payload.surgeryId}`);
  }

  @SubscribeMessage('leave-surgery')
  handleLeaveSurgery(client: Socket, payload: { surgeryId: string }) {
    client.leave(`surgery:${payload.surgeryId}`);
    console.log(`Client ${client.id} left surgery ${payload.surgeryId}`);
  }
}
