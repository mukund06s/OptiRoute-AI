import { PrismaClient } from '../backend/node_modules/@prisma/client';

const prisma = new PrismaClient();

// 8 Real Indian Hubs (per PRD Section 5)
const HUBS_SEED = [
  {
    name: 'Delhi Warehouse Central',
    city: 'Delhi',
    state: 'Delhi',
    latitude: 28.6139,
    longitude: 77.209,
    hubType: 'warehouse',
    managerName: 'Rajesh Kumar',
    managerEmail: 'rajesh@optiroute.in',
  },
  {
    name: 'Agra Transit Hub',
    city: 'Agra',
    state: 'Uttar Pradesh',
    latitude: 27.1767,
    longitude: 78.0081,
    hubType: 'transit',
    managerName: 'Priya Singh',
    managerEmail: 'priya@optiroute.in',
  },
  {
    name: 'Gwalior Transit Hub',
    city: 'Gwalior',
    state: 'Madhya Pradesh',
    latitude: 26.2183,
    longitude: 78.1828,
    hubType: 'transit',
    managerName: 'Amit Sharma',
    managerEmail: 'amit@optiroute.in',
  },
  {
    name: 'Jhansi Hub',
    city: 'Jhansi',
    state: 'Uttar Pradesh',
    latitude: 25.4484,
    longitude: 78.5685,
    hubType: 'transit',
    managerName: 'Sunita Verma',
    managerEmail: 'sunita@optiroute.in',
  },
  {
    name: 'Bhopal Central Hub',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    latitude: 23.2599,
    longitude: 77.4126,
    hubType: 'transit',
    managerName: 'Vikram Patel',
    managerEmail: 'vikram@optiroute.in',
  },
  {
    name: 'Jaipur Warehouse',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.9124,
    longitude: 75.7873,
    hubType: 'warehouse',
    managerName: 'Kavita Joshi',
    managerEmail: 'kavita@optiroute.in',
  },
  {
    name: 'Kota Transit Hub',
    city: 'Kota',
    state: 'Rajasthan',
    latitude: 25.2138,
    longitude: 75.8648,
    hubType: 'transit',
    managerName: 'Ravi Meena',
    managerEmail: 'ravi@optiroute.in',
  },
  {
    name: 'Indore Delivery Hub',
    city: 'Indore',
    state: 'Madhya Pradesh',
    latitude: 22.7196,
    longitude: 75.8577,
    hubType: 'delivery',
    managerName: 'Deepak Yadav',
    managerEmail: 'deepak@optiroute.in',
  },
];

// 12 Routes (per PRD Section 5)
const ROUTES_SEED = [
  { origin: 'Delhi', dest: 'Agra', distanceKm: 233, durationMin: 195, road: 'highway' },
  { origin: 'Agra', dest: 'Gwalior', distanceKm: 119, durationMin: 105, road: 'highway' },
  { origin: 'Gwalior', dest: 'Jhansi', distanceKm: 102, durationMin: 90, road: 'highway' },
  { origin: 'Jhansi', dest: 'Bhopal', distanceKm: 308, durationMin: 270, road: 'highway' },
  { origin: 'Bhopal', dest: 'Indore', distanceKm: 195, durationMin: 180, road: 'highway' },
  { origin: 'Delhi', dest: 'Jaipur', distanceKm: 281, durationMin: 240, road: 'highway' },
  { origin: 'Jaipur', dest: 'Kota', distanceKm: 247, durationMin: 210, road: 'highway' },
  { origin: 'Kota', dest: 'Indore', distanceKm: 289, durationMin: 255, road: 'state_road' },
  { origin: 'Agra', dest: 'Jaipur', distanceKm: 238, durationMin: 210, road: 'highway' },
  { origin: 'Gwalior', dest: 'Bhopal', distanceKm: 423, durationMin: 360, road: 'highway' },
  { origin: 'Jaipur', dest: 'Bhopal', distanceKm: 564, durationMin: 480, road: 'state_road' },
  { origin: 'Kota', dest: 'Bhopal', distanceKm: 385, durationMin: 330, road: 'highway' },
];

async function main(): Promise<void> {
  console.log('🌱 Starting seed...');

  // Idempotent: Check if data already exists
  const existingHubsCount = await prisma.hub.count();
  if (existingHubsCount > 0) {
    console.log(`✓ Database already seeded (${existingHubsCount} hubs found). Skipping.`);
    return;
  }

  // Insert hubs
  console.log('📍 Seeding hubs...');
  const createdHubs = await Promise.all(
    HUBS_SEED.map((hub) =>
      prisma.hub.create({
        data: hub,
      })
    )
  );
  console.log(`✓ Created ${createdHubs.length} hubs`);

  // Build hub city → ID map for route insertion
  const hubMap = new Map<string, number>();
  for (const hub of createdHubs) {
    hubMap.set(hub.city, hub.id);
  }

  // Insert routes
  console.log('🛣️  Seeding routes...');
  const createdRoutes = await Promise.all(
    ROUTES_SEED.map((route) => {
      const originHubId = hubMap.get(route.origin);
      const destinationHubId = hubMap.get(route.dest);

      if (!originHubId || !destinationHubId) {
        throw new Error(`Hub not found: ${route.origin} → ${route.dest}`);
      }

      return prisma.route.create({
        data: {
          originHubId,
          destinationHubId,
          baseDistanceKm: route.distanceKm,
          baseDurationMinutes: route.durationMin,
          roadType: route.road,
        },
      });
    })
  );
  console.log(`✓ Created ${createdRoutes.length} routes`);

  console.log('✅ Seed complete!');
}

main()
  .catch((error: unknown) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
