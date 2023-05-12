import OrderInjector from "./OrderInjector";
import Router from "./Router";

function main() {
  const router = new Router();

  const orderInjector = new OrderInjector(router); //inject Router dependency
  orderInjector.startExchange();
}

main();

/**
 * Observations for improvements
 * - avg fill price should not be equal to the limit price, as there may be better prices
 * - need tiebreaker for orders that cross the bid-ask spread to decide what price to use
 */