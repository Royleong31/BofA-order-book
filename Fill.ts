import OrderBookType from "./enums/OrderBookType";

interface FillInput {
  venue: OrderBookType;
  price: number; // clearing price, better than or equal to order price
  quantity: number; // quantity filled, order qnt or less
  time: string;

  bidOrderId: string;
  askOrderId: string;
}

export default class Fill {
  venue: OrderBookType;
  price: number; // clearing price, better than or equal to order price
  quantity: number; // quantity filled, order qnt or less
  time: string;
  bidOrderId: string;
  askOrderId: string;

  constructor(fillObj: FillInput) {
    this.venue = fillObj.venue;
    this.price = fillObj.price;
    this.quantity = fillObj.quantity;
    this.time = fillObj.time;
    this.bidOrderId = fillObj.bidOrderId;
    this.askOrderId = fillObj.askOrderId;
  }
}
