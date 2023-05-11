import Fill from "../Fill";
import OrderBookType from "../enums/OrderBookType";
import OrderStatus from "../enums/OrderStatus";
import OrderSide from "../enums/OrderSide";

interface OrderInput {
  side: OrderSide;
  price: number; // bid price for bid orders, ask price for ask orders
  id: string;
  venue: OrderBookType;
  effectiveTime: string; // time string to be converted to number for easier ordering
  expiryTime?: string; // may not have this
  quantity: number;
  status: OrderStatus;
  onFillCallback?: (fill: Fill) => void;
}

export default class Order {
  fills: Fill[] = [];
  side: OrderSide;
  price: number; // bid price for bid orders, ask price for ask orders
  id: string;
  venue: OrderBookType;
  effectiveTime: string; // time string to be converted to number for easier ordering
  expiryTime?: string; // may not have this
  cancelTime?: string; // may not have this
  commission: number = 0;
  onFillCallback?: (fill: Fill) => void;

  quantity: number;

  status: OrderStatus;
  isCancelled: boolean = false; // soft delete order from book

  constructor(inputObj: OrderInput) {
    this.side = inputObj.side;
    this.price = inputObj.price;
    this.id = inputObj.id;
    this.venue = inputObj.venue;
    this.effectiveTime = inputObj.effectiveTime;
    this.expiryTime = inputObj.expiryTime;
    this.quantity = inputObj.quantity;
    this.status = inputObj.status;
    this.onFillCallback = inputObj.onFillCallback;
  }

  // called by OrderBook in match
  partiallyFillOrder(fill: Fill) {
    this.fills.push(fill);

    if (this.venue === OrderBookType.LIT_POOL) {
      // 0.0001% of the total price
      this.commission += (fill.price * fill.quantity * 0.0001) / 100;
    }

    if (this.filledQuantity() < this.quantity) {
      this.status = OrderStatus.PARTIAL;
    } else {
      this.status = OrderStatus.FULL;
    }

    if (this.onFillCallback) {
      this.onFillCallback(fill);
    }
    // create a fill object and insert into the fills array
    // print out the fill info
  }

  printOrder() {}

  // delete from order book, but keep it in the orders array
  // TODO: Deal with partial orders
  cancel() {
    this.isCancelled = true;
  }

  remainingQuantity(): number {
    return this.quantity - this.filledQuantity();
  }

  filledQuantity(): number {
    return this.fills.reduce((prev, cur) => prev + cur.quantity, 0);
  }

  averageFillPrice(): number {
    const totalAmountPaid = this.fills.reduce((prev, cur) => prev + cur.price * cur.quantity, 0);
    return totalAmountPaid / this.filledQuantity();
  }
}
