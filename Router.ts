import LitPool from "./orderBook/LitPool";
import DarkPool from "./orderBook/DarkPool";
import { OrderInput } from "./OrderInjector";
import Order from "./orders/Order";
import OrderSide from "./enums/OrderSide";
import OrderStatus from "./enums/OrderStatus";
import OrderBookType from "./enums/OrderBookType";
import Fill from "./Fill";

export default class Router {
  private litPool: LitPool;
  private darkPool: DarkPool;

  // Used to calculate estimate of current book state of dark pool
  private sorDarkPoolFills: Fill[];
  private sorDarkPoolOrdersPlaced: Order[] = [];

  constructor() {
    this.litPool = new LitPool();
    this.darkPool = new DarkPool();
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

    // Splitting orders in half for SOR for lit and dark pools for now
    // const darkPoolOrder = new Order({
    //   id: orderInput.id,
    //   effectiveTime: time,
    //   price: orderInput.price,
    //   quantity: orderInput.quantity / 2,
    //   side: orderInput.side,
    //   status: OrderStatus.NEW,
    //   venue: OrderBookType.DARK_POOL,
    //   onFillCallback: (fill: Fill) => {
    //     this.sorDarkPoolFills.push(fill);
    //   },
    // });

    const litPoolOrder = new Order({
      id: orderInput.id,
      effectiveTime: time,
      price: orderInput.price,
      quantity: orderInput.quantity,
      side: orderInput.side,
      status: OrderStatus.NEW,
      venue: OrderBookType.LIT_POOL,
    });

    // this.sorDarkPoolOrdersPlaced.push(darkPoolOrder);

    // this.darkPool.placeOrder(darkPoolOrder);
    this.litPool.placeOrder(litPoolOrder);
  }

  calculateSorOrderBookState() {
    const litPoolCurBook = this.litPool.getBookData();

    // get all ticks for the orders placed
    // get all ticks for fills
    // subtract fills from orders placed to get the current book state
    // use the current book state to calculate how to split the orders in SOR
  }
}
