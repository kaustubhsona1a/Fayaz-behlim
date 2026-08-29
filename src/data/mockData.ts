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
  fuelType: 'Petrol' | 'Diesel' | 'CNG' | 'Electric';
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
    images: ["/frames/desktop/frame_0001.webp", "/frames/desktop/frame_0012.webp", "/frames/desktop/frame_0025.webp"],
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
    images: ["/frames/desktop/frame_0025.webp", "/frames/desktop/frame_0038.webp", "/frames/desktop/frame_0050.webp"],
    features: ["AMG Night Package", "22-inch Forged AMG Wheels", "Burmester Surround Sound System", "Bespoke Nappa Leather Concept", "Dynamic Ride Control Active Suspension", "Red Brake Calipers"],
    status: "Available",
    description: "The ultimate power statement. Obsidian Black metallic exterior combined with red/black bi-color Nappa leather. Complete company service records, absolute showroom condition.",
    updatedAt: Date.now(),
    deleted: false
  },
  {
    id: "range_rover_autobio",
    make: "Land Rover",
    model: "Range Rover",
    variant: "3.0 LWB Autobiography (D350)",
    year: 2021,
    price: 19500000,
    mileage: 24000,
    fuelType: "Diesel",
    transmission: "Automatic",
    bodyType: "SUV",
    engine: "3.0L twin-turbocharged inline-6 Diesel (346 HP)",
    color: "Belgravia Green Metallic",
    ownership: "1st Owner",
    registration: "MH-47-AA-0300",
    images: ["/frames/desktop/frame_0050.webp", "/frames/desktop/frame_0065.webp", "/frames/desktop/frame_0078.webp"],
    features: ["Executive Class Rear Seating", "Meridian Signature Sound System (1600W)", "Panoramic Sliding Sunroof", "Laser LED Headlights", "Cabin Air Purification Pro", "24-Way Heated & Cooled Massage Seats"],
    status: "Available",
    description: "Unrivaled luxury and off-road capability. Belgravia Green exterior with semi-aniline Perlino leather interior. Serviced strictly at Land Rover authorized workshops in Mumbai.",
    updatedAt: Date.now(),
    deleted: false
  }
];

export const MOCK_REVIEWS = [
  {
    id: 1,
    name: "Aryaman Singhania",
    rating: 5,
    text: "Acquired a certified 2023 Porsche 911 GT3 RS with the Weissach Package for my weekend track sessions and coastal drives. The car was in flawless factory condition with full service provenance from Porsche Mumbai. CYR Cars managed the entire white-glove transfer and documentation within 48 hours.",
    date: "Bandra West • 2 weeks ago"
  },
  {
    id: 2,
    name: "Kabir & Natasha Mehta",
    rating: 5,
    text: "We were searching for an immaculate Mercedes-AMG G63 in Matte Obsidian Black with zero paint defects and authentic single-owner provenance. CYR Cars provided full telemetry logs, paint gauge depth readings, and chassis diagnostic reports. Truly Mumbai's most elite supercar and luxury motorcar boutique!",
    date: "Worli Sea Face • 1 month ago"
  },
  {
    id: 3,
    name: "Vikramaditya Roy",
    rating: 5,
    text: "Acquired an exceptional 2022 Land Rover Range Rover Autobiography LWB. Complete transparency on air suspension health, active telemetry checks, and a seamless private appointment at their Bandra showroom. Unmatched professionalism with no hidden fees.",
    date: "Juhu • 2 months ago"
  },
  {
    id: 4,
    name: "Dr. Siddharth Merchant",
    rating: 5,
    text: "Purchased a 2024 BMW M4 Competition M xDrive. The CYR Cars team demonstrated deep technical mastery on the twin-turbo drivetrain and dynamic modes. Clean paperwork, pristine ceramic detailing, and absolute peace of mind for an enthusiast driver.",
    date: "Altamount Road • 3 weeks ago"
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
