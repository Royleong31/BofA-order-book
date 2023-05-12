import fs from 'fs';
import readline from 'readline';
import OrderSide from './enums/OrderSide';
import Router from './Router';
import Order from './orders/Order';
import OrderStatus from './enums/OrderStatus';
import OrderBookType from './enums/OrderBookType';
import tagDict from './consts/tagDict';

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
    const allLineDataObjs: any = [];

    //loop through each line (time, order1, order2, ...)
    lineReader.on('line', function (line: any) {
      const lineDataObj: any = {};
      const lineData = line.split(',');
      const time = lineData[0];
      lineDataObj['time'] = time;
      // lineData[1:] are individual orders
      // for orders in lineData[1:]
      let orders = lineData.slice(1, lineData.length);
      orders = orders.map(
        (order: any) => order.slice(0, order.length - 1) // remove last semicolon
      );
      const lineOrders: any = [];

      for (let rawOrderInfo of orders) {
        const orderInfo = rawOrderInfo.split(';'); // 11=LIT-3;54=2;38=2500;44=100.2;100=L

        // for this current order, loop through semicolon, orderInfo
        const orderObj: any = {};
        for (let orderDetail of orderInfo) {
          const orderInfo = orderDetail.split('=');
          if (orderInfo[0] === '54') {
            orderObj['side'] =
              orderInfo[1] === '1' ? OrderSide.BUY : OrderSide.SELL;
          } else {
            orderObj[tagDict[orderInfo[0]]] = orderInfo[1];
          }
        }

        lineOrders.push(orderObj);
      }

      lineDataObj['orders'] = lineOrders;
      allLineDataObjs.push(lineDataObj);
    });

    lineReader.on('close', () => {
      this.orderHelper(allLineDataObjs);
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
    lineDataObj['time'] = lineTokens[0]; // [time, order1, order2, ...]

    const rawOrderArr = lineTokens.slice(1); //[order1, order2, ...]
    for (let rawOrder of rawOrderArr) {
      orders.push(this.processOrder(rawOrder));
    }
    lineDataObj.orders = orders;
  }

  private processOrder(order: string) {
    const processedOrder: any = {};
    let orderInfoArr: string[] = order.split(';');
    orderInfoArr = orderInfoArr.slice(0, orderInfoArr.length - 1); //omit last semicolon

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
      console.log(
        `[${order.id}][${order.venue}] ${order.side} ${order.quantity} @ ${order.price}`
      );

      this.router.addToLitPool(order);
    } else if (destination === 'D') {
      this.router.addToDarkPool(order);
      console.log(
        `[${order.id}][${order.venue}] ${order.side} ${order.quantity} @ ${order.price}`
      );
    } else if (destination === 'SOR') {
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
