import fs from 'fs';
import readline from 'readline';
import OrderSide from './enums/OrderSide';
import Router from './OrderRouter';
import Order from './orders/Order';
import OrderStatus from './enums/OrderStatus';
import OrderBookType from './enums/OrderBookType';
import { tagDict } from './consts/consts';

export default class OrderInjector {
  router: Router;

  constructor(router: Router) {
    this.router = router;
  }

  // Reads csv file, each line is a time tick. Get orders for each time.
  startExchange() {
    const lineReader = readline.createInterface({
      // input: fs.createReadStream("./csv/testdata_orders.csv"),
      input: fs.createReadStream('./csv/testdata_orders_simpler_case.csv'),
    });
    const lineDataArr: any = [];

    lineReader.on('line', (line: string) => {
      const lineData: any = this.processLine(line);
      lineDataArr.push(lineData);
    });

    lineReader.on('close', () => {
      this.orderHelper(lineDataArr);
    });
  }

  // takes in single csv line, returns lineDataObj. Contains time stamp and orders arr
  private processLine(line: string) {
    const lineDataObj: any = {
      time: '',
      orders: [],
    };
    const orders: Array<OrderInput> = [];

    const lineTokens: string[] = line.split(',');
    lineDataObj['time'] = lineTokens[0]; // line: [time, order1, order2, ...]

    const rawOrderArr = lineTokens.slice(1); //[order1, order2, ...]
    for (let rawOrder of rawOrderArr) {
      orders.push(this.processOrder(rawOrder)); //process each order
    }
    lineDataObj.orders = orders;
    return lineDataObj;
  }

  private processOrder(order: string) {
    const processedOrder: any = {};
    order = order.slice(0, order.length - 1);
    let orderInfoArr: string[] = order.split(';'); //order: [k1=v1;k2=v2;...]

    for (let orderInfo of orderInfoArr) {
      //44=100.2 -> [44, 100.2]
      const { key, val } = {
        key: orderInfo.split('=')[0],
        val: orderInfo.split('=')[1],
      };
      if (key === '54') {
        processedOrder[tagDict[key]] =
          val === '1' ? OrderSide.BUY : OrderSide.SELL;
      } else {
        processedOrder[tagDict[key]] = val;
      }
    }
    return processedOrder;
  }

  orderHelper(orderInputs: Array<{ time: string; orders: OrderInput[] }>) {
    for (let orderInfo of orderInputs) {
      for (let order of orderInfo['orders']) {
        this.addOrderToRouter(orderInfo['time'], order);
      }
    }
  }

  addOrderToRouter(time: string, orderInput: OrderInput) {
    const destination = orderInput['destination'];
    const order = new Order({
      id: orderInput.id,
      effectiveTime: time,
      price: orderInput.price,
      quantity: orderInput.quantity,
      side: orderInput.side,
      status: OrderStatus.NEW,
      venue:
        destination === 'L' ? OrderBookType.LIT_POOL : OrderBookType.DARK_POOL,
    });

    if (destination === 'L') {
      // Add to Lit Pool
      console.log(
        `[${order.id}][${order.venue}] ${order.side} ${order.quantity} @ ${order.price}`
      );
      this.router.addToLitPool(order);
    } else if (destination === 'D') {
      //Add to Dark Pool
      this.router.addToDarkPool(order);
      console.log(
        `[${order.id}][${order.venue}] ${order.side} ${order.quantity} @ ${order.price}`
      );
    } else if (destination === 'SOR') {
      //Add to Smart Order Router
      this.router.addToSOR(time, orderInput);
    } else {
      throw 'invalid order destination';
    }
  }
}

export interface OrderInput {
  messageType: string;
  id: string;
  side: OrderSide;
  quantity: number;
  price: number;
  destination: 'L' | 'D' | 'SOR';
}
