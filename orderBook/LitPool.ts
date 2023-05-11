import Fill from "../Fill";
import OrderBookType from "../enums/OrderBookType";
import Order from "../orders/Order";
import OrderBook from "./OrderBook";

export default class LitPool extends OrderBook {
  venue = OrderBookType.LIT_POOL;

  public getBookData() {
    return {
      bidTable: this.bidTable,
      askTable: this.askTable,
    };
  }
}
