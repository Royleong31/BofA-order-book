import Fill from '../Fill';
import OrderBookType from '../enums/OrderBookType';
import OrderSide from '../enums/OrderSide';
import Order from '../orders/Order';
import { compareTime } from '../utils/compareTime';

export default abstract class OrderBook {
  abstract venue: OrderBookType;

  // Only contain elements that have orders, so the array should never be empty
  // Use string for  price as numbers create rounding issues
  protected bidTable: Record<string, Order[]> = {}; //FIFO in from back of array, out from front
  protected askTable: Record<string, Order[]> = {};

  placeOrder(order: Order) {
    if (order.side === OrderSide.BUY) {
      this.bidTable[Number(order.price).toFixed(2)] ||= [];
      this.bidTable[Number(order.price).toFixed(2)].push(order);
    } else if (order.side === OrderSide.SELL) {
      this.askTable[Number(order.price).toFixed(2)] ||= [];
      this.askTable[Number(order.price).toFixed(2)].push(order);
    }
    this.match(order.effectiveTime);
  }

  // called continuously when order book changes
  // whenever bid, ask, cancel are called
  protected match(time: string) {
    let { highestBidPrice, lowestAskPrice } = this.getBestPrices();

    // each iteration will generate 1 fill
    while (highestBidPrice >= lowestAskPrice) {
      const clearingBid: Order = this.bidTable[highestBidPrice.toFixed(2)][0];
      const clearingAsk: Order = this.askTable[lowestAskPrice.toFixed(2)][0];
      // Want the earlier order to be the clearing price if the prices are different
      // Assumption: If time is the same, will use the clearingBid price
      // TODO: Use an order counter to tie-break same time

      const clearingPrice = compareTime(
        clearingAsk.effectiveTime,
        clearingBid.effectiveTime
      )
        ? clearingBid.price
        : clearingAsk.price;

      const fill = new Fill({
        askOrderId: clearingAsk.id,
        bidOrderId: clearingBid.id,
        price: clearingPrice,
        quantity: Math.min(
          clearingBid.remainingQuantity(),
          clearingAsk.remainingQuantity()
        ),
        time,
        venue: this.venue,
      });

      clearingBid.partiallyFillOrder(fill);
      clearingAsk.partiallyFillOrder(fill);

      if (clearingBid.remainingQuantity() === 0) {
        this.bidTable[highestBidPrice.toFixed(2)].shift();
        if (this.bidTable[highestBidPrice.toFixed(2)]?.length === 0) {
          delete this.bidTable[highestBidPrice.toFixed(2)];
        }
      }

      if (clearingAsk.remainingQuantity() === 0) {
        this.askTable[lowestAskPrice.toFixed(2)].shift();
        if (this.askTable[lowestAskPrice.toFixed(2)]?.length === 0) {
          delete this.askTable[lowestAskPrice.toFixed(2)];
        }
      }

      const buyPrices = Object.keys(this.bidTable)
        .map((price) => price)
        .sort((a, b) => +b - +a);

      // asc order
      const sellPrices = Object.keys(this.askTable)
        .map((price) => price)
        .sort((a, b) => +a - +b);

      if (buyPrices.length === 0) {
        this.bidTable = {};
        break;
      }
      if (sellPrices.length === 0) {
        this.askTable = {};
        break;
      }

      highestBidPrice = Number(buyPrices[0]);
      lowestAskPrice = Number(sellPrices[0]);
    }
  }

  getBestPrices() {
    // desc order
    const buyPrices = Object.keys(this.bidTable)
      .map((price) => price)
      .sort((a, b) => +b - +a);

    // asc order
    const sellPrices = Object.keys(this.askTable)
      .map((price) => price)
      .sort((a, b) => +a - +b);

    // first element is best price
    let highestBidPrice = Number(buyPrices[0]);
    let lowestAskPrice = Number(sellPrices[0]);
    return { highestBidPrice, lowestAskPrice };
  }

  // remove from order book but keep in OrderRouter
  // ?: Test data not using this, it's just for completeness
  cancelOrder(order: Order) {
    order.cancel();

    if (order.side === OrderSide.BUY) {
      if (this.bidTable[Number(order.price).toFixed(2)] === undefined) {
        this.bidTable[Number(order.price).toFixed(2)] = [];
      }

      this.bidTable[Number(order.price).toFixed(2)] = this.bidTable[
        Number(order.price).toFixed(2)
      ].filter((prev) => prev.id != order.id);

      if (this.bidTable[Number(order.price).toFixed(2)].length === 0) {
        delete this.bidTable[Number(order.price).toFixed(2)];
      }
    } else if (order.side === OrderSide.SELL) {
      if (this.askTable[Number(order.price).toFixed(2)] === undefined) {
        this.askTable[Number(order.price).toFixed(2)] = [];
      }

      this.askTable[Number(order.price).toFixed(2)] = this.askTable[
        Number(order.price).toFixed(2)
      ].filter((prev) => prev.id != order.id);

      if (this.askTable[Number(order.price).toFixed(2)].length === 0) {
        delete this.askTable[Number(order.price).toFixed(2)];
      }
    }
  }
}
