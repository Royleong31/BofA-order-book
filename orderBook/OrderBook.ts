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
      if (this.bidTable[order.price] === undefined) {
        this.bidTable[order.price] = [];
      }

      this.bidTable[order.price].push(order);
    } else if (order.side === OrderSide.SELL) {
      if (this.askTable[order.price] === undefined) {
        this.askTable[order.price] = [];
      }

      this.askTable[order.price].push(order);
    }

    this.match(order.effectiveTime);
  }

  // called continuously when order book changes
  // whenever bid, ask, cancel are called
  protected match(time: string) {
    // desc order
    const buyPrices = Object.keys(this.bidTable)
      .map((price) => price)
      .sort((a, b) => +b - +a);

    // asc order
    const sellPrices = Object.keys(this.askTable)
      .map((price) => price)
      .sort((a, b) => +a - +b);

    let highestBidPrice = Number(buyPrices[0]);
    let lowestAskPrice = Number(sellPrices[0]);

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
      console.log(fill);

      clearingBid.partiallyFillOrder(fill);
      clearingAsk.partiallyFillOrder(fill);

      if (clearingBid.remainingQuantity() === 0) {
        this.bidTable[highestBidPrice].shift();
        if (this.bidTable[highestBidPrice]?.length === 0) {
          delete this.bidTable[highestBidPrice];
        }
      }

      if (clearingAsk.remainingQuantity() === 0) {
        this.askTable[lowestAskPrice].shift();
        if (this.askTable[lowestAskPrice]?.length === 0) {
          delete this.askTable[lowestAskPrice];
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
      console.log(highestBidPrice, lowestAskPrice);
    }
  }

  // remove from order book but keep in OrderRouter
  // ?: Test data not using this, it's just for completeness
  cancelOrder(order: Order) {
    order.cancel();

    if (order.side === OrderSide.BUY) {
      if (this.bidTable[order.price] === undefined) {
        this.bidTable[order.price] = [];
      }

      this.bidTable[order.price] = this.bidTable[order.price].filter((prev) => prev.id != order.id);

      if (this.bidTable[order.price].length === 0) {
        delete this.bidTable[order.price];
      }
    } else if (order.side === OrderSide.SELL) {
      if (this.askTable[order.price] === undefined) {
        this.askTable[order.price] = [];
      }

      this.askTable[order.price] = this.askTable[order.price].filter((prev) => prev.id != order.id);

      if (this.askTable[order.price].length === 0) {
        delete this.askTable[order.price];
      }
    }
  }
}
