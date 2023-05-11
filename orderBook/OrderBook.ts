import Fill from "../Fill";
import OrderBookType from "../enums/OrderBookType";
import OrderSide from "../enums/OrderSide";
import Order from "../orders/Order";
import { compareTime } from "../utils/compareTime";

export default abstract class OrderBook {
  abstract venue: OrderBookType;

  // Only contain elements that have orders, so the array should never be empty
  protected bidTable: Record<number, Order[]> = {}; //FIFO in from back of array, out from front
  protected askTable: Record<number, Order[]> = {};

  placeOrder(order: Order) {
    if (order.side === OrderSide.BUY) {
      this.bidTable[order.price].push(order);
    } else if (order.side === OrderSide.SELL) {
      this.askTable[order.price].push(order);
    }

    this.match(order.effectiveTime);
  }

  cancel(order: Order) {
    if (order.side == OrderSide.BUY) {
      this.bidTable[order.price] = this.bidTable[order.price].filter((prev) => prev.id != order.id);
    } else {
      this.askTable[order.price] = this.askTable[order.price].filter((prev) => prev.id != order.id);
    }
    this.match(order.effectiveTime);
  }

  // called continuously when order book changes
  // whenever bid, ask, cancel are called
  protected match(time: string) {
    // desc order
    const buyPrices = Object.keys(this.bidTable)
      .map((price) => parseInt(price))
      .sort((a, b) => b - a);

    // asc order
    const sellPrices = Object.keys(this.askTable)
      .map((price) => parseInt(price))
      .sort((a, b) => a - b);

    let highestBidPrice = buyPrices[0];
    let lowestAskPrice = sellPrices[0];

    while (highestBidPrice >= lowestAskPrice) {
      // each iteraction will generate 1 fill
      const clearingBid = this.bidTable[highestBidPrice][0];
      const clearingAsk = this.askTable[lowestAskPrice][0];
      // want the earlier order to be the clearing price if the prices are different
      // if it's the same, will use the clearingBid price
      // TODO: Use an order counter
      const price = compareTime(clearingBid.effectiveTime, clearingAsk.effectiveTime)
        ? clearingAsk.price
        : clearingBid.price;

      const fill = new Fill({
        askOrderId: clearingAsk.id,
        bidOrderId: clearingBid.id,
        price: price,
        quantity: Math.min(clearingBid.remainingQuantity(), clearingAsk.remainingQuantity()),
        time,
        venue: this.venue,
      });

      clearingBid.partiallyFillOrder(fill);
      clearingAsk.partiallyFillOrder(fill);

      if (clearingBid.remainingQuantity() === 0) {
        this.bidTable[highestBidPrice].shift();
        if (this.bidTable[highestBidPrice].length === 0) {
          delete this.bidTable[highestBidPrice];
        }
      }

      if (clearingAsk.remainingQuantity() === 0) {
        this.askTable[lowestAskPrice].shift();
        if (this.bidTable[highestBidPrice].length === 0) {
          delete this.bidTable[highestBidPrice];
        }
      }

      const buyPrices = Object.keys(this.bidTable)
        .map((price) => parseInt(price))
        .sort((a, b) => b - a);

      // asc order
      const sellPrices = Object.keys(this.askTable)
        .map((price) => parseInt(price))
        .sort((a, b) => a - b);

      highestBidPrice = buyPrices[0];
      lowestAskPrice = sellPrices[0];

      if (clearingAsk.onFillCallback) {
        clearingAsk.onFillCallback(fill);
      }

      if (clearingBid.onFillCallback) {
        clearingBid.onFillCallback(fill);
      }
    }
  }

  // remove from order book but keep in OrderRouter
  cancelOrder(order: Order) {
    order.cancel();

    if (order.side === OrderSide.BUY) {
      this.bidTable[order.price] = this.bidTable[order.price].filter((prev) => prev.id != order.id);

      if (this.bidTable[order.price].length === 0) {
        delete this.bidTable[order.price];
      }
    } else if (order.side === OrderSide.SELL) {
      this.askTable[order.price] = this.askTable[order.price].filter((prev) => prev.id != order.id);

      if (this.askTable[order.price].length === 0) {
        delete this.askTable[order.price];
      }
    }
  }
}
