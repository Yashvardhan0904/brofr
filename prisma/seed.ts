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
      name: 'Uncategorized',
      slug: 'uncategorized',
      description: 'Default category for products awaiting classification',
    },
    {
      name: 'Statues',
      slug: 'statues',
      description: 'Beautiful handcrafted statues of deities and spiritual figures',
    },
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
      name: 'Incense & Aromatherapy',
      slug: 'incense-aromatherapy',
      description: 'Premium incense, essential oils and aromatherapy products',
    },
    {
      name: 'Crystals & Gemstones',
      slug: 'crystals-gemstones',
      description: 'Natural healing crystals and precious gemstones',
    },
    {
      name: 'Spiritual Textiles',
      slug: 'spiritual-textiles',
      description: 'Sacred textiles, tapestries and fabrics for spiritual practices',
    },
    {
      name: 'Home Decor',
      slug: 'home-decor',
      description: 'Spiritual and luxury home decoration items',
    },
    {
      name: 'Books & Journals',
      slug: 'books-journals',
      description: 'Spiritual books, guided journals and sacred texts',
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

  // ============================================
  // SEED REVIEWS - Add ratings to products
  // ============================================
  
  // Get all products and users for reviews
  const allProducts = await prisma.product.findMany();
  const customerUser = await prisma.user.findUnique({ where: { email: userEmail } });
  
  // Create additional review users
  const reviewUsers = [];
  const reviewerNames = [
    { name: 'Priya Sharma', email: 'priya.sharma@example.com' },
    { name: 'Arjun Patel', email: 'arjun.patel@example.com' },
    { name: 'Meera Iyer', email: 'meera.iyer@example.com' },
    { name: 'Rohan Gupta', email: 'rohan.gupta@example.com' },
    { name: 'Ananya Reddy', email: 'ananya.reddy@example.com' },
  ];

  for (const reviewer of reviewerNames) {
    let user = await prisma.user.findUnique({ where: { email: reviewer.email } });
    if (!user) {
      const hash = await bcrypt.hash('Reviewer@123', 10);
      user = await prisma.user.create({
        data: {
          email: reviewer.email,
          passwordHash: hash,
          name: reviewer.name,
          role: 'USER',
          isActive: true,
        },
      });
      console.log(`✅ Created reviewer: ${reviewer.name}`);
    }
    reviewUsers.push(user);
  }
  
  if (customerUser) {
    reviewUsers.push(customerUser);
  }

  // Review templates for each product
  const reviewTemplates = [
    { rating: 5, title: 'Absolutely beautiful!', message: 'The craftsmanship is incredible. Every detail is perfect. This is truly a sacred piece that brings peace to my home.' },
    { rating: 5, title: 'Exceeded expectations', message: 'I was amazed by the quality. The description doesn\'t do it justice. A must-have for anyone on a spiritual journey.' },
    { rating: 4, title: 'Very good quality', message: 'Beautiful piece with excellent craftsmanship. Arrived well-packaged. Would highly recommend to others.' },
    { rating: 5, title: 'A divine addition', message: 'This piece has transformed my meditation space. The energy it brings is palpable. Truly blessed to own this.' },
    { rating: 4, title: 'Lovely and authentic', message: 'Genuine quality, you can feel the artisan\'s devotion in every detail. Very happy with my purchase.' },
    { rating: 5, title: 'Perfect gift', message: 'Bought this as a gift and it was received with so much joy. The quality speaks for itself. Will buy again.' },
    { rating: 4, title: 'Wonderful craftsmanship', message: 'The attention to detail is remarkable. A beautiful blend of tradition and elegance.' },
    { rating: 5, title: 'Spiritual and beautiful', message: 'This piece carries such positive energy. My meditation sessions have been deeper since I got this.' },
    { rating: 3, title: 'Good but could be better', message: 'Nice product overall. The quality is decent. Delivery took a while but the product itself is good.' },
    { rating: 5, title: 'Museum quality piece', message: 'I collect spiritual artifacts and this is among the finest I\'ve seen. Pure artistry and devotion.' },
  ];

  let reviewsCreated = 0;
  
  for (const product of allProducts) {
    // Assign 3-5 random reviews per product
    const numReviews = Math.floor(Math.random() * 3) + 3; // 3 to 5 reviews
    const shuffledUsers = [...reviewUsers].sort(() => Math.random() - 0.5);
    const shuffledTemplates = [...reviewTemplates].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(numReviews, shuffledUsers.length); i++) {
      const user = shuffledUsers[i];
      const template = shuffledTemplates[i % shuffledTemplates.length];

      // Check if review already exists
      const existingReview = await prisma.review.findUnique({
        where: {
          userId_productId: {
            userId: user.id,
            productId: product.id,
          },
        },
      });

      if (!existingReview) {
        await prisma.review.create({
          data: {
            rating: template.rating,
            title: template.title,
            message: template.message,
            userId: user.id,
            productId: product.id,
            isVerified: Math.random() > 0.3, // 70% verified
            isHidden: false,
          },
        });
        reviewsCreated++;
      }
    }
  }
  
  console.log(`✅ Created ${reviewsCreated} reviews across ${allProducts.length} products`);

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
