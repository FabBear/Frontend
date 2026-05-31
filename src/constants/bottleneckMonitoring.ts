export const BOTTLENECK_RANK_LIMIT = 10;

export const TOOL_GROUP_TABLE_COLUMNS = [
  { key: 'status', label: '상태', colClass: 'tool-group-table__col-status' },
  { key: 'name', label: 'Tool Group', colClass: 'tool-group-table__col-name' },
  { key: 'utilizationRate', label: '가동률', colClass: 'tool-group-table__col-util' },
  { key: 'wipCount', label: '대기 Lot', colClass: 'tool-group-table__col-wip' },
  { key: 'bottleneckProb', label: '병목 확률', colClass: 'tool-group-table__col-prob' },
  { key: 'setupRatio', label: 'Setup', colClass: 'tool-group-table__col-setup' },
  { key: 'waitRatio', label: 'Wait', colClass: 'tool-group-table__col-wait' },
] as const;

export const TOOL_GROUP_TABLE_COLUMN_COUNT = TOOL_GROUP_TABLE_COLUMNS.length;
