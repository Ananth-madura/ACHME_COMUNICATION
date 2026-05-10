// utils/invoicecal.js

export const calculateTotals = (items = []) => {
  let subtotal = 0;
  let total_discount = 0;
  let total_cgst = 0;
  let total_sgst = 0;

  items.forEach(item => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    const discount = Number(item.discount) || 0;
    const gstPercent = Number(item.tax) || 0;

    const base = price * qty;
    const afterDiscount = base - discount;
    const gstAmount = (afterDiscount * gstPercent) / 100;

    subtotal += base;
    total_discount += discount;
    total_cgst += gstAmount / 2;
    total_sgst += gstAmount / 2;
  });

  const grand_total =
    subtotal - total_discount + total_cgst + total_sgst;

  return {
    subtotal: +subtotal.toFixed(2),
    total_discount: +total_discount.toFixed(2),
    total_cgst: +total_cgst.toFixed(2),
    total_sgst: +total_sgst.toFixed(2),
    grand_total: +grand_total.toFixed(2),
  };
};

export const calculateItemTotal = (item) => {
  const price = Number(item.price) || 0;
  const qty = Number(item.qty) || 0;
  const discount = Number(item.discount) || 0;
  const gstPercent = Number(item.tax) || 0;

  const base = price * qty;
  const afterDiscount = base - discount;
  const gstAmount = (afterDiscount * gstPercent) / 100;

  return +(afterDiscount + gstAmount).toFixed(2);
};
