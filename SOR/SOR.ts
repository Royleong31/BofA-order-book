import Order from '../orders/Order';

export default class SOR {
  private orders: Order[];

  injectOrder(order: Order) {
    this.orders.push(order);
  }
}
