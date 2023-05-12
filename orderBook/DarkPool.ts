import OrderBookType from "../enums/OrderBookType";
import OrderBook from "./OrderBook";

export default class DarkPool extends OrderBook {
  venue = OrderBookType.DARK_POOL;
}
