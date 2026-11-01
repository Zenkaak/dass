export type StorefrontCategory = {
  name: string;
  icon: string;
  subcategories: string[];
};

export const storefrontCategories: StorefrontCategory[] = [
  {
    name: 'Phones & Tablets',
    icon: '📱',
    subcategories: ['All Phones & Tablets', 'Mobile Phones', 'Tablets & Pads', 'Smart Watches & Trackers', 'Phone Accessories'],
  },
  {
    name: 'Computers & Laptops',
    icon: '💻',
    subcategories: ['All Computers & Laptops', 'Laptops', 'Desktop Computers', 'Monitors', 'Printers & Scanners', 'Computer Accessories', 'Networking & Wi-Fi'],
  },
  {
    name: 'TV, Audio & Cameras',
    icon: '🎧',
    subcategories: ['All TV, Audio & Cameras', 'TVs', 'Speakers & Home Audio', 'Headphones & Earbuds', 'Cameras & Drones', 'CCTV & Security', 'Solar, Inverters & Power'],
  },
  {
    name: 'Gaming',
    icon: '🎮',
    subcategories: ['All Gaming', 'Video Game Consoles', 'Video Games', 'Controllers & Accessories', 'Gaming PCs & Setups'],
  },
  {
    name: 'Home Appliances',
    icon: '🧺',
    subcategories: ['All Home Appliances', 'Fridges & Freezers', 'Washing Machines', 'Cookers, Ovens & Microwaves', 'Small Kitchen Appliances', 'ACs & Fans', 'Irons & Vacuums'],
  },
  {
    name: 'Furniture & Home',
    icon: '🛋️',
    subcategories: ['All Furniture & Home', 'Sofas & Living Room', 'Beds & Mattresses', 'Tables, Chairs & Dining', 'Office Furniture', 'Wardrobes & Storage', 'Décor & Lighting', 'Kitchenware & Dining', 'Garden & Outdoor'],
  },
  {
    name: 'Fashion',
    icon: '👟',
    subcategories: ['All Fashion', "Men's Clothing", "Women's Clothing", 'Shoes & Sneakers', 'Bags', 'Watches', 'Jewellery & Accessories', 'Traditional & Wedding Wear'],
  },
  {
    name: 'Health & Beauty',
    icon: '💄',
    subcategories: ['All Health & Beauty', 'Skin Care', 'Hair & Wigs', 'Makeup', 'Perfumes & Fragrances', 'Grooming & Personal Care', 'Vitamins & Supplements'],
  },
  {
    name: 'Babies & Kids',
    icon: '🧸',
    subcategories: ['All Babies & Kids', 'Toys & Games', "Kids' Clothing & Shoes", 'Prams, Car Seats & Gear', 'Baby Care & Feeding', 'School Supplies'],
  },
  {
    name: 'Sports, Music & Books',
    icon: '⚽',
    subcategories: ['All Sports, Music & Books', 'Gym & Fitness', 'Bicycles', 'Sports Equipment', 'Musical Instruments', 'Books & Stationery', 'Camping & Travel'],
  },
  {
    name: 'Vehicles',
    icon: '🚗',
    subcategories: ['All Vehicles', 'Cars', 'Motorcycles & Bodas', 'Trucks, Buses & Heavy Equipment', 'Spare Parts & Accessories'],
  },
  {
    name: 'Property',
    icon: '🏠',
    subcategories: ['All Property', 'Houses & Apartments for Rent', 'Houses for Sale', 'Land & Plots', 'Shops, Offices & Commercial', 'Short Stay & Airbnb'],
  },
  {
    name: 'Agriculture & Food',
    icon: '🌿',
    subcategories: ['All Agriculture & Food', 'Livestock & Poultry', 'Farm Machinery & Tools', 'Seeds, Feeds & Fertilisers', 'Food & Produce'],
  },
  {
    name: 'Animals & Pets',
    icon: '🐕',
    subcategories: ['All Animals & Pets', 'Dogs & Puppies', 'Cats & Kittens', 'Pet Food & Supplies', 'Birds, Fish & Other Pets'],
  },
  {
    name: 'Tools & Business Equipment',
    icon: '🔧',
    subcategories: ['All Tools & Business Equipment', 'Power & Hand Tools', 'Building Materials', 'Electrical & Plumbing', 'Salon & Spa Equipment', 'Restaurant & Catering', 'Shop, Office & Printing', 'Medical Equipment'],
  },
  {
    name: 'Services',
    icon: '🧰',
    subcategories: ['All Services', 'Repair & Technicians', 'Cleaning & Fumigation', 'Events, Catering & Photography', 'Moving & Transport', 'IT, Design & Business', 'Lessons & Tutoring'],
  },
];
