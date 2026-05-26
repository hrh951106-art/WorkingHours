import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkA05Allocation() {
  console.log("=== 检查A05间接工时分摊配置和结果 ===");

  const a05Code = await prisma.calculationAttendanceCode.findFirst({
    where: { code: "A05" }
  });

  if (\!a05Code) {
    console.log("未找到A05出勤代码");
    return;
  }

  console.log("
1. A05出勤代码:");
  console.log("   ID:", a05Code.id);
  console.log("   ���称:", a05Code.name);
  console.log("   类型:", a05Code.type);
  console.log("   计算工时:", a05Code.calculateHours);

  const calcResults = await prisma.calcResult.findMany({
    where: { calculationAttendanceCodeId: a05Code.id },
    orderBy: { calcDate: "desc" },
    take: 10
  });

  console.log("
2. A05工时结果（CalcResult）:", calcResults.length, "条");
  calcResults.forEach((r, i) => {
    const d = r.calcDate.toISOString().split("T")[0];
    const acc = r.accountName ? r.accountName.substring(0, 40) : "N/A";
    console.log("   ", i+1, r.employeeNo, d, r.actualHours + "h", acc);
  });

  const ruleConfigs = await prisma.allocationRuleConfig.findMany({
    where: { deletedAt: null },
    include: { config: true }
  });

  console.log("
3. A05的分摊规则配置:");
  let foundConfig = false;
  for (const rule of ruleConfigs) {
    const codes = JSON.parse(rule.allocationAttendanceCodes || "[]");
    if (codes.includes("A05")) {
      foundConfig = true;
      console.log("   规则ID:", rule.id);
      console.log("   规则名称:", rule.ruleName || "未命名");
      console.log("   配置名称:", rule.config.configName);
      console.log("   规则类型:", rule.ruleType);
      console.log("   分摊依据:", rule.allocationBasis);
      console.log("   出勤代码:", codes.join(", "));
      console.log("   状态:", rule.status);
    }
  }
  if (\!foundConfig) {
    console.log("   没有找到包含A05的分摊规则配置");
  }

  const allocResults = await prisma.allocationResult.findMany({
    where: { attendanceCode: "A05" },
    orderBy: { recordDate: "desc" },
    take: 10
  });

  console.log("
4. A05的分摊结果（AllocationResult）:", allocResults.length, "条");
  allocResults.forEach((r, i) => {
    const d = r.recordDate.toISOString().split("T")[0];
    console.log("   ", i+1, d, r.sourceHours + "h", r.targetName);
  });

  const allResults = await prisma.allocationResult.findMany({
    orderBy: { recordDate: "desc" },
    take: 20
  });

  console.log("
5. 所有分摊结果:", allResults.length, "条");
  if (allResults.length > 0) {
    const d = allResults[0].recordDate.toISOString().split("T")[0];
    const codes = [...new Set(allResults.map(r => r.attendanceCode))];
    console.log("   最新日期:", d);
    console.log("   涉及出勤代码:", codes.join(", "));
  }

  console.log("
=== 检查完成 ===");
}

checkA05Allocation()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
