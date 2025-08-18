// /lib/types.ts
export type RuleAST =
  | { type: 'condition'; id: string; params: Record<string, any> }
  | { type: 'AND' | 'OR' | 'NOT'; children: RuleAST[] };
