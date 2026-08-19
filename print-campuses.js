import dotenv from 'dotenv';
dotenv.config();

import prisma from './src/config/prisma.js';

async function main() {
  try {
    console.log('Connecting to database...');
    const campuses = await prisma.campus.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        slug: true,
        subdomain: true,
        isActive: true,
      }
    });
    console.log('\n=== REGISTERED CAMPUSES IN DATABASE ===');
    console.log(JSON.stringify(campuses, null, 2));
    console.log('========================================');
  } catch (error) {
    console.error('Error fetching campuses from database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
