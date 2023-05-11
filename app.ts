import OrderInjector from "./OrderInjector";
import Router from "./Router";

function main() {
  const router = new Router();

  const orderInjector = new OrderInjector(router);
  orderInjector.startExchange();
}

main();
