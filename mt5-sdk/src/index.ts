import dotenv from 'dotenv';
dotenv.config();

import { config } from './config';
import { Queue, Worker } from 'bullmq';
import { ethers } from 'ethers';
import {
  sendRfq,
  RfqWebsocketClient,
  RfqResponse,
  getPayloadAndLogin,
  sendQuote,
  QuoteRequest,
} from '@pionerfriends/api-client';

const rfqQueue = new Queue('rfq', {
  connection: {
    host: config.bullmqRedisHost,
    port: config.bullmqRedisPort,
    password: config.bullmqRedisPassword,
  },
});

console.log('rfqQueue', rfqQueue);

async function bullExample(): Promise<void> {
  const rpcURL = 'https://rpc.sonic.fantom.network/';
  const rpcKey = '';
  const provider: ethers.Provider = new ethers.JsonRpcProvider(
    `${rpcURL}${rpcKey}`,
  );
  const wallet = new ethers.Wallet(
    'b63a221a15a6e40e2a79449c0d05b9a1750440f383b0a41b4d6719d7611607b4',
    provider,
  );

  const token = await getPayloadAndLogin(wallet);
  if (!wallet || !token) {
    console.log('login failed');
    return;
  }

  const websocketClient = new RfqWebsocketClient(
    (message: RfqResponse) => {
      rfqQueue.add('rfq', message);
    },
    (error) => {
      console.error('WebSocket error:', error);
    },
  );
  await websocketClient.startWebSocket(token);

  new Worker(
    'rfq',
    async (job) => {
      const data: RfqResponse = job.data;
      const quote: QuoteRequest = await rfqToQuote(data);

      sendQuote(quote, token);
      console.log(`Processing job ${job.id}: ${JSON.stringify(data)}`);
    },
    {
      connection: {
        host: config.bullmqRedisHost,
        port: config.bullmqRedisPort,
        password: config.bullmqRedisPassword,
      },
      removeOnComplete: { count: 0 },
      //removeOnFail: { count: 0 }
    },
  );

  const rfqToQuote = async (rfq: RfqResponse): Promise<QuoteRequest> => {
    return {
      chainId: rfq.chainId,
      rfqId: rfq.id,
      expiration: rfq.expiration,
      sMarketPrice: '1',
      sPrice: rfq.sPrice,
      sQuantity: rfq.sQuantity,
      lMarketPrice: '1',
      lPrice: rfq.lPrice,
      lQuantity: rfq.lQuantity,
    };
  };
}

bullExample();
