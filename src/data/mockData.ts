import { Car, Fuel, Gauge, Calendar, ShieldCheck, Banknote, History, Zap, Settings, Star } from 'lucide-react';

export type BodyType = 'SUV' | 'Sedan' | 'Hatchback' | 'MUV / MPV' | 'Coupe' | 'Convertible';

export const BODY_TYPES: BodyType[] = ['SUV', 'Sedan', 'Hatchback', 'MUV / MPV', 'Coupe', 'Convertible'];

export type Vehicle = {
  id: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  price: number;
  mileage: number;
  fuelType: 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric';
  transmission: 'Manual' | 'Automatic';
  bodyType?: BodyType | string;
  engine: string;
  color: string;
  ownership: string; // 1st Owner, 2nd Owner
  registration: string;
  images: string[];
  features: string[];
  status: 'Available' | 'Sold' | 'Booked' | 'Deleted';
  description?: string;
  instagramReel?: string;
  updatedAt?: number;
  deleted?: boolean;
};

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: "porsche_911_gt3_rs",
    make: "Porsche",
    model: "911 GT3 RS",
    variant: "4.0 Weissach Package",
    year: 2023,
    price: 38500000,
    mileage: 4200,
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "Coupe",
    engine: "4.0L Naturally Aspirated Flat-6 (518 HP)",
    color: "Lizard Green / Carbon Accent",
    ownership: "1st Owner",
    registration: "MH-01-EE-9000",
    images: [
      "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1600&q=80"
    ],
    features: ["Weissach Package", "Carbon Ceramic Brakes (PCCB)", "Rear Axle Steering", "Front Axle Lift System", "Magnesium Racing Wheels", "Club Sport Package"],
    status: "Available",
    description: "A road-legal track masterpiece. This Lizard Green 911 GT3 RS features the highly sought-after Weissach Package, reducing weight and enhancing aerodynamics. Immaculately maintained by a single enthusiast collector with complete Porsche Mumbai center records.",
    updatedAt: Date.now(),
    deleted: false
  },
  {
    id: "mercedes_g63_amg",
    make: "Mercedes-Benz",
    model: "G63 AMG",
    variant: "V8 Bi-Turbo Edition 55",
    year: 2022,
    price: 26500000,
    mileage: 12000,
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "SUV",
    engine: "4.0L Twin-Turbo V8 (577 HP)",
    color: "Matte Obsidian Black",
    ownership: "1st Owner",
    registration: "MH-02-FN-1111",
    images: [
      "https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1600&q=80"
    ],
    features: ["AMG Night Package", "22-inch Forged AMG Wheels", "Burmester Surround Sound System", "Bespoke Nappa Leather Concept", "Dynamic Ride Control Active Suspension", "Red Brake Calipers"],
    status: "Available",
    description: "The ultimate power statement. Obsidian Black metallic exterior combined with red/black bi-color Nappa leather. Complete company service records, absolute showroom condition.",
    updatedAt: Date.now(),
    deleted: false
  }
];

export const MOCK_REVIEWS = [
  {
    id: 1,
    name: "Ranveer Gaikwad",
    rating: 5,
    text: "Picked up my Porsche Boxster through CYR Cars. Fayaz is a rare gentleman in this trade—straightforward, calm, and completely transparent from the first call to handover. No pushy sales talk, just clean paperwork and a spotless car.",
    date: "Porsche Boxster"
  },
  {
    id: 2,
    name: "Harsh Makhija",
    rating: 5,
    text: "Bought my G63 here and the delivery experience was effortless. Courteous, respectful of my time, and completely transparent through every detail—no unnecessary follow-ups, and the handover was ready right when promised.",
    date: "Mercedes-AMG G63"
  },
  {
    id: 3,
    name: "Mr. Mehrnosh",
    rating: 5,
    text: "A genuine pleasure from inspection to delivery for our GLS 400d. The conduct throughout was dignified, patient, and refreshingly honest—rare in the pre-owned luxury space. Discreetly arranged and delivered immaculately on schedule.",
    date: "Mercedes-Benz GLS 400d"
  }
];

export const MOCK_LEADS = [
  { id: 'l1', name: 'Sanjay Singhania', phone: '9876543210', email: 'sanjay@example.com', car: 'Porsche 911 GT3 RS', status: 'New Lead', date: '2026-06-05' },
  { id: 'l2', name: 'Natasha Poonawalla', phone: '9988776655', email: 'natasha@example.com', car: 'Mercedes-AMG G63', status: 'Contacted', date: '2026-06-04' },
  { id: 'l3', name: 'Vikram Godrej', phone: '9123456789', email: 'vikram@example.com', car: 'Range Rover Autobiography', status: 'Negotiating', date: '2026-06-02' }
];

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
};
