import Fill from '../Fill';
import OrderBookType from '../enums/OrderBookType';
import OrderSide from '../enums/OrderSide';
import Order from '../orders/Order';
import { compareTime } from '../utils/compareTime';

export default abstract class OrderBook {
  abstract venue: OrderBookType;

  // Only contain elements that have orders, so the array should never be empty
  // Use string for price as numbers create rounding issues
  protected bidTable: Record<string, Order[]> = {}; //FIFO in from back of array, out from front
  protected askTable: Record<string, Order[]> = {}; //<k,v> == <price, orders at this price>

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

  // Called on every order placed (bid, ask)
  protected match(time: string) {
    let { highestBidPrice, lowestAskPrice } = this.getBestPrices();

    // Checks if matching exists, then fill until no match
    while (highestBidPrice >= lowestAskPrice) {
      //Break if either empty bid or ask table
      if (highestBidPrice < 0 || lowestAskPrice < 0) {
        break;
      }
      const bidKey = highestBidPrice.toFixed(2);
      const askKey = lowestAskPrice.toFixed(2);
      const clearingBid: Order = this.bidTable[bidKey][0];
      const clearingAsk: Order = this.askTable[askKey][0];

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
          // Smaller order gets fully filled
          clearingBid.remainingQuantity(),
          clearingAsk.remainingQuantity()
        ),
        time,
        venue: this.venue,
      });

      // Fill both orders
      clearingBid.partiallyFillOrder(fill);
      clearingAsk.partiallyFillOrder(fill);

      // Update bidAsk tables when either or both orders filled
      this.updateTables(clearingBid, clearingAsk, bidKey, askKey);

      // After filling, update new highestBid lowestAsk. Table might be empty after fill.
      ({ highestBidPrice, lowestAskPrice } = this.getBestPrices());
    }
  }

  getBestPrices() {
    // loop through keys (prices) and sort
    const buyPrices = Object.keys(this.bidTable)
      .map((price) => price)
      .sort((a, b) => +b - +a); // desc order

    const sellPrices = Object.keys(this.askTable)
      .map((price) => price)
      .sort((a, b) => +a - +b); // asc order

    // first element is best price
    let highestBidPrice = Number(buyPrices[0] ?? -1); // initially undefined
    let lowestAskPrice = Number(sellPrices[0] ?? -1);
    return { highestBidPrice, lowestAskPrice };
  }

  updateTables(
    clearingBid: Order,
    clearingAsk: Order,
    bidKey: string,
    askKey: string
  ) {
    //order fully filled
    if (clearingBid.remainingQuantity() === 0) {
      this.bidTable[bidKey].shift(); //remove from Order array
      //Order array empty
      if (this.bidTable[bidKey].length === 0) {
        delete this.bidTable[bidKey]; //delete dict entry
      }
    }

    if (clearingAsk.remainingQuantity() === 0) {
      this.askTable[askKey].shift();
      if (this.askTable[askKey].length === 0) {
        delete this.askTable[askKey];
      }
    }
  }

  // remove from order book but keep in OrderRouter
  // ?: Test data not using this, it's just for completeness
  cancelOrder(order: Order) {
    order.cancel();
    const priceKey = Number(order.price).toFixed(2);

    if (order.side === OrderSide.BUY) {
      this.bidTable[priceKey] = this.bidTable[priceKey].filter(
        (bidOrder) => !bidOrder.isCancelled
      );
      if (this.bidTable[priceKey].length === 0) {
        delete this.bidTable[priceKey];
      }
    } else if (order.side === OrderSide.SELL) {
      this.askTable[priceKey] = this.askTable[priceKey].filter(
        (askOrder) => !askOrder.isCancelled
      );
      if (this.askTable[priceKey].length === 0) {
        delete this.askTable[priceKey];
      }
    }
  }
}
