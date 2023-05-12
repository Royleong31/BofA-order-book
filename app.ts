import OrderInjector from './OrderInjector';
import Router from './Router';
import DarkPool from './orderBook/DarkPool';
import LitPool from './orderBook/LitPool';

function main() {
  const litPool = new LitPool();
  const darkPool = new DarkPool();
  const router = new Router(litPool, darkPool);

  const orderInjector = new OrderInjector(router);
  orderInjector.startExchange();
}

main();

/**
 * Observations for improvements
 * - avg fill price should not be equal to the limit price, as there may be better prices
 * - need tiebreaker for orders that cross the bid-ask spread to decide what price to use
 */