import { WebSocketServer, WebSocket } from "ws";

interface ConnectedClient {
  ws: WebSocket;
  userId?: string;
  walletAddress?: string;
}

class WebSocketService {
  private clients: Set<ConnectedClient> = new Set();

  addClient(ws: WebSocket, userId?: string, walletAddress?: string) {
    const client: ConnectedClient = { ws, userId, walletAddress };
    this.clients.add(client);

    ws.on('close', () => {
      this.clients.delete(client);
    });

    return client;
  }

  broadcast(event: string, data: any) {
    const message = JSON.stringify({ event, data, timestamp: Date.now() });
    
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  sendToUser(userId: string, event: string, data: any) {
    const message = JSON.stringify({ event, data, timestamp: Date.now() });
    
    this.clients.forEach(client => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  sendToWallet(walletAddress: string, event: string, data: any) {
    const message = JSON.stringify({ event, data, timestamp: Date.now() });
    
    this.clients.forEach(client => {
      if (client.walletAddress?.toLowerCase() === walletAddress.toLowerCase() && 
          client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  notifyNewListing(listing: any) {
    this.broadcast('new_listing', listing);
  }

  notifyListingUpdate(listing: any) {
    this.broadcast('listing_updated', listing);
  }

  notifyTransaction(transaction: any) {
    this.broadcast('new_transaction', transaction);
    
    // Send specific notifications to buyer and seller
    if (transaction.buyer?.walletAddress) {
      this.sendToWallet(transaction.buyer.walletAddress, 'transaction_completed', {
        ...transaction,
        type: 'purchase'
      });
    }
    
    if (transaction.seller?.walletAddress) {
      this.sendToWallet(transaction.seller.walletAddress, 'transaction_completed', {
        ...transaction,
        type: 'sale'
      });
    }
  }

  notifyBalanceUpdate(walletAddress: string, balances: { ethBalance: string, energyBalance: string }) {
    this.sendToWallet(walletAddress, 'balance_updated', balances);
  }
}

export const wsService = new WebSocketService();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection from:', req.url);

    // Only handle connections to our specific WebSocket path (allow query parameters)
    if (!req.url?.startsWith('/api/ws')) {
      return; // Ignore other WebSocket connections (like Vite HMR)
    }

    console.log('New EnergyMarket WebSocket connection');

    // Parse query parameters for authentication
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    const walletAddress = url.searchParams.get('walletAddress');

    const client = wsService.addClient(ws, userId || undefined, walletAddress || undefined);

    // Send welcome message
    ws.send(JSON.stringify({
      event: 'connected',
      data: { message: 'Connected to EnergyMarket real-time updates' },
      timestamp: Date.now()
    }));

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle ping/pong for connection keepalive
        if (message.event === 'ping') {
          ws.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
        }
        
        // Handle authentication updates
        if (message.event === 'authenticate' && message.data) {
          client.userId = message.data.userId;
          client.walletAddress = message.data.walletAddress;
        }
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });
}