const fs = require("fs");
const csv = require("csv-parser");
import { parse } from "csv-parse";
import readline from "readline";
import OrderSide from "./enums/OrderSide";
import Router from "./Router";
import Order from "./orders/Order";
import OrderStatus from "./enums/OrderStatus";
import OrderBookType from "./enums/OrderBookType";

const tagDict: Record<string, string> = {
  "54": "side",
  "40": "orderType",
  "44": "price",
  "11": "id",
  "38": "quantity",
  "49": "senderApplication",
  "100": "destination",
  "168": "effectiveTime",
  "126": "expiryTime",
  "35": "messageType",
  "39": "orderStatus",
  "30": "fillVenue",
  "31": "fillPrice",
  "32": "fillQuantity",
  "14": "cumulativeQuantity",
  "6": "avgFillPrice",
  "60": "fillTime",
};

export interface OrderInput {
  messageType: string;
  id: string;
  side: OrderSide;
  quantity: number;
  price: number;
  destination: "L" | "D" | "SOR";
}

export default class OrderInjector {
  router: Router;

  constructor(router: Router) {
    this.router = router;
  }

  startExchange() {
    const lineReader = readline.createInterface({
      input: fs.createReadStream("./csv/testdata_orders.csv"),
      // input: fs.createReadStream("./csv/testdata_orders_simpler_case.csv"),
    });
    const allLineDataObjs: any = [];

    lineReader.on("line", function (line: any) {
      const lineDataObj: any = {};
      const lineData = line.split(",");
      const time = lineData[0];
      lineDataObj["time"] = time;
      // lineData[1:] are individual orders
      // for orders in lineData[1:]
      const orders = lineData.slice(1, lineData.length);
      const orderData = orders.map((o: any) => o.slice(0, o.length - 1));
      const ordersInThisLine: any = [];

      for (let orderInfo of orderData) {
        const orderData = orderInfo.split(";");

        // for this current order
        const orderObj: any = {};
        for (let orderDetail of orderData) {
          const orderInfo = orderDetail.split("=");
          if (orderInfo[0] === "54") {
            orderObj["side"] = orderInfo[1] === "1" ? OrderSide.BUY : OrderSide.SELL;
          } else {
            orderObj[tagDict[orderInfo[0]]] = orderInfo[1];
          }
        }

        ordersInThisLine.push(orderObj);
      }

      lineDataObj["orders"] = ordersInThisLine;
      allLineDataObjs.push(lineDataObj);
    });

    lineReader.on("close", () => {
      this.orderHelper(allLineDataObjs);
    });
  }

  orderHelper(orderInputs: Array<{ time: string; orders: OrderInput[] }>) {
    for (let orderInfo of orderInputs) {
      for (let order of orderInfo["orders"]) {
        this.addOrderToRouter(orderInfo["time"], order);
      }
    }
  }

  addOrderToRouter(time: string, orderInput: OrderInput) {
    const destination = orderInput["destination"];
    const order = new Order({
      id: orderInput.id,
      effectiveTime: time,
      price: orderInput.price,
      quantity: orderInput.quantity,
      side: orderInput.side,
      status: OrderStatus.NEW,
      venue: destination === "L" ? OrderBookType.LIT_POOL : OrderBookType.DARK_POOL,
    });

    if (destination === "L") {
      console.log(`[${order.id}][${order.venue}] ${order.side} ${order.quantity} @ ${order.price}`);

      this.router.addToLitPool(order);
    } else if (destination === "D") {
      this.router.addToDarkPool(order);
      console.log(`[${order.id}][${order.venue}] ${order.side} ${order.quantity} @ ${order.price}`);
    } else if (destination === "SOR") {
      this.router.addToSOR(time, orderInput);
    } else {
      throw "invalid order destination";
    }
  }
}
