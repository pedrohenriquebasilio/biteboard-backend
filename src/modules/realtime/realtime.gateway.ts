import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Em produção, configure para seu domínio específico
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('RealtimeGateway');
  private connectedClients: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
    this.connectedClients.set(client.id, client);

    // Enviar confirmação de conexão
    client.emit('connected', {
      message: 'Conectado ao servidor WebSocket',
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  // Eventos de Orders
  emitNewOrder(order: any) {
    this.logger.log(`Emitindo novo pedido: ${order.id}`);
    this.server.emit('new_order', {
      event: 'new_order',
      data: order,
      timestamp: new Date().toISOString(),
    });
  }

  emitOrderUpdated(order: any) {
    this.logger.log(
      `Emitindo atualização de pedido: ${order.id} - Status: ${order.status}`,
    );
    this.server.emit('order_updated', {
      event: 'order_updated',
      data: order,
      timestamp: new Date().toISOString(),
    });
  }

  emitOrderStatusChanged(
    orderId: string,
    oldStatus: string,
    newStatus: string,
  ) {
    this.logger.log(
      `Status do pedido ${orderId} mudou: ${oldStatus} -> ${newStatus}`,
    );
    this.server.emit('order_status_changed', {
      event: 'order_status_changed',
      data: {
        orderId,
        oldStatus,
        newStatus,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Eventos de Mensagens
  emitNewMessage(message: Record<string, unknown>) {
    this.logger.log(`Emitindo nova mensagem: ${String(message.id)}`);
    this.server.emit('message:new', {
      event: 'message:new',
      data: message,
      timestamp: new Date().toISOString(),
    });
  }

  // Mensagens customizadas
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', {
      message: 'pong',
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('subscribe_orders')
  handleSubscribeOrders(@ConnectedSocket() client: Socket): void {
    client.join('orders');
    client.emit('subscribed', {
      room: 'orders',
      message: 'Inscrito para receber atualizações de pedidos',
    });
  }

  @SubscribeMessage('unsubscribe_orders')
  handleUnsubscribeOrders(@ConnectedSocket() client: Socket): void {
    client.leave('orders');
    client.emit('unsubscribed', {
      room: 'orders',
      message: 'Desinscrito de atualizações de pedidos',
    });
  }

  // Estatísticas
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getConnectedClients(): string[] {
    return Array.from(this.connectedClients.keys());
  }
}
