import Fill from "../Fill";
import OrderBookType from "../enums/OrderBookType";
import OrderStatus from "../enums/OrderStatus";
import OrderBook from "../orderBook/OrderBook";
import Order from "../orders/Order";

class ParentOrder {
  private order: Order; //original parent order
  private childOrders: Order[]; //multiple child orders, created by strat

  createChild(price: number, quantity: number, venue: OrderBookType): Order {
    const orderInput = {
      side: this.order.side,
      price: price,
      id: this.order.id + "-" + (this.childOrders.length + 1),
      venue: venue,
      effectiveTime: "", //get latest order and time from lit pool
      expiryTime: this.order.expiryTime,
      quantity: quantity,
      status: this.order.status,
    };
    return new Order(orderInput);
  }
}

export default class SOR {
  private parentOrders: Order[];
  private LitPool: OrderBook; // DI, get info and bid/ask
  private DarkPool: OrderBook; // bid/ask. Info private.

  private darkOrderCompleted: Order[]; //info about dark pool
  private darkOrderUncompleted: Order[];

  injectOrder(parentOrder: Order) {
    this.parentOrders.push(parentOrder);
  }

  getLatestTime() {
    //get latest order from litpool and return effective time
  }
}
