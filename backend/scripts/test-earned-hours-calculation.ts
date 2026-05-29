import { EarnedHoursAllocationService } from '../src/modules/allocation/earned-hours-allocation.service';
import { PrismaService } from '../src/database/prisma.service';

const prisma = new PrismaService();

async function testEarnedHoursCalculation() {
  console.log('=== Testing Earned Hours Calculation ===\n');

  try {
    // Get A003 config
    const config = await prisma.earnedHoursAllocationConfig.findFirst({
      where: { code: 'A003' }
    });

    if (!config) {
      console.log('❌ A003 config not found');
      return;
    }

    console.log('✅ Found A003 config:', config.code, config.name);

    // Get production records
    const productionRecords = await prisma.productionRecord.findMany({
      where: {
        deletedAt: null,
        id: 15  // 使用包含工序信息的生产记录
      },
      take: 1
    });

    if (productionRecords.length === 0) {
      console.log('❌ No production records found');
      return;
    }

    const productionRecord = productionRecords[0];
    console.log('✅ Found production record:', productionRecord.id, 'Product:', productionRecord.productCode, 'Qty:', productionRecord.actualQty);

    // Check work hour results
    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        status: 'ACTIVE',
        workDate: new Date(productionRecord.recordDate)
      }
    });

    console.log('✅ Found', workHourResults.length, 'work hour results for date', new Date(productionRecord.recordDate).toISOString());

    // Create service instance
    const earnedHoursService = new EarnedHoursAllocationService(prisma);

    // Execute calculation
    console.log('\n🔄 Executing earned hours calculation...\n');

    const recordDate = new Date(productionRecord.recordDate);
    const startDate = recordDate.toISOString().split('T')[0];
    const endDate = startDate;

    const result = await earnedHoursService.executeEarnedHoursAllocation({
      configId: config.id,
      startDate,
      endDate,
      executeById: 1,
      executeByName: 'Test User'
    });

    console.log('✅ Calculation completed');
    console.log('Batch No:', result.batchNo);
    console.log('Message:', result.message);
    console.log('Total Results:', result.totalResults);

    if (result.results && result.results.length > 0) {
      console.log('\n📊 Calculation Results:');
      result.results.forEach((detail: any, index: number) => {
        console.log(`  ${index + 1}. Total Earned Hours: ${detail.totalEarnedHours || 'N/A'}`);
        console.log(`     Employees Processed: ${detail.employeeCount || 'N/A'}`);
        console.log(`     Allocations: ${detail.allocationCount || detail.employees?.length || 0}`);
      });
    }

    // Check results in database
    const dbResults = await prisma.earnedHoursAllocationResult.findMany({
      where: { batchNo: result.batchNo }
    });

    console.log('\n📊 Results in database:', dbResults.length);

    if (dbResults.length > 0) {
      console.log('\nFirst few results:');
      dbResults.slice(0, 3).forEach((r: any, i: number) => {
        console.log(`  ${i + 1}. Source Employee: ${r.sourceEmployeeNo || 'N/A'}, Target: ${r.targetEmployeeNo || 'N/A'}, Hours: ${r.allocatedHours}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error during calculation:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testEarnedHoursCalculation();
