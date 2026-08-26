export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel_type: 'Gasoline' | 'Electric' | 'Hybrid' | 'Diesel' | 'Plug-in Hybrid';
  transmission: 'Automatic' | 'Manual' | 'Dual-Clutch' | 'Single-Speed';
  body_type: 'Coupe' | 'Sedan' | 'SUV' | 'Convertible' | 'Wagon' | 'Truck';
  drivetrain: 'AWD' | 'RWD' | 'FWD' | '4WD';
  exterior_color: string;
  interior_color: string;
  vin: string;
  engine: string;
  horsepower: number;
  torque_lb_ft?: number;
  zero_to_sixty_sec?: number;
  mpg_city?: number;
  mpg_hwy?: number;
  description: string;
  thumbnail_url: string;
  images: string[];
  is_available: boolean;
  is_featured?: boolean;
  carfax_clean?: boolean;
  num_owners?: number;
  features: string[];
  created_at: string;
}

export interface FilterState {
  searchQuery: string;
  makes: string[];
  priceMin: number;
  priceMax: number;
  yearMin: number;
  yearMax: number;
  mileageMax: number;
  fuelTypes: string[];
  transmissions: string[];
  bodyTypes: string[];
  drivetrains: string[];
  isAvailableOnly: boolean;
  sortBy: 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc' | 'featured';
}

export interface TestDriveBooking {
  id: string;
  carId: string;
  carName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  preferredDate: string;
  preferredTime: string;
  comments?: string;
  createdAt: string;
}

export interface TradeInEstimate {
  year: number;
  make: string;
  model: string;
  mileage: number;
  condition: 'Excellent' | 'Very Good' | 'Good' | 'Fair';
  estimatedValue: number;
}
