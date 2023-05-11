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
  }

  // called by OrderBook in match
  partiallyFillOrder(fill: Fill) {
    this.fills.push(fill);
    // create a fill object and insert into the fills array
    // print out the fill info
  }

  printOrder() {}

  // delete from order book, but keep it in the orders array
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
