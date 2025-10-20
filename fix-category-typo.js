// fix-category-typo.js - Place in your backend root directory
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCategoryTypo() {
  try {
    console.log('🔍 Checking for category typos...\n');
    
    // Find categories with typos
    const categories = await prisma.category.findMany();
    
    let fixed = 0;
    
    for (const category of categories) {
      // Check for TECHNOLGY typo
      if (category.name === 'TECHNOLGY') {
        console.log(`❌ Found typo: "${category.name}"`);
        console.log(`✅ Fixing to: "TECHNOLOGY"\n`);
        
        await prisma.category.update({
          where: { id: category.id },
          data: { 
            name: 'TECHNOLOGY',
            slug: 'technology',
            displayName: category.displayName || 'Technology'
          }
        });
        
        fixed++;
      }
      
      // Check for any other potential typos (you can add more)
      // Add similar checks for other common typos if needed
    }
    
    if (fixed > 0) {
      console.log(`✅ Successfully fixed ${fixed} category typo(s)!`);
    } else {
      console.log('✅ No typos found. All categories are correct.');
    }
    
    // Show all categories
    console.log('\n📋 Current categories in database:');
    const allCategories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        isActive: true
      }
    });
    
    console.table(allCategories);
    
  } catch (error) {
    console.error('❌ Error fixing category typo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCategoryTypo();