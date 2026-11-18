// Menu transcribed from the Tasty Town Cafe printed menu (prices in ₹).
const CAFE = { name: 'Tasty Town Cafe', address: '100ft Road, Vidya Nagar, Shimoga' };
const TABLES = 10; // change if the cafe has more/fewer tables
const C = {
  Burger: [['Aloo tikki burger',69],['Veg burger',99],['Cheese veg burger',129],['Paneer patty burger',149],['Chicken burger',149],['Cheese chicken burger',169],['Crispy chicken burger',189],['Sizzling veg burger (TTC Special)',189],['Sizzling chicken burger (TTC Special)',229]],
  Sandwich: [['Sandwich',90],['Veg sandwich',99],['Cheese veg sandwich',119],['Paneer sandwich',129],['Jambo sandwich',159],['Egg sandwich',119],['Crispy chicken sandwich',189],['Avocado sandwich (TTC Special)',199]],
  'Wraps & Rolls': [['Veg roll',99],['Paneer roll',119],['Egg roll',119],['Crispy chicken roll',189]],
  'French Fries': [['Salted fries',79],['Peri peri fries',89],['Cheese & creamy fries',129],['Chicken loaded fries',229],['Cheese lava donut with fries (TTC Special)',199]],
  Chicken: [['Chicken popcorn',129],['Chicken wings (4 piece)',129],['Chicken strips (4 piece)',149],['Crispy leg drumstick (1 piece)',99],['Chicken popcorn with lava donut',249]],
  'Maggi & Pasta': [['Veg Maggi',59],['Corn Maggi',69],['Cheese Maggi',99],['Egg Maggi',99],['Chicken Maggi',129],['Red sauce pasta',129],['White sauce pasta',159]],
  Beverages: [['Coffee',80],['Cold coffee',90],['Tea',40]],
  Desserts: [['Brownie',50],['Ice cream',60]],

};
const PIZZA = [['Margarita',69,79],['Onion & capsicum',79,89],['Corn pizza',89,99],['Veg loaded',99,119],['Paneer pizza',99,119],['Mushroom delight',99,119],['Paradise pizza',119,149],['Chicken pepperoni',129,159],['Chicken loaded pizza',149,179]];
const MENU = [];
for (const cat of Object.keys(C)) for (const [name, price] of C[cat]) MENU.push({ category: cat, name, price });
for (const [n, s, l] of PIZZA) { MENU.push({ category: 'Pizza', name: n + ' (S)', price: s }, { category: 'Pizza', name: n + ' (L)', price: l }); }
MENU.push({ category: 'Pizza', name: 'Extra cheese (S)', price: 35 }, { category: 'Pizza', name: 'Extra cheese (L)', price: 50 });
module.exports = { CAFE, TABLES, MENU };
