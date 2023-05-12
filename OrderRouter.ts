import LitPool from './orderBook/LitPool';
import DarkPool from './orderBook/DarkPool';
import { OrderInput } from './OrderInjector';
import Order from './orders/Order';
import OrderSide from './enums/OrderSide';
import OrderStatus from './enums/OrderStatus';
import OrderBookType from './enums/OrderBookType';
import Fill from './Fill';
import _ from 'lodash';

export default class Router {
  private litPool: LitPool;
  private darkPool: DarkPool;

  // Used to calculate estimate of current book state of dark pool
  private sorDarkPoolFills: Fill[] = [];
  private sorDarkPoolOrdersPlaced: Order[] = [];

  constructor(litPool: LitPool, darkPool: DarkPool) {
    this.litPool = litPool;
    this.darkPool = darkPool;
  }

  addToLitPool(order: Order) {
    this.litPool.placeOrder(order);
  }

  addToDarkPool(order: Order) {
    this.darkPool.placeOrder(order);
  }

  addToSOR(time: string, orderInput: OrderInput) {
    // TODO: Calculate splitting
    // TODO: Change order id so no collision
    const qntToDarkPool = this.calculateQuantityToDarkPool(
      orderInput.price,
      orderInput.quantity,
      orderInput.side
    );

    // Splitting orders in half for SOR for lit and dark pools for now
    const darkPoolOrder = new Order({
      id: orderInput.id,
      effectiveTime: time,
      price: orderInput.price,
      quantity: qntToDarkPool,
      side: orderInput.side,
      status: OrderStatus.NEW,
      venue: OrderBookType.DARK_POOL,
      onFillCallback: (fill: Fill) => {
        this.sorDarkPoolFills.push(fill);
      },
    });

    const litPoolOrder = new Order({
      id: orderInput.id,
      effectiveTime: time,
      price: orderInput.price,
      quantity: orderInput.quantity - qntToDarkPool,
      side: orderInput.side,
      status: OrderStatus.NEW,
      venue: OrderBookType.LIT_POOL,
    });

    this.sorDarkPoolOrdersPlaced.push(darkPoolOrder);

    this.darkPool.placeOrder(darkPoolOrder);
    this.litPool.placeOrder(litPoolOrder);
  }

  calculateQuantityToDarkPool(
    price: number,
    quantity: number,
    side: OrderSide
  ) {
    // const litPoolCurBook = this.litPool.getBookData();

    // bid/ask tables of orders by the SOR into the dark pool
    const darkPoolSubsetBids: Record<string, number> = {};
    const darkPoolSubsetAsks: Record<string, number> = {};

    // const litPoolBids: Record<string, number> = {};
    // const litPoolAsks: Record<string, number> = {};

    for (let order of this.sorDarkPoolOrdersPlaced) {
      if (order.side === OrderSide.BUY) {
        if (darkPoolSubsetBids[Number(order.price).toFixed(2)] === undefined) {
          darkPoolSubsetBids[Number(order.price).toFixed(2)] = 0;
        }

        darkPoolSubsetBids[Number(order.price).toFixed(2)] +=
          order.remainingQuantity();
      } else {
        if (darkPoolSubsetAsks[Number(order.price).toFixed(2)] === undefined) {
          darkPoolSubsetAsks[Number(order.price).toFixed(2)] = 0;
        }

        darkPoolSubsetAsks[Number(order.price).toFixed(2)] +=
          order.remainingQuantity();
      }
    }

    // remove empty prices
    for (let price in darkPoolSubsetAsks) {
      if (darkPoolSubsetAsks[price] === 0) {
        delete darkPoolSubsetAsks[price];
      }
    }

    for (let price in darkPoolSubsetBids) {
      if (darkPoolSubsetBids[price] === 0) {
        delete darkPoolSubsetBids[price];
      }
    }

    // const litPoolAskTable = litPoolCurBook.askTable;
    // for (let price in litPoolAskTable) {
    //   const orderData = litPoolAskTable[price];
    //   const totalQuantity = orderData.reduce((acc, cur) => acc + cur.remainingQuantity(), 0);

    //   if (totalQuantity > 0) {
    //     litPoolAsks[Number(price).toFixed(2)] = totalQuantity;
    //   }
    // }

    // const litPoolBidTable = litPoolCurBook.bidTable;
    // for (let price in litPoolBidTable) {
    //   const orderData = litPoolBidTable[price];
    //   const totalQuantity = orderData.reduce((acc, cur) => acc + cur.remainingQuantity(), 0);

    //   if (totalQuantity > 0) {
    //     litPoolBids[Number(price).toFixed(2)] = totalQuantity;
    //   }
    // }

    // Super simple algo to clear as many orders as possible through dark pool with full certainty of filling to minimise commissions
    let quantityBetterThanOrderPrice = 0;
    if (side === OrderSide.BUY) {
      const askPricesBetterThanOrderPrice = Object.keys(
        darkPoolSubsetAsks
      ).filter((askPrice) => Number(askPrice) <= price);

      for (let askPrice of askPricesBetterThanOrderPrice) {
        quantityBetterThanOrderPrice += darkPoolSubsetAsks[askPrice];
      }
    } else {
      const bidPricesBetterThanOrderPrices = Object.keys(
        darkPoolSubsetBids
      ).filter((bidPrice) => Number(bidPrice) >= price);

      for (let quantityAboveAskPrice of bidPricesBetterThanOrderPrices) {
        quantityBetterThanOrderPrice +=
          darkPoolSubsetBids[quantityAboveAskPrice];
      }
    }

    return quantityBetterThanOrderPrice;
  }
}
