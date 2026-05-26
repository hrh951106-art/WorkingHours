import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTabs() {
  const tabs = await prisma.employeeInfoTab.findMany({
    where: { status: 'ACTIVE' },
    include: {
      groups: {
        where: { status: 'ACTIVE' },
        include: {
          fields: true
        }
      }
    }
  });

  console.log('Active Employee Info Tabs:');
  tabs.forEach(tab => {
    console.log(`\nTab: ${tab.name} (${tab.code})`);
    console.log(`  Groups count: ${tab.groups.length}`);
    
    tab.groups.forEach(group => {
      console.log(`  Group: ${group.name} - Status: ${group.status}`);
      console.log(`    Fields count: ${group.fields.length}`);
      
      const visibleFields = group.fields.filter(f => !f.isHidden);
      console.log(`    Visible fields: ${visibleFields.length}`);
      
      if (visibleFields.length > 0) {
        console.log('    Visible field details:');
        visibleFields.forEach(f => {
          console.log(`      - ${f.fieldName} (${f.fieldCode}) - Type: ${f.fieldType}, IsHidden: ${f.isHidden}`);
        });
      }
    });
  });
}

checkTabs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
