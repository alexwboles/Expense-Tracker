/* ═══════════════════════════════════════════════
   CONFIG.JS — Categories, Tax Mappings, Constants
   Boles West Run Ranch — Expense Tracker
   ═══════════════════════════════════════════════ */

const CONFIG = {

  // ─── APP DEFAULTS ───
  appName: 'Boles West Run Ranch',
  version: '1.0.0',
  currency: 'USD',
  locale: 'en-US',
  pageSize: 25,                   // expenses per page
  recentLimit: 10,                // dashboard recent list
  fiscalYearStartMonth: 1,       // January (1-12)
  defaultPaymentMethod: 'card',

  // ─── SUPABASE (replace with your project values) ───
  supabase: {
    url:  'https://kqupxpwpoqspqbydrfzx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxdXB4cHdwb3FzcHFieWRyZnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTE1ODYsImV4cCI6MjA5MjI4NzU4Nn0.-1iIUdTPMuLH4w10EmZr3m07NFdc3DhdLGheCeZWez4'
  },

  // ═══════════════════════════════════════════════
  //  IRS SCHEDULE F TAX LINES (2024/2025)
  //  Official line numbers from Form 1040 Schedule F
  // ═══════════════════════════════════════════════
  taxLines: [
    { line: '10',  id: 'car_truck',          label: 'Car and truck expenses' },
    { line: '11',  id: 'chemicals',          label: 'Chemicals' },
    { line: '12',  id: 'conservation',       label: 'Conservation expenses' },
    { line: '13',  id: 'custom_hire',        label: 'Custom hire (machine work)' },
    { line: '14',  id: 'depreciation',       label: 'Depreciation & Section 179' },
    { line: '15',  id: 'employee_benefit',   label: 'Employee benefit programs' },
    { line: '16',  id: 'feed',               label: 'Feed' },
    { line: '17',  id: 'fertilizer_lime',    label: 'Fertilizers and lime' },
    { line: '18',  id: 'freight_trucking',   label: 'Freight and trucking' },
    { line: '19',  id: 'gas_fuel_oil',       label: 'Gasoline, fuel, and oil' },
    { line: '20',  id: 'insurance',          label: 'Insurance (other than health)' },
    { line: '21a', id: 'mortgage_interest',  label: 'Mortgage interest (paid to banks)' },
    { line: '21b', id: 'other_interest',     label: 'Other interest' },
    { line: '22',  id: 'labor_hired',        label: 'Labor hired' },
    { line: '23',  id: 'pension_profit',     label: 'Pension and profit-sharing plans' },
    { line: '24a', id: 'rent_vehicles',      label: 'Rent — vehicles, machinery, equipment' },
    { line: '24b', id: 'rent_land',          label: 'Rent — other (land, animals)' },
    { line: '25',  id: 'repairs',            label: 'Repairs and maintenance' },
    { line: '26',  id: 'seeds_plants',       label: 'Seeds and plants' },
    { line: '27',  id: 'storage',            label: 'Storage and warehousing' },
    { line: '28',  id: 'supplies',           label: 'Supplies' },
    { line: '29',  id: 'taxes',              label: 'Taxes' },
    { line: '30',  id: 'utilities',          label: 'Utilities' },
    { line: '31',  id: 'vet_breeding_med',   label: 'Veterinary, breeding, and medicine' },
    { line: '32a', id: 'other_expense',      label: 'Other expenses (specify)' }
  ],

  // ═══════════════════════════════════════════════
  //  OPERATIONAL CATEGORIES
  //  Grouped by farm function with default tax mapping
  // ═══════════════════════════════════════════════
  operationalCategories: [

    // ─── LIVESTOCK ───
    {
      id: 'feed_nutrition',
      name: 'Feed & Nutrition',
      icon: '🌾',
      color: '#f59e0b',
      defaultTaxLine: 'feed',
      subcategories: [
        'Hay / Forage',
        'Grain / Corn',
        'Mineral Supplements',
        'Salt Blocks',
        'Protein Tubs',
        'Calf Starter / Creep Feed',
        'Custom Feed Mix'
      ]
    },
    {
      id: 'vet_health',
      name: 'Veterinary & Animal Health',
      icon: '🩺',
      color: '#ef4444',
      defaultTaxLine: 'vet_breeding_med',
      subcategories: [
        'Vet Visits / Farm Calls',
        'Vaccinations',
        'Dewormer / Parasite Control',
        'Antibiotics / Medications',
        'Breeding / AI Services',
        'Pregnancy Testing',
        'Castration / Processing',
        'Emergency Vet Care',
        'Health Certificates'
      ]
    },
    {
      id: 'livestock_purchase',
      name: 'Livestock Purchases',
      icon: '🐄',
      color: '#8b5cf6',
      defaultTaxLine: 'other_expense',
      subcategories: [
        'Cattle — Breeding Stock',
        'Cattle — Feeder/Stocker',
        'Cattle — Replacement Heifers',
        'Bulls',
        'Other Livestock',
        'Auction / Sale Barn Fees'
      ]
    },

    // ─── LAND & PASTURE ───
    {
      id: 'pasture_land',
      name: 'Pasture & Land Management',
      icon: '🌿',
      color: '#22c55e',
      defaultTaxLine: 'conservation',
      subcategories: [
        'Fencing — New',
        'Fencing — Repair',
        'Fence Posts / Wire / Supplies',
        'Mowing / Bush Hogging',
        'Pasture Seeding',
        'Lime Application',
        'Land Clearing',
        'Erosion Control',
        'Water System — Troughs',
        'Water System — Ponds',
        'Water System — Wells / Pumps'
      ]
    },
    {
      id: 'fertilizer_soil',
      name: 'Fertilizer & Soil',
      icon: '🧪',
      color: '#14b8a6',
      defaultTaxLine: 'fertilizer_lime',
      subcategories: [
        'Fertilizer — Granular',
        'Fertilizer — Liquid',
        'Lime / Ag Lime',
        'Soil Testing',
        'Soil Amendments',
        'Compost / Manure Spreading'
      ]
    },
    {
      id: 'seeds_plants',
      name: 'Seeds & Plants',
      icon: '🌱',
      color: '#84cc16',
      defaultTaxLine: 'seeds_plants',
      subcategories: [
        'Pasture Seed Mix',
        'Hay Seed',
        'Cover Crop Seed',
        'Garden / Crop Seed',
        'Trees / Shrubs'
      ]
    },
    {
      id: 'chemicals',
      name: 'Chemicals & Herbicides',
      icon: '🧴',
      color: '#f97316',
      defaultTaxLine: 'chemicals',
      subcategories: [
        'Herbicide',
        'Pesticide',
        'Insecticide',
        'Fly Control / Pour-On',
        'Weed Killer — Pasture',
        'Spray Equipment Supplies'
      ]
    },

    // ─── EQUIPMENT & VEHICLES ───
    {
      id: 'equipment_purchase',
      name: 'Equipment Purchases',
      icon: '🚜',
      color: '#6366f1',
      defaultTaxLine: 'depreciation',
      subcategories: [
        'Tractor',
        'Mower / Bush Hog',
        'Hay Equipment (Baler, Tedder, Rake)',
        'Trailer',
        'ATV / UTV',
        'Livestock Equipment (Chute, Panels)',
        'Implements / Attachments',
        'Hand Tools',
        'Small Equipment (< $2,500)'
      ]
    },
    {
      id: 'equipment_repair',
      name: 'Equipment Repairs & Maintenance',
      icon: '🔧',
      color: '#0ea5e9',
      defaultTaxLine: 'repairs',
      subcategories: [
        'Tractor Repair',
        'Mower Repair',
        'Trailer Repair',
        'Hydraulic / Electrical',
        'Welding / Fabrication',
        'Tire Replacement',
        'Parts — General',
        'Service / Maintenance'
      ]
    },
    {
      id: 'fuel_oil',
      name: 'Fuel, Gas & Oil',
      icon: '⛽',
      color: '#eab308',
      defaultTaxLine: 'gas_fuel_oil',
      subcategories: [
        'Diesel — Farm Equipment',
        'Gasoline — Farm Vehicles',
        'Oil / Lubricants',
        'DEF Fluid',
        'Propane / LP Gas',
        'Bulk Fuel Delivery'
      ]
    },
    {
      id: 'vehicle',
      name: 'Farm Vehicles (Car & Truck)',
      icon: '🛻',
      color: '#64748b',
      defaultTaxLine: 'car_truck',
      subcategories: [
        'Truck Payment / Lease',
        'Truck Insurance',
        'Truck Repair / Maintenance',
        'Truck Fuel',
        'Registration / Tags',
        'Tires'
      ]
    },

    // ─── BUILDINGS & INFRASTRUCTURE ───
    {
      id: 'buildings',
      name: 'Buildings & Structures',
      icon: '🏚️',
      color: '#78716c',
      defaultTaxLine: 'repairs',
      subcategories: [
        'Barn Repair',
        'Barn Construction / New',
        'Shed / Lean-To',
        'Roofing',
        'Concrete / Foundation',
        'Electrical — Buildings',
        'Plumbing — Buildings',
        'Painting',
        'Gates / Corral Panels'
      ]
    },

    // ─── OPERATING EXPENSES ───
    {
      id: 'supplies_general',
      name: 'Farm Supplies',
      icon: '📦',
      color: '#a855f7',
      defaultTaxLine: 'supplies',
      subcategories: [
        'Baling Twine / Net Wrap',
        'Ear Tags / Markers',
        'Syringes / Needles',
        'Gloves / Safety Gear',
        'Buckets / Containers',
        'Office Supplies — Farm',
        'Misc Farm Supplies'
      ]
    },
    {
      id: 'insurance',
      name: 'Insurance',
      icon: '🛡️',
      color: '#06b6d4',
      defaultTaxLine: 'insurance',
      subcategories: [
        'Liability Insurance',
        'Property Insurance',
        'Crop Insurance',
        'Livestock Mortality Insurance',
        'Workers Comp',
        'Equipment / Inland Marine'
      ]
    },
    {
      id: 'utilities',
      name: 'Utilities',
      icon: '💡',
      color: '#facc15',
      defaultTaxLine: 'utilities',
      subcategories: [
        'Electric',
        'Water / Irrigation',
        'Phone / Internet — Farm',
        'Trash / Waste Removal',
        'Propane / Heating'
      ]
    },
    {
      id: 'taxes_fees',
      name: 'Taxes & Fees',
      icon: '🏛️',
      color: '#dc2626',
      defaultTaxLine: 'taxes',
      subcategories: [
        'Property Tax — Farm',
        'Sales Tax on Purchases',
        'Farm Use Tax',
        'Ag Exemption Fees',
        'Permit / License Fees',
        'Association / Membership Dues'
      ]
    },
    {
      id: 'labor',
      name: 'Labor & Hired Help',
      icon: '👷',
      color: '#2563eb',
      defaultTaxLine: 'labor_hired',
      subcategories: [
        'Day Labor / Hourly',
        'Contract Labor',
        'Seasonal Help',
        'Payroll — Employees',
        'Payroll Taxes / Withholding'
      ]
    },
    {
      id: 'custom_hire',
      name: 'Custom Hire & Machine Work',
      icon: '⚙️',
      color: '#7c3aed',
      defaultTaxLine: 'custom_hire',
      subcategories: [
        'Custom Haying',
        'Custom Planting',
        'Custom Spraying',
        'Excavation / Dozer Work',
        'Trucking — Livestock Hauling',
        'Fence Building — Contractor'
      ]
    },
    {
      id: 'freight_shipping',
      name: 'Freight & Trucking',
      icon: '🚛',
      color: '#475569',
      defaultTaxLine: 'freight_trucking',
      subcategories: [
        'Hay Delivery',
        'Feed Delivery',
        'Equipment Transport',
        'Livestock Hauling',
        'General Freight / Shipping'
      ]
    },
    {
      id: 'rent_lease',
      name: 'Rent & Leases',
      icon: '📋',
      color: '#0d9488',
      defaultTaxLine: 'rent_land',
      subcategories: [
        'Pasture Lease',
        'Farmland Rent',
        'Equipment Rental',
        'Storage Unit Rental',
        'Livestock Lease'
      ]
    },
    {
      id: 'interest_loans',
      name: 'Interest & Loans',
      icon: '🏦',
      color: '#b91c1c',
      defaultTaxLine: 'other_interest',
      subcategories: [
        'Operating Loan Interest',
        'Equipment Loan Interest',
        'Mortgage Interest — Farm Property',
        'Line of Credit Interest'
      ]
    },
    {
      id: 'storage_warehousing',
      name: 'Storage & Warehousing',
      icon: '🏗️',
      color: '#92400e',
      defaultTaxLine: 'storage',
      subcategories: [
        'Hay Storage',
        'Grain Storage',
        'Cold Storage',
        'Equipment Storage',
        'Warehouse Rental'
      ]
    },

    // ─── PROFESSIONAL / ADMIN ───
    {
      id: 'professional',
      name: 'Professional Services',
      icon: '💼',
      color: '#334155',
      defaultTaxLine: 'other_expense',
      subcategories: [
        'Accountant / CPA',
        'Attorney / Legal',
        'Farm Consultant',
        'Agronomist',
        'Appraiser',
        'Bookkeeping Service'
      ]
    },
    {
      id: 'marketing',
      name: 'Marketing & Sales',
      icon: '📢',
      color: '#e11d48',
      defaultTaxLine: 'other_expense',
      subcategories: [
        'Website / Domain',
        'Advertising',
        'Market Fees / Commission',
        'Photography / Branding',
        'Signs / Banners'
      ]
    },
    {
      id: 'education_travel',
      name: 'Education & Travel',
      icon: '✈️',
      color: '#0284c7',
      defaultTaxLine: 'other_expense',
      subcategories: [
        'Farm Conferences',
        'Training / Workshops',
        'Travel — Farm Business',
        'Meals — Farm Business',
        'Subscriptions / Publications'
      ]
    },
    {
      id: 'miscellaneous',
      name: 'Miscellaneous',
      icon: '📎',
      color: '#9ca3af',
      defaultTaxLine: 'other_expense',
      subcategories: [
        'Bank Fees',
        'Postage / Mailing',
        'Donations — Ag Related',
        'Other / Uncategorized'
      ]
    }
  ],

  // ═══════════════════════════════════════════════
  //  VENDOR KEYWORD → CATEGORY AUTO-MAPPING
  //  Used by categorization.js for suggestions
  // ═══════════════════════════════════════════════
  vendorKeywords: {
    // Feed & Nutrition
    'tractor supply':    { category: 'supplies_general', subHint: 'Misc Farm Supplies' },
    'tsc':               { category: 'supplies_general', subHint: 'Misc Farm Supplies' },
    'southern states':   { category: 'feed_nutrition',   subHint: 'Grain / Corn' },
    'purina':            { category: 'feed_nutrition',   subHint: 'Custom Feed Mix' },
    'nutrena':           { category: 'feed_nutrition',   subHint: 'Custom Feed Mix' },
    'cargill':           { category: 'feed_nutrition',   subHint: 'Custom Feed Mix' },
    'co-op':             { category: 'feed_nutrition',   subHint: 'Grain / Corn' },
    'feed store':        { category: 'feed_nutrition',   subHint: 'Grain / Corn' },
    'hay':               { category: 'feed_nutrition',   subHint: 'Hay / Forage' },
    'mineral':           { category: 'feed_nutrition',   subHint: 'Mineral Supplements' },

    // Vet & Health
    'veterinar':         { category: 'vet_health',       subHint: 'Vet Visits / Farm Calls' },
    'vet clinic':        { category: 'vet_health',       subHint: 'Vet Visits / Farm Calls' },
    'animal hospital':   { category: 'vet_health',       subHint: 'Emergency Vet Care' },
    'valley vet':        { category: 'vet_health',       subHint: 'Antibiotics / Medications' },
    'pbs animal health': { category: 'vet_health',       subHint: 'Vaccinations' },
    'jeffers':           { category: 'vet_health',       subHint: 'Dewormer / Parasite Control' },
    'vaccine':           { category: 'vet_health',       subHint: 'Vaccinations' },
    'dewormer':          { category: 'vet_health',       subHint: 'Dewormer / Parasite Control' },

    // Fuel
    'shell':             { category: 'fuel_oil',         subHint: 'Diesel — Farm Equipment' },
    'exxon':             { category: 'fuel_oil',         subHint: 'Diesel — Farm Equipment' },
    'chevron':           { category: 'fuel_oil',         subHint: 'Diesel — Farm Equipment' },
    'bp ':               { category: 'fuel_oil',         subHint: 'Diesel — Farm Equipment' },
    'marathon':          { category: 'fuel_oil',         subHint: 'Diesel — Farm Equipment' },
    'circle k':          { category: 'fuel_oil',         subHint: 'Gasoline — Farm Vehicles' },
    'wawa':              { category: 'fuel_oil',         subHint: 'Gasoline — Farm Vehicles' },
    'racetrac':          { category: 'fuel_oil',         subHint: 'Gasoline — Farm Vehicles' },
    'buc-ee':            { category: 'fuel_oil',         subHint: 'Diesel — Farm Equipment' },
    'loves':             { category: 'fuel_oil',         subHint: 'Diesel — Farm Equipment' },
    'pilot':             { category: 'fuel_oil',         subHint: 'Diesel — Farm Equipment' },
    'propane':           { category: 'fuel_oil',         subHint: 'Propane / LP Gas' },
    'amerigas':          { category: 'fuel_oil',         subHint: 'Propane / LP Gas' },

    // Equipment & Repair
    'john deere':        { category: 'equipment_repair', subHint: 'Tractor Repair' },
    'kubota':            { category: 'equipment_repair', subHint: 'Tractor Repair' },
    'case ih':           { category: 'equipment_repair', subHint: 'Tractor Repair' },
    'new holland':       { category: 'equipment_repair', subHint: 'Tractor Repair' },
    'napa':              { category: 'equipment_repair', subHint: 'Parts — General' },
    'autozone':          { category: 'equipment_repair', subHint: 'Parts — General' },
    "o'reilly":          { category: 'equipment_repair', subHint: 'Parts — General' },
    'advance auto':      { category: 'equipment_repair', subHint: 'Parts — General' },
    'harbor freight':    { category: 'equipment_purchase', subHint: 'Hand Tools' },
    'northern tool':     { category: 'equipment_purchase', subHint: 'Hand Tools' },

    // Building & Fencing
    'home depot':        { category: 'buildings',        subHint: 'Barn Repair' },
    'lowes':             { category: 'buildings',        subHint: 'Barn Repair' },
    "lowe's":            { category: 'buildings',        subHint: 'Barn Repair' },
    'ace hardware':      { category: 'buildings',        subHint: 'Barn Repair' },
    'fence':             { category: 'pasture_land',     subHint: 'Fencing — Repair' },
    'stay-tuff':         { category: 'pasture_land',     subHint: 'Fence Posts / Wire / Supplies' },
    'red brand':         { category: 'pasture_land',     subHint: 'Fence Posts / Wire / Supplies' },

    // Chemicals & Fertilizer
    'roundup':           { category: 'chemicals',        subHint: 'Herbicide' },
    'herbicide':         { category: 'chemicals',        subHint: 'Herbicide' },
    'pesticide':         { category: 'chemicals',        subHint: 'Pesticide' },
    'fertilizer':        { category: 'fertilizer_soil',  subHint: 'Fertilizer — Granular' },
    'lime':              { category: 'fertilizer_soil',  subHint: 'Lime / Ag Lime' },

    // Insurance
    'state farm':        { category: 'insurance',        subHint: 'Property Insurance' },
    'farm bureau':       { category: 'insurance',        subHint: 'Liability Insurance' },
    'nationwide':        { category: 'insurance',        subHint: 'Property Insurance' },
    'progressive':       { category: 'insurance',        subHint: 'Equipment / Inland Marine' },

    // Utilities
    'fpl':               { category: 'utilities',        subHint: 'Electric' },
    'duke energy':       { category: 'utilities',        subHint: 'Electric' },
    'electric':          { category: 'utilities',        subHint: 'Electric' },
    'at&t':              { category: 'utilities',        subHint: 'Phone / Internet — Farm' },
    'verizon':           { category: 'utilities',        subHint: 'Phone / Internet — Farm' },
    'comcast':           { category: 'utilities',        subHint: 'Phone / Internet — Farm' },
    'spectrum':          { category: 'utilities',        subHint: 'Phone / Internet — Farm' },
    'water':             { category: 'utilities',        subHint: 'Water / Irrigation' },

    // Professional
    'cpa':               { category: 'professional',     subHint: 'Accountant / CPA' },
    'accountant':        { category: 'professional',     subHint: 'Accountant / CPA' },
    'attorney':          { category: 'professional',     subHint: 'Attorney / Legal' },
    'legal':             { category: 'professional',     subHint: 'Attorney / Legal' },

    // Livestock Sales
    'livestock market':  { category: 'livestock_purchase', subHint: 'Auction / Sale Barn Fees' },
    'sale barn':         { category: 'livestock_purchase', subHint: 'Auction / Sale Barn Fees' },
    'auction':           { category: 'livestock_purchase', subHint: 'Auction / Sale Barn Fees' }
  },

  // ═══════════════════════════════════════════════
  //  DESCRIPTION KEYWORD → CATEGORY MAPPING
  //  Fallback for when vendor doesn't match
  // ═══════════════════════════════════════════════
  descriptionKeywords: {
    'hay':               'feed_nutrition',
    'feed':              'feed_nutrition',
    'grain':             'feed_nutrition',
    'corn':              'feed_nutrition',
    'mineral':           'feed_nutrition',
    'salt block':        'feed_nutrition',
    'protein tub':       'feed_nutrition',

    'vaccine':           'vet_health',
    'dewormer':          'vet_health',
    'ivermectin':        'vet_health',
    'antibiotic':        'vet_health',
    'vet ':              'vet_health',
    'pregnancy check':   'vet_health',
    'castrat':           'vet_health',
    'breeding':          'vet_health',

    'diesel':            'fuel_oil',
    'gasoline':          'fuel_oil',
    'fuel':              'fuel_oil',
    'oil change':        'fuel_oil',

    'fence':             'pasture_land',
    'fencing':           'pasture_land',
    't-post':            'pasture_land',
    'barb wire':         'pasture_land',
    'barbwire':          'pasture_land',
    'mowing':            'pasture_land',
    'bush hog':          'pasture_land',
    'trough':            'pasture_land',

    'fertiliz':          'fertilizer_soil',
    'lime':              'fertilizer_soil',
    'soil test':         'fertilizer_soil',

    'seed':              'seeds_plants',
    'clover':            'seeds_plants',
    'bermuda':           'seeds_plants',
    'ryegrass':          'seeds_plants',

    'herbicide':         'chemicals',
    'roundup':           'chemicals',
    'spray':             'chemicals',
    'fly':               'chemicals',
    'pour-on':           'chemicals',

    'tractor':           'equipment_repair',
    'mower':             'equipment_repair',
    'hydraulic':         'equipment_repair',
    'welding':           'equipment_repair',
    'bearing':           'equipment_repair',
    'belt ':             'equipment_repair',
    'tire':              'equipment_repair',

    'insurance':         'insurance',
    'premium':           'insurance',

    'electric':          'utilities',
    'power bill':        'utilities',
    'internet':          'utilities',
    'phone':             'utilities',

    'property tax':      'taxes_fees',
    'tag ':              'taxes_fees',
    'license':           'taxes_fees',
    'permit':            'taxes_fees',

    'hauling':           'freight_shipping',
    'freight':           'freight_shipping',
    'shipping':          'freight_shipping',
    'delivery':          'freight_shipping',

    'rent':              'rent_lease',
    'lease':             'rent_lease',
    'pasture rent':      'rent_lease',

    'barn':              'buildings',
    'roof':              'buildings',
    'concrete':          'buildings',
    'lumber':            'buildings',

    'baling twine':      'supplies_general',
    'net wrap':          'supplies_general',
    'ear tag':           'supplies_general',
    'syringe':           'supplies_general',
    'glove':             'supplies_general',

    'labor':             'labor',
    'hired help':        'labor',
    'day labor':         'labor',
    'payroll':           'labor',

    'custom hay':        'custom_hire',
    'dozer':             'custom_hire',
    'excavat':           'custom_hire',
    'bush hog service':  'custom_hire',

    'interest':          'interest_loans',
    'loan':              'interest_loans',
    'payment ':          'interest_loans',

    'storage':           'storage_warehousing'
  },

  // ═══════════════════════════════════════════════
  //  USER ROLES & PERMISSIONS
  // ═══════════════════════════════════════════════
  roles: {
    owner: {
      label: 'Owner / Admin',
      permissions: ['read', 'write', 'delete', 'manage_users', 'manage_categories', 'reports', 'settings', 'export']
    },
    manager: {
      label: 'Farm Manager',
      permissions: ['read', 'write', 'delete', 'manage_categories', 'reports', 'export']
    },
    worker: {
      label: 'Worker',
      permissions: ['read', 'write']
    },
    accountant: {
      label: 'Accountant',
      permissions: ['read', 'reports', 'export']
    }
  },

  // ═══════════════════════════════════════════════
  //  PAYMENT METHODS
  // ═══════════════════════════════════════════════
  paymentMethods: [
    { id: 'card',     label: 'Debit/Credit Card',      icon: '💳' },
    { id: 'check',    label: 'Check',                   icon: '🧾' },
    { id: 'cash',     label: 'Cash',                    icon: '💵' },
    { id: 'transfer', label: 'Bank Transfer',           icon: '🏦' },
    { id: 'credit',   label: 'Store Credit / Account',  icon: '🏪' }
  ],

  // ═══════════════════════════════════════════════
  //  CHART COLORS
  // ═══════════════════════════════════════════════
  chartColors: [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#e11d48', '#14b8a6', '#6366f1',
    '#84cc16', '#a855f7', '#0ea5e9', '#eab308', '#64748b',
    '#7c3aed', '#dc2626', '#0d9488', '#78716c', '#475569',
    '#b91c1c', '#0284c7', '#92400e', '#334155', '#9ca3af'
  ],

  // ═══════════════════════════════════════════════
  //  HELPER METHODS
  // ═══════════════════════════════════════════════

  /** Get operational category by ID */
  getCategory(id) {
    return this.operationalCategories.find(c => c.id === id) || null;
  },

  /** Get tax line by ID */
  getTaxLine(id) {
    return this.taxLines.find(t => t.id === id) || null;
  },

  /** Get tax line label by category ID (default mapping) */
  getTaxLineForCategory(categoryId) {
    const cat = this.getCategory(categoryId);
    if (!cat) return null;
    return this.getTaxLine(cat.defaultTaxLine);
  },

  /** Get all categories mapped to a specific tax line */
  getCategoriesForTaxLine(taxLineId) {
    return this.operationalCategories.filter(c => c.defaultTaxLine === taxLineId);
  },

  /** Format currency */
  formatCurrency(amount) {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: this.currency
    }).format(amount);
  },

  /** Format date for display */
  formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(this.locale, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  },

  /** Check if user role has a specific permission */
  hasPermission(role, permission) {
    const r = this.roles[role];
    return r ? r.permissions.includes(permission) : false;
  },

  /** Get color for a category (for charts) */
  getCategoryColor(categoryId) {
    const cat = this.getCategory(categoryId);
    return cat ? cat.color : '#9ca3af';
  }
};
