  private isAccountMatch(account: any, accountLevels: any[]): boolean {
    // 解析 hierarchyValues，这是一个 JSON 数组，包含所有层级的配置
    const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];

    // 如果未配置账户层级，则所有账户都匹配
    if (accountLevels.length === 0) {
      return true;
    }

    // 找出配置的层级（sortValue转换为level）
    const configLevels = accountLevels.map((sortValue: number) => sortValue + 1);

    // 找出账户中有值的所有层级（包括组织层级和字段层级）
    const filledLevels = hierarchyValues
      .filter((hv: any) => hv.selectedValue)
      .map((hv: any) => hv.level);

    // ✅ 检查1：配置的每个层级是否都有值
    for (const level of configLevels) {
      const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);
      if (!levelConfig || !levelConfig.selectedValue) {
        console.log(`账户不匹配: accountId=${account.id}, 配置的层级level${level}没有值`);
        return false;
      }
    }

    // ✅ 检查2：账户中不能有配置之外的层级有值（有且仅有）
    // 账户中有值的所有层级必须在配置的层级范围内（包括产品、工序等字段层级）
    for (const filledLevel of filledLevels) {
      if (!configLevels.includes(filledLevel)) {
        console.log(`账户不匹配: accountId=${account.id}, 账户有配置之外的层级level${filledLevel}, 配置=${configLevels.join(',')}, 账户所有层级=${filledLevels.join(',')}`);
        return false;
      }
    }

    return true;
  }
