import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user (seller)
  const adminEmail = 'seller@innerlightluxury.com';
  const adminPassword = 'Seller@123';
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let admin;
  if (existingAdmin) {
    console.log('✅ Admin user already exists:', adminEmail);
    admin = existingAdmin;
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Inner Light Luxury Seller',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('✅ Created admin user:', adminEmail);
    console.log('   Password:', adminPassword);
  }

  // Create regular user for testing
  const userEmail = 'customer@example.com';
  const userPassword = 'Customer@123';
  
  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(userPassword, 10);
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        name: 'Test Customer',
        role: 'USER',
        isActive: true,
      },
    });
    console.log('✅ Created customer user:', userEmail);
    console.log('   Password:', userPassword);
  } else {
    console.log('✅ Customer user already exists:', userEmail);
  }

  // Create categories
  const categories = [
    {
      name: 'Sacred Jewelry',
      slug: 'sacred-jewelry',
      description: 'Handcrafted spiritual jewelry with sacred symbols',
    },
    {
      name: 'Meditation Tools',
      slug: 'meditation-tools',
      description: 'Tools to enhance your meditation practice',
    },
    {
      name: 'Spiritual Textiles',
      slug: 'spiritual-textiles',
      description: 'Sacred textiles and fabrics for spiritual practices',
    },
  ];

  for (const cat of categories) {
    const existing = await prisma.category.findUnique({
      where: { slug: cat.slug },
    });

    if (!existing) {
      await prisma.category.create({ data: cat });
      console.log(`✅ Created category: ${cat.name}`);
    } else {
      console.log(`✅ Category already exists: ${cat.name}`);
    }
  }

  // Get category IDs
  const jewelryCategory = await prisma.category.findUnique({
    where: { slug: 'sacred-jewelry' },
  });
  const meditationCategory = await prisma.category.findUnique({
    where: { slug: 'meditation-tools' },
  });
  const textilesCategory = await prisma.category.findUnique({
    where: { slug: 'spiritual-textiles' },
  });

  // Create sample products
  const products = [
    {
      title: 'Om Symbol Silver Pendant',
      slug: 'om-symbol-silver-pendant',
      description: 'Beautiful handcrafted Om symbol pendant in sterling silver. Perfect for meditation and spiritual practice.',
      price: 299900, // ₹2,999
      mrp: 399900, // ₹3,999
      stock: 50,
      lowStockThreshold: 10,
      categoryId: jewelryCategory?.id || '',
      images: ['https://example.com/om-pendant-1.jpg', 'https://example.com/om-pendant-2.jpg'],
      thumbnail: 'https://example.com/om-pendant-thumb.jpg',
      isActive: true,
      isFeatured: true,
    },
    {
      title: 'Tibetan Singing Bowl Set',
      slug: 'tibetan-singing-bowl-set',
      description: 'Authentic Tibetan singing bowl with wooden striker and cushion. Creates beautiful resonant tones for meditation.',
      price: 449900, // ₹4,499
      mrp: 599900, // ₹5,999
      stock: 30,
      lowStockThreshold: 5,
      categoryId: meditationCategory?.id || '',
      images: ['https://example.com/singing-bowl-1.jpg', 'https://example.com/singing-bowl-2.jpg'],
      thumbnail: 'https://example.com/singing-bowl-thumb.jpg',
      isActive: true,
      isFeatured: true,
    },
    {
      title: 'Meditation Cushion - Lotus Design',
      slug: 'meditation-cushion-lotus',
      description: 'Comfortable meditation cushion with beautiful lotus embroidery. Filled with buckwheat hulls for perfect support.',
      price: 199900, // ₹1,999
      mrp: 249900, // ₹2,499
      stock: 100,
      lowStockThreshold: 20,
      categoryId: meditationCategory?.id || '',
      images: ['https://example.com/cushion-1.jpg', 'https://example.com/cushion-2.jpg'],
      thumbnail: 'https://example.com/cushion-thumb.jpg',
      isActive: true,
      isFeatured: false,
    },
    {
      title: 'Sacred Geometry Wall Tapestry',
      slug: 'sacred-geometry-tapestry',
      description: 'Large wall tapestry featuring intricate sacred geometry patterns. Perfect for meditation spaces.',
      price: 349900, // ₹3,499
      mrp: 449900, // ₹4,499
      stock: 25,
      lowStockThreshold: 5,
      categoryId: textilesCategory?.id || '',
      images: ['https://example.com/tapestry-1.jpg', 'https://example.com/tapestry-2.jpg'],
      thumbnail: 'https://example.com/tapestry-thumb.jpg',
      isActive: true,
      isFeatured: true,
    },
    {
      title: 'Crystal Mala Beads - Rose Quartz',
      slug: 'crystal-mala-rose-quartz',
      description: '108 bead mala made with genuine rose quartz crystals. Perfect for japa meditation and prayer.',
      price: 249900, // ₹2,499
      mrp: 329900, // ₹3,299
      stock: 40,
      lowStockThreshold: 10,
      categoryId: jewelryCategory?.id || '',
      images: ['https://example.com/mala-1.jpg', 'https://example.com/mala-2.jpg'],
      thumbnail: 'https://example.com/mala-thumb.jpg',
      isActive: true,
      isFeatured: false,
    },
  ];

  for (const product of products) {
    const existing = await prisma.product.findUnique({
      where: { slug: product.slug },
    });

    if (!existing) {
      await prisma.product.create({ data: product });
      console.log(`✅ Created product: ${product.title}`);
    } else {
      console.log(`✅ Product already exists: ${product.title}`);
    }
  }

  console.log('\n🎉 Database seeding completed!');
  console.log('\n📧 Admin Login Credentials:');
  console.log('   Email:', adminEmail);
  console.log('   Password:', adminPassword);
  console.log('\n📧 Customer Login Credentials:');
  console.log('   Email:', userEmail);
  console.log('   Password:', userPassword);
  console.log('\n🚀 You can now login and start using the application!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
