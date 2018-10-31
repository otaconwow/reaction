import Logger from "@reactioncommerce/logger";

/**
 * @name getFulfillmentMethodsWithQuotes
 * @method
 * @summary Just gets rates, without updating anything
 * @param {Object} fulfillmentGroup - fulfillmentGroup object
 * @param {Object} cartWithSummary - The cart object with its summary
 * @param {Object} context - Context
 * @return {Array} return updated rates in cart
 * @private
 */
export default async function getFulfillmentMethodsWithQuotes(fulfillmentGroup, cartWithSummary, context) {
  const rates = [];
  const retrialTargets = [];
  // must have items to calculate shipping
  if (!fulfillmentGroup.items || !fulfillmentGroup.items.length) {
    return rates;
  }

  const funcs = context.getFunctionsOfType("getFulfillmentMethodsWithQuotes");
  let promises = funcs.map((rateFunction) => rateFunction(context, fulfillmentGroup, cartWithSummary, [rates, retrialTargets]));
  await Promise.all(promises);

  // Try once more.
  if (retrialTargets.length > 0) {
    promises = funcs.map((rateFunction) => rateFunction(context, fulfillmentGroup, [rates, retrialTargets]));
    await Promise.all(promises);

    if (retrialTargets.length > 0) {
      Logger.warn("Failed to get fulfillment methods from these packages:", retrialTargets);
    }
  }

  let newRates = rates.filter(({ requestStatus }) => requestStatus !== "error");
  if (newRates.length === 0) {
    newRates = [{
      requestStatus: "error",
      shippingProvider: "all",
      message: "All requests for fulfillment methods failed."
    }];
  }

  Logger.debug("getFulfillmentMethodsWithQuotes returning rates", rates);
  return newRates;
}
