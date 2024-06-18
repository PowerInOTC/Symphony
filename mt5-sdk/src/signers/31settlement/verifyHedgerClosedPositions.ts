// hedgerSafetyCheck.ts
import { isPositionOpen, getFirst12Characters } from '../../broker/utils';
import { Hedger } from '../../broker/inventory';
import { getMT5Ticker } from '../../config/configRead';
import { getCachedPositions } from './cachePositions';
import { config } from '../../config';
import { getOpenPositions, Position } from '../../broker/dispatcher';
import { PositionResponse } from '@pionerfriends/api-client';
import { isNoHedgeAddress } from '../../utils/check';

class HedgerSafetyCheck {
  private localClosedPositions: { [key: string]: number } = {};
  private hedger: Hedger;
  private noHedgeList: string[] = [];

  constructor() {
    this.hedger = new Hedger();
  }

  private async isPositionClosed(
    openPositions: Position[],
    mt5Ticker: string,
    identifier: string,
    isLong: boolean,
  ): Promise<boolean> {
    return !(await isPositionOpen(
      openPositions,
      mt5Ticker,
      identifier,
      isLong,
    ));
  }

  private async processClosedPosition(
    position: PositionResponse,
    isLong: boolean,
  ) {
    const isPassed = await this.hedger.hedge(
      position.symbol,
      parseFloat(position.mtm),
      position.signatureOpenQuote,
      Number(position.amount),
      isLong,
      false,
      '0x0000000000000000000000000000000000000000',
    );
    if (!isPassed) {
      console.log('Hedger failed');
    }
  }

  private async verifyHedgerClosedPositions(token: string) {
    const openPositions = await getOpenPositions('mt5.ICMarkets');
    const cachedPositions = await getCachedPositions();

    for (const position of cachedPositions) {
      const extractHash = (input: string): string | null => {
        const match = input.match(/"hash":"(0x[0-9a-fA-F]+)"/);
        return match ? match[1] : null;
      };

      const hash = extractHash(position.signatureOpenQuote);
      console.log(
        'position',
        position.bContractId,
        position.symbol,
        position.entryPrice,
        hash,
      );

      if (hash !== null) {
        const identifier = getFirst12Characters(hash);
        const [assetA, assetB] = position.symbol.split('/');
        const mt5TickerA = getMT5Ticker(assetA);
        const mt5TickerB = getMT5Ticker(assetB);

        if (!mt5TickerA || !mt5TickerB) {
          continue;
        }

        const isLong = config.publicKeys?.split(',')[0] === position.pB;

        if (
          (await isNoHedgeAddress(position.pA)) ||
          (await isNoHedgeAddress(position.pB))
        ) {
          continue;
        }

        const isAOpenned = await this.isPositionClosed(
          openPositions,
          mt5TickerA,
          identifier,
          isLong,
        );
        const isBOpenned = await this.isPositionClosed(
          openPositions,
          mt5TickerB,
          identifier,
          !isLong,
        );

        if (!isAOpenned && !isBOpenned) {
          const positionKey = `${position.symbol}_${position.signatureOpenQuote}`;

          if (this.localClosedPositions[positionKey]) {
            continue;
          }

          this.localClosedPositions[positionKey] = Date.now();

          setTimeout(async () => {
            const updatedOpenPositions =
              await getOpenPositions('mt5.ICMarkets');
            const isAStillClosed = await this.isPositionClosed(
              updatedOpenPositions,
              mt5TickerA,
              identifier,
              isLong,
            );
            const isBStillClosed = await this.isPositionClosed(
              updatedOpenPositions,
              mt5TickerB,
              identifier,
              !isLong,
            );

            if (isAStillClosed || isBStillClosed) {
              await this.processClosedPosition(position, isLong);
            }

            delete this.localClosedPositions[positionKey];
          }, 60000);
        }
      }
    }
  }

  public startHedgerSafetyCheckClose(token: string) {
    setInterval(() => {
      this.verifyHedgerClosedPositions(token).catch((error) => {
        console.error('Error during verification:', error);
      });
    }, 1000);
  }
}

export function startHedgerSafetyCheckClose(token: string) {
  const hedgerSafetyCheck = new HedgerSafetyCheck();
  hedgerSafetyCheck.startHedgerSafetyCheckClose(token);
}
