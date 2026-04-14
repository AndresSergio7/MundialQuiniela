// Web stub for react-native-iap
// IAP is not available in browsers — payments.web.ts handles the web payment flow
'use strict';

const noop = () => Promise.resolve(null);
const noopArray = () => Promise.resolve([]);

module.exports = {
  initConnection: noop,
  endConnection: noop,
  getProducts: noopArray,
  getSubscriptions: noopArray,
  requestPurchase: noop,
  requestSubscription: noop,
  finishTransaction: noop,
  getAvailablePurchases: noopArray,
  getPurchaseHistory: noopArray,
  acknowledgePurchaseAndroid: noop,
  consumePurchaseAndroid: noop,
  clearProductsIOS: noop,
  clearTransactionIOS: noop,
  IAPErrorCode: {},
  PurchaseStateAndroid: {},
};
