import fs from 'fs';
import readline from 'readline';
import OrderSide from './enums/OrderSide';
import Router from './Router';
import Order from './orders/Order';
import OrderStatus from './enums/OrderStatus';
import OrderBookType from './enums/OrderBookType';

const tagDict: Record<string, string> = {
  '54': 'side',
  '40': 'orderType',
  '44': 'price',
  '11': 'id',
  '38': 'quantity',
  '49': 'senderApplication',
  '100': 'destination',
  '168': 'effectiveTime',
  '126': 'expiryTime',
  '35': 'messageType',
  '39': 'orderStatus',
  '30': 'fillVenue',
  '31': 'fillPrice',
  '32': 'fillQuantity',
  '14': 'cumulativeQuantity',
  '6': 'avgFillPrice',
  '60': 'fillTime',
};

export interface OrderInput {
  messageType: string;
  id: string;
  side: OrderSide;
  quantity: number;
  price: number;
  destination: 'L' | 'D' | 'SOR';
}

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
      const orders = lineData.slice(1, lineData.length);
      const rawLineOrders = orders.map(
        (order: any) => order.slice(0, order.length - 1) // remove last semicolon
      );
      const lineOrders: any = [];

      for (let rawOrderInfo of rawLineOrders) {
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

  // takes in raw csv line, returns lineDataObj. Contains time stamp and orders arr
  private processLine(line: string) {
    const lineDataObj = {
      time: '',
      orders: [],
    };
    const lineTokens = line.split(',');
    lineDataObj['time'] = lineTokens[0]; // [time, order1, order2, ...]

    const rawOrderArr = lineTokens.slice(1); //[order1, order2, ...]
    
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
