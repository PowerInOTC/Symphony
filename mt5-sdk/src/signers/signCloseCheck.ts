import {
  signedCloseQuoteResponse,
  PionerWebsocketClient,
  WebSocketType,
  getSignedCloseQuotes,
} from '@pionerfriends/api-client';
import { hedger } from '../broker/inventory';
import { extractSymbolFromAssetHex } from '../utils/ethersUtils';
import {
  networks,
  NetworkKey,
  BContract,
} from '@pionerfriends/blockchain-client';
import { getTripartyLatestPrice } from '../broker/tripartyPrice';
import { closeQuoteSignValueType } from '../blockchain/types';
import { minAmountSymbol } from '../broker/minAmount';

export async function signCloseCheck(close: signedCloseQuoteResponse) {
  let isCheck = true;

  const symbol = extractSymbolFromAssetHex(close.assetHex);
  const pair = `${symbol.assetAId}/${symbol.assetAId}`;
  const tripartyLatestPrice = await getTripartyLatestPrice(
    `${symbol.assetAId}/${symbol.assetAId}`,
  );
  /** Test price + spread is profitable for hedger  */
  if (close.isLong) {
    if (Number(tripartyLatestPrice.ask) <= Number(close.price) * (1 + 0.0001)) {
      isCheck = false;
      throw new Error('close price is too low');
    }
  }
  if (!close.isLong) {
    if (Number(tripartyLatestPrice.bid) >= Number(close.price) * (1 - 0.0001)) {
      isCheck = false;
      throw new Error('close price is too high');
    }
  }

  /** Test partial close is bigger than min amount */
  const minAmount = await minAmountSymbol(pair);
  if (Number(close.amount) < Number(minAmount)) {
    isCheck = false;
    throw new Error('close amount is too low');
  }

  const isPassed = await hedger(
    pair,
    Number(close.price),
    close.signatureOpenQuote,
    Number(close.amount),
    close.isLong,
    false,
  );

  isPassed === true ? (isCheck = false) : (isCheck = true);

  if (isCheck === false) {
    throw new Error('hedger failed');
  }

  return isCheck;
}
