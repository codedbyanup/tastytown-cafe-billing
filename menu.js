// Menu transcribed from the Tasty Town Cafe official printed menu (prices in ₹).
// 📍 100ft Road, Vidya Nagar, Shimoga

const CAFE = {
  name: 'Tasty Town Cafe',
  address: '100ft Road, Vidya Nagar, Shimoga',
};

const TABLES = 10; // 10 cafe dining tables

// Menu items by category
const MENU_DATA = {
  Burger: [
    ['Aloo tikki burger', 69],
    ['Veg burger', 99],
    ['Cheese veg burger', 129],
    ['Paneer patty burger', 149],
    ['Chicken burger', 149],
    ['Cheese chicken burger', 169],
    ['Crispy chicken burger', 189],
    ['Sizzling veg burger (TTC Special)', 189],
    ['Sizzling chicken burger (TTC Special)', 229],
  ],
  'French Fries': [
    ['Salted fries', 79],
    ['Peri peri fries', 89],
    ['Cheese & creamy fries', 129],
    ['Chicken loaded fries', 229],
    ['Cheese lava donut with fries (TTC Special)', 199],
  ],
  Sandwich: [
    ['Veg sandwich', 99],
    ['Cheese veg sandwich', 119],
    ['Paneer sandwich', 129],
    ['Jumbo sandwich', 159],
    ['Egg sandwich', 119],
    ['Crispy chicken sandwich', 189],
    ['Avocado sandwich (TTC Special)', 199],
  ],
  'Wraps & Rolls': [
    ['Veg roll', 99],
    ['Paneer roll', 119],
    ['Egg roll', 119],
    ['Crispy chicken roll', 189],
  ],
  Chicken: [
    ['Chicken popcorn', 129],
    ['Chicken wings (4 piece)', 129],
    ['Chicken strips (4 piece)', 149],
    ['Crispy leg (drumstick) (1 piece)', 99],
    ['Chicken popcorn with lava donut', 249],
  ],
  'Maggi & Pasta': [
    ['Veg Maggi', 59],
    ['Corn Maggi', 69],
    ['Cheese Maggi', 99],
    ['Egg Maggi', 99],
    ['Chicken Maggi', 129],
    ['Red sauce pasta', 129],
    ['White sauce pasta', 159],
  ],
  'Momos (6 piece)': [
    ['Veg momos', 99],
    ['Paneer momos', 119],
    ['Cheese corn momos', 129],
    ['Chicken momos', 139],
  ],
  'Super Snacks': [
    ['Butter bun maska', 49],
    ['Jam bun maska', 49],
    ['Masala bun maska', 49],
    ['Korean cheese bun', 59],
    ['Veg nuggets (8 piece)', 99],
    ['Chicken nuggets (8 piece)', 139],
  ],
  Mojito: [
    ['Mint mojito', 49],
    ['Mango mojito', 49],
    ['Watermelon mojito', 49],
    ['Blueberry mojito', 59],
    ['Blue coraco mojito', 69],
    ['Green apple mojito', 69],
  ],
  'Hot & Cool Beverages': [
    ['Tea', 20],
    ['Lemon tea', 20],
    ['Green tea', 20],
    ['Coffee', 25],
    ['Cold coffee', 79],
    ['Cold chocolate coffee', 99],
  ],
  Milkshake: [
    ['Banana milkshake', 89],
    ['Apple milkshake', 99],
    ['Vennila milkshake', 89],
    ['Mango milkshake', 89],
    ['Strawberry milkshake', 89],
    ['Butterscotch milkshake', 99],
    ['Oreo milkshake', 119],
    ['KitKat milkshake', 119],
    ['Avocado milkshake', 119],
    ['Milkshake add-on: Ice cream', 25],
  ],
  'Ice Cream': [
    ['Choco lava coconut (TTC Special)', 79],
    ['Mini gudbud', 79],
    ['American choco nuts', 99],
    ['Royal gudbud', 119],
    ['Triple sundae', 119],
    ['Choco triple sundae', 129],
    ['Death by chocolate', 139],
  ],
  'Scoop Ice Cream': [
    ['Vanilla (1 scoop)', 25],
    ['Vanilla (2 scoop)', 45],
    ['Strawberry (1 scoop)', 25],
    ['Strawberry (2 scoop)', 45],
    ['Pista (1 scoop)', 30],
    ['Pista (2 scoop)', 50],
    ['Pineapple (1 scoop)', 30],
    ['Pineapple (2 scoop)', 50],
    ['Butterscotch (1 scoop)', 30],
    ['Butterscotch (2 scoop)', 50],
    ['Mango (1 scoop)', 30],
    ['Mango (2 scoop)', 50],
    ['Chocolate (1 scoop)', 30],
    ['Chocolate (2 scoop)', 50],
    ['Black currant (1 scoop)', 35],
    ['Black currant (2 scoop)', 60],
    ['Tutty fruity (1 scoop)', 35],
    ['Tutty fruity (2 scoop)', 60],
  ],
  Desserts: [
    ['Choco brownie', 49],
    ['Choco lava cake', 69],
    ['Sizzling brownie with ice cream', 99],
    ['Choco brownie dip (TTC Special)', 99],
  ],
};

// Pizza (Small / Large)
const PIZZA = [
  ['Margarita', 69, 79],
  ['Onion & capsicum', 79, 89],
  ['Corn pizza', 89, 99],
  ['Veg loaded', 99, 119],
  ['Paneer pizza', 99, 119],
  ['Mushroom delight', 99, 119],
  ['Paradise pizza', 119, 149],
  ['Chicken pepperoni', 129, 159],
  ['Chicken loaded pizza', 149, 179],
];

const MENU = [];

// Populate standard categories
for (const cat of Object.keys(MENU_DATA)) {
  for (const [name, price] of MENU_DATA[cat]) {
    MENU.push({ category: cat, name, price });
  }
}

// Populate Pizza sizes
for (const [n, s, l] of PIZZA) {
  MENU.push({ category: 'Pizza', name: `${n} (S)`, price: s });
  MENU.push({ category: 'Pizza', name: `${n} (L)`, price: l });
}
MENU.push({ category: 'Pizza', name: 'Extra cheese (S)', price: 35 });
MENU.push({ category: 'Pizza', name: 'Extra cheese (L)', price: 50 });

module.exports = { CAFE, TABLES, MENU, MENU_DATA };
