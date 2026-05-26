#!/usr/bin/env python3
import sys

# 读取原文件
with open('src/modules/allocation/allocation.service.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 读取新方法
with open('executeActualHoursAllocation-new.ts', 'r', encoding='utf-8') as f:
    new_method = f.read()

# 找到要替换的行范围（1851-2035，注意Python索引从0开始）
# 行号1851对应索引1850，行号2035对应索引2034
# 我们要保留1850行之前的内容，插入新方法，然后从2036行开始继续

start_line = 1851  # 要删除的第一行
end_line = 2035    # 要删除的最后一行

# Python索引（从0开始）
start_index = start_line - 1
end_index = end_line  # 不包含

# 构建新内容
new_lines = lines[:start_index] + [new_method + '\n'] + lines[end_index:]

# 写入新文件
with open('src/modules/allocation/allocation.service.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"成功替换第{start_line}行到第{end_line}行")
print(f"原文件行数: {len(lines)}")
print(f"新文件行数: {len(new_lines)}")
